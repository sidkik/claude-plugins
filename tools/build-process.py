#!/usr/bin/env python3
"""Build immutable SDLC source snapshots and native entry wrappers."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import posixpath
import re
import subprocess
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
FENCES = re.compile(r'(^```[^\n]*\n.*?^```[^\n]*$|^~~~[^\n]*\n.*?^~~~[^\n]*$)', re.M | re.S)
LINK = re.compile(r'(?<!!)\[([^\]]+)\]\(([^\s)]+)\)')


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.PIPE)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def source_bytes(source, checkout, path):
    rev = source['revision']
    if not re.fullmatch(r'[0-9a-f]{40}', rev):
        raise ValueError('source revision must be a full immutable commit: ' + rev)
    actual = git(checkout, 'rev-parse', rev + '^{commit}').decode().strip()
    if actual != rev:
        raise ValueError('source revision does not identify its exact commit')
    return git(checkout, 'show', rev + ':' + path)


def target_path(path, target):
    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc or target.startswith('#'):
        return None
    return posixpath.normpath(posixpath.join(posixpath.dirname(path), unquote(parsed.path)))


def relocate_links(raw, path, selected, historical, source):
    def replace(match):
        label, target = match.groups()
        resolved = target_path(path, target)
        if resolved is None or resolved in selected:
            return match.group(0)
        if resolved not in historical:
            raise ValueError(f'unbundled local dependency in {path}: {target} ({resolved})')
        fragment = urlsplit(target).fragment
        url = source['repository'] + '/blob/' + source['revision'] + '/' + quote(resolved)
        if fragment:
            url += '#' + fragment
        return f'[{label}]({url})'
    return ''.join(part if index % 2 else LINK.sub(replace, part)
                   for index, part in enumerate(FENCES.split(raw)))


def snapshot(raw, path, source, captured_at):
    if not path.startswith('docs/work/'):
        return raw
    raw = re.sub(r'^representation: canonical$', 'representation: snapshot', raw, flags=re.M)
    raw = re.sub(r'^canonical: .+$', 'canonical: ' + source['repository'] + '/blob/main/' + path, raw, count=1, flags=re.M)
    marker = '\n---\n'
    end = raw.find(marker, 4)
    if end < 0:
        raise ValueError('managed source requires frontmatter: ' + path)
    return raw[:end] + '\nsource_revision: ' + source['revision'] + '\ncaptured_at: ' + captured_at + raw[end:]


def frontmatter(raw):
    if not raw.startswith('---\n') or '\n---\n' not in raw[4:]:
        raise ValueError('skill requires frontmatter')
    return raw.split('\n---\n', 1)[0] + '\n---\n'


def outputs(selection, checkouts):
    selected = {path for source in selection['sources'].values() for path in source['files']}
    if len(selected) != sum(len(s['files']) for s in selection['sources'].values()):
        raise ValueError('duplicate source destination')
    historical = set(selection['historical_links'])
    result = {}
    records = []
    for key, source in selection['sources'].items():
        checkout = checkouts[key]
        committed = git(checkout, 'show', '-s', '--format=%cI', source['revision']).decode().strip()
        captured = datetime.fromisoformat(committed).astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
        for path in source['files']:
            original = source_bytes(source, checkout, path)
            rendered = original
            if path.endswith('.md'):
                text = original.decode()
                if '/projects/sidkik/ep' in text or '/root/.claude' in text:
                    raise ValueError('machine-specific source requires canonical correction: ' + path)
                text = snapshot(relocate_links(text, path, selected, historical, source), path, source, captured)
                rendered = text.encode()
            result['bundle/' + path] = rendered
            records.append({'path': path, 'source': key, 'source_revision': source['revision'],
                            'source_sha256': digest(original), 'sha256': digest(rendered),
                            'representation': 'unchanged pinned source' if original == rendered else 'snapshot with provenance and pinned historical links'})
            if path.endswith('/SKILL.md'):
                name = path.split('/')[-2]
                # Native wrappers preserve frontmatter/invocation restrictions; policy remains in bundled source.
                body = frontmatter(original.decode()) + '\nRead and follow [the packaged source](../../bundle/' + path + ') in full, and read the references it directs for the current action before performing the flow; report an unavailable required source as a scoped load gap. '
                body += 'Before applying it, read [the source adapter](../../SOURCE-ADAPTER.md) for working-repository ownership and source precedence. '
                body += 'This wrapper supplies discovery; it does not replace the source instructions.\n'
                folder = 'claude-skills' if re.search(r'^disable-model-invocation: true$', original.decode(), re.M) else 'skills'
                result[folder + '/' + name + '/SKILL.md'] = body.encode()
    planning = selection['sources']['planning']
    manifest = {'schema_version': 1, 'source_repository': planning['repository'], 'source_revision': planning['revision'],
                'sources': {k: {'repository': v['repository'], 'revision': v['revision']} for k, v in selection['sources'].items()},
                'files': sorted(records, key=lambda r: r['path'])}
    result['bundle/source-manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    result['agents/sdlc-policy-reviewer.md'] = b'''---
name: sdlc-policy-reviewer
description: Independently assess a named SDLC advancement against its sources and evidence.
---

Read [the source adapter](../SOURCE-ADAPTER.md), then [the actual reviewer brief](../bundle/.claude/agents/sdlc-policy-reviewer.md) and its linked skills in full. Return scoped findings to the accountable session. Keep this assignment read-only unless expressly authorized; do not reassess your own output or delegate this assessment again.
'''
    observer = ROOT / 'tools/observer'
    for source, destination in (
        ('agents/sdlc-observer.md', 'agents/sidkik-sdlc-observer.md'),
        ('agents/sdlc-observed-main.md', 'agents/sidkik-sdlc-observed-main.md'),
        ('skills/sdlc-observer/SKILL.md', 'skills/sdlc-observer/SKILL.md'),
    ):
        result[destination] = (observer / source).read_bytes()
    runtime = {name: (ROOT / 'tools/setup' / name).read_bytes()
               for name in ('agent-setup.mjs', 'setup.mjs', 'status.mjs')}
    for name, data in runtime.items():
        result['scripts/setup/' + name] = data
    result['skills/sdlc-setup/SKILL.md'] = (ROOT / 'tools/setup/SKILL.md').read_bytes()
    result['skills/session-start/SKILL.md'] = (ROOT / 'tools/session-start/SKILL.md').read_bytes()
    result['scripts/setup/source-manifest.json'] = (json.dumps({
        'source': 'tools/setup', 'files': {name: digest(data) for name, data in runtime.items()}
    }, indent=2) + '\n').encode()
    validate_links(result)
    return result


def anchors(raw):
    text = ''.join(part for index, part in enumerate(FENCES.split(raw)) if not index % 2)
    found = set(re.findall(r'<a[^>]+(?:id|name)=["\']([^"\']+)', text))
    seen = {}
    for heading in re.findall(r'^#{1,6}\s+(.+?)\s*#*$', text, re.M):
        heading = re.sub(r'<[^>]+>', '', heading)
        heading = re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-')
        count = seen.get(heading, 0)
        found.add(heading + (f'-{count}' if count else ''))
        seen[heading] = count + 1
    return found


def validate_links(result):
    # Required source files stay local. Generated wrappers may reach the maintained adapter.
    available = set(result) | {'SOURCE-ADAPTER.md'}
    for path, raw in result.items():
        if not path.endswith('.md'):
            continue
        prose = ''.join(part for index, part in enumerate(FENCES.split(raw.decode())) if not index % 2)
        for match in LINK.finditer(prose):
            target = target_path(path, match[2])
            if target is not None and target not in available:
                raise ValueError(f'broken packaged link: {path} -> {match[2]}')
            parsed = urlsplit(match[2])
            local = path if match[2].startswith('#') else target
            if local in result and local.endswith('.md') and parsed.fragment:
                if unquote(parsed.fragment) not in anchors(result[local].decode()):
                    raise ValueError(f'broken packaged fragment: {path} -> {match[2]}')
    # This resource is referenced in code prose rather than a Markdown link.
    if 'bundle/.agents/skills/diagnosing-bugs/scripts/hitl-loop.template.sh' not in result:
        raise ValueError('missing diagnosing-bugs runtime resource')


def write_or_check(result, destination, check):
    managed = ('bundle', 'skills', 'claude-skills', 'agents', 'scripts/setup')
    actual = {str(p.relative_to(destination)) for folder in managed for p in (destination / folder).rglob('*') if p.is_file()}
    extra = actual - set(result)
    differences = sorted(extra | {name for name, data in result.items() if not (destination / name).is_file() or (destination / name).read_bytes() != data})
    if check:
        if differences:
            raise ValueError('generated drift: ' + ', '.join(differences))
        return
    for name in sorted(extra):
        (destination / name).unlink()
    for folder in managed:
        directories = sorted((p for p in (destination / folder).rglob('*') if p.is_dir()), key=lambda p: len(p.parts), reverse=True)
        for directory in directories:
            if not any(directory.iterdir()):
                directory.rmdir()
    for name, data in result.items():
        path = destination / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--planning', required=True, type=Path, help='local Git object store; working tree bytes are never read')
    parser.add_argument('--core', required=True, type=Path, help='Git source of captured Pocock supplements')
    parser.add_argument('--selection', type=Path, default=ROOT / 'tools/process-sources.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'sdlc-process')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        selection = json.loads(args.selection.read_text())
        result = outputs(selection, {'planning': args.planning, 'core': args.core})
        write_or_check(result, args.output, args.check)
    except (ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, str(error) + '\n')
    print(('Verified' if args.check else 'Generated') + f' {len(result)} packaged files')


if __name__ == '__main__':
    main()
