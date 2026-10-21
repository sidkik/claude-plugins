#!/usr/bin/env python3
"""Build immutable SDLC source snapshots and the native skills and agents composed from them."""
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
FENCE_LINE = re.compile(r' {0,3}(`{3,}|~{3,})([^\n]*)')
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


def split_fences(raw, strict=False):
    """[prose, code, prose, ...] by CommonMark fences; the parts always concatenate to `raw`.

    A fence opens at up to three spaces of indent and closes on a line of the same character, at least as
    long, with no info string, so a longer fence can carry a shorter one as content. An unclosed fence runs to
    the end of the document, which is how Markdown renderers read it; `strict` raises instead.
    """
    parts, prose, code, fence = [], [], [], None
    for number, line in enumerate(raw.splitlines(keepends=True), 1):
        found = FENCE_LINE.fullmatch(line.rstrip('\r\n'))
        if fence is None:
            if found and not (found[1][0] == '`' and '`' in found[2]):
                parts.append(''.join(prose))
                prose, code, fence = [], [line], (found[1][0], len(found[1]), number)
            else:
                prose.append(line)
            continue
        code.append(line)
        if found and found[1][0] == fence[0] and len(found[1]) >= fence[1] and not found[2].strip():
            parts.append(''.join(code))
            code, fence = [], None
    if fence is not None:
        if strict:
            raise ValueError(f'unterminated code fence opened at line {fence[2]}')
        parts.append(''.join(code))
        prose = []
    parts.append(''.join(prose))
    return parts


def fenced_blocks(raw):
    return split_fences(raw)[1::2]


def apply_fence_corrections(texts, origins, corrections):
    """Lengthen the fence markers of pinned sources whose nested fences close their container early.

    Only the listed marker lines change, each to a longer run of the same character. The correction names the
    source digest it was written for, so a changed pin needs a new review instead of a silent edit. The
    pinned bundle copy is never altered; this corrects the text a native asset inlines.
    """
    corrected = dict(texts)
    for path, spec in corrections.items():
        if path not in texts:
            raise ValueError(f'fence correction names an unselected source: {path}')
        if origins[path][2] != spec['source_sha256']:
            raise ValueError(f'fence correction does not match the pinned source: {path}')
        lines = texts[path].splitlines(keepends=True)
        for edit in spec['lines']:
            number, was, now = edit['line'], edit['was'], edit['now']
            if not 0 < number <= len(lines) or lines[number - 1].rstrip('\n') != was:
                raise ValueError(f'fence correction line {number} of {path} is not {was!r}')
            before, after = FENCE_LINE.fullmatch(was), FENCE_LINE.fullmatch(now)
            if not (before and after and before[1][0] == after[1][0] and len(after[1]) > len(before[1])
                    and before[2] == after[2] and was[:was.index(before[1])] == now[:now.index(after[1])]):
                raise ValueError(f'fence correction may only lengthen the marker run: {path} line {number}')
            lines[number - 1] = now + lines[number - 1][len(was):]
        corrected[path] = ''.join(lines)
    return corrected


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
                   for index, part in enumerate(split_fences(raw)))


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


HEADING = re.compile(r'^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$', re.M)
WRAPPER_PHRASE = 'This wrapper supplies discovery'


def prose_map(raw, fn):
    return ''.join(part if index % 2 else fn(part) for index, part in enumerate(split_fences(raw)))


def slug(heading):
    heading = re.sub(r'<[^>]+>', '', heading)
    return re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-')


def heading_spans(raw):
    """Headings outside fences as (level, text, base slug, start); duplicates are not renumbered."""
    found = []
    offset = 0
    for index, part in enumerate(split_fences(raw)):
        if not index % 2:
            found += [(len(m[1]), m[2], slug(m[2]), offset + m.start()) for m in HEADING.finditer(part)]
        offset += len(part)
    return found


def section(raw, fragment):
    """The heading whose anchor is `fragment` with its subsections, or None."""
    spans = heading_spans(raw)
    seen = {}
    for position, (level, _, base, start) in enumerate(spans):
        count = seen.get(base, 0)
        seen[base] = count + 1
        if base + (f'-{count}' if count else '') == fragment:
            end = next((s for l, _, _, s in spans[position + 1:] if l <= level), len(raw))
            return raw[start:end].rstrip('\n') + '\n'
    return None


def shift_headings(raw, top):
    """Move headings so the shallowest becomes level `top`; fenced code is untouched."""
    spans = heading_spans(raw)
    if not spans:
        return raw
    delta = top - min(level for level, _, _, _ in spans)
    return prose_map(raw, lambda part: HEADING.sub(
        lambda m: '#' * max(1, min(6, len(m[1]) + delta)) + m[0][len(m[1]):], part))


def fence_around(code, lang):
    longest = max((len(run) for run in re.findall(r'`+', code)), default=0)
    mark = '`' * max(3, longest + 1)
    return f'{mark}{lang}\n{code.rstrip(chr(10))}\n{mark}\n'


def normalized_prose(raw):
    """Prose with link targets blanked, to compare bodies across link relocation."""
    return re.sub(r'\s+', ' ', LINK.sub(lambda m: f'[{m[1]}]()', raw)).strip()


def inline_entries(entries):
    result = []
    for entry in entries:
        entry = {'path': entry} if isinstance(entry, str) else dict(entry)
        entry.setdefault('fragment', None)
        entry.setdefault('as', 'text')
        result.append(entry)
    return result


class Composer:
    """Resolves every local link of one native asset by explicit policy; unknown targets fail."""

    def __init__(self, native, texts, policy, canonical, native_of, adapter, origins, supplements):
        self.native, self.texts, self.canonical, self.native_of = native, texts, canonical, native_of
        self.supplements = supplements
        self.origins = origins
        self.cite = {e['path']: e for e in policy.get('cite', [])}
        self.entries = inline_entries(policy.get('inline', []))
        self.adapter = adapter
        self.invokes, self.agents, self.cited, self.generated = set(), set(), {}, set()
        self.whole = {e['path']: e for e in self.entries if not e['fragment'] and e['as'] == 'text'}
        self.parts = {}
        for entry in self.entries:
            if entry['fragment']:
                self.parts.setdefault(entry['path'], {})[entry['fragment']] = anchors(self.extract(entry))
        self.reject_overlap()

    def reject_overlap(self):
        """One path is inlined once: a whole file, or sections that do not contain one another."""
        for path in {e['path'] for e in self.entries if e['as'] == 'text'}:
            chosen = [e for e in self.entries if e['path'] == path and e['as'] == 'text']
            if len(chosen) > 1 and any(not e['fragment'] for e in chosen):
                raise ValueError(f'overlapping inline of {path} in {self.native}: a whole file and a part of it')
            for first in chosen:
                for second in chosen:
                    if first is not second and first['fragment'] and second['fragment'] and \
                            second['fragment'] in self.parts[path][first['fragment']]:
                        raise ValueError(f"overlapping inline of {path} in {self.native}: #{second['fragment']} is inside #{first['fragment']}")

    def extract(self, entry):
        text = self.texts[entry['path']]
        if entry['path'].endswith('.md') and text.startswith('---\n'):
            text = text[len(frontmatter(text)):].lstrip('\n')
        if entry['fragment']:
            found = section(text, entry['fragment'])
            if found is None:
                raise ValueError(f"inline fragment not found: {entry['path']}#{entry['fragment']}")
            return found
        return text

    def relative(self, target):
        return posixpath.relpath(target, posixpath.dirname(self.native))

    def resolve(self, source, target, fragment):
        suffix = '#' + fragment if fragment else ''
        if target in self.whole:
            if fragment:
                self.generated.add(fragment)
                return '#' + fragment
            return '#' + bundled_id(target)
        if fragment and any(fragment in inside for inside in self.parts.get(target, {}).values()):
            self.generated.add(fragment)
            return '#' + fragment
        if target == 'SOURCE-ADAPTER.md' and self.adapter:
            self.generated.add(ADAPTER_ANCHOR)
            return '#' + ADAPTER_ANCHOR
        if target == self.native or self.native_of.get(target) == self.native:
            return posixpath.basename(self.native) + suffix
        if target in self.native_of:
            native = self.native_of[target]
            (self.agents if native.startswith('agents/') else self.invokes).add(native)
            return self.relative(native) + suffix
        if target in ('SOURCE-ADAPTER.md',) or target.startswith(('skills/', 'claude-skills/', 'agents/')):
            if target.endswith('/SKILL.md'):
                self.invokes.add(target)
            return self.relative(target) + suffix
        if target in self.cite and not fragment:
            self.cited.setdefault(target, set())
            source = self.origins[target][1]
            return source['repository'] + '/blob/' + source['revision'] + '/' + quote(target) + suffix
        if target in self.supplements:
            native = self.supplements[target]
            self.invokes.add(native)
            return self.relative(native) + '#' + (fragment or bundled_id(target))
        if target in self.canonical:
            raise ValueError(f"governing reference left as a read-later pointer in {self.native}: {target}{suffix}; "
                             f"inline the section it directs (or the whole file) under this asset's inline policy")
        raise ValueError(f'unclassified local dependency in {self.native}: {target}; inline it, or list it under canonical_references')

    def rewrite(self, raw, source, local=None):
        def replace(match):
            label, target = match.groups()
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc:
                return match.group(0)
            fragment = parsed.fragment
            if target.startswith('#'):
                if local is None or unquote(fragment) in local:
                    return match.group(0)
                resolved = source
            else:
                resolved = target_path(source, target)
            return f'[{label}]({self.resolve(source, resolved, fragment)})'
        return prose_map(raw, lambda part: LINK.sub(replace, part))


def bundled_id(path):
    return 'bundled-' + re.sub(r'[^a-z0-9]+', '-', path.lower()).strip('-')


def provenance(path, origins, fragment=None):
    key, source, original = origins[path]
    where = path + ('#' + fragment if fragment else '')
    return f"<!-- source: {source['repository']} @ {source['revision']} {where} sha256:{original} -->"


def ordered_unique(items):
    return list(dict.fromkeys(items))


def compose_asset(path, kind, native, texts, origins, policy, native_of, adapter_text, canonical, supplements, maintained=None):
    """Concrete native entry: frontmatter, full source body, required dependencies, adapter contract."""
    adapter_on = policy.get('adapter', True)
    composer = Composer(native, texts, policy, canonical, native_of, adapter_text if adapter_on else None, origins, supplements)
    source_text = maintained if maintained is not None else texts[path]
    front = frontmatter(source_text)
    body = source_text[len(front):].strip('\n')
    link_base = native if maintained is not None else path
    out = [front.rstrip('\n') + '\n']
    out.append(provenance(path, origins) if maintained is None else
               f'<!-- source: maintained in this repository, {path} -->')
    if adapter_on:
        out.append(f'> Source precedence: apply the [source adapter contract](#{ADAPTER_ANCHOR}) at the end of this {kind} for working-repository ownership and source precedence.')
    out.append(composer.rewrite(body, link_base))
    inlined = []
    if composer.entries:
        out.append('## Bundled required dependencies\n\nThe instructions above require the following pinned files. They are included here so this invocation loads them; separately invoked skills are not.')
        for entry in composer.entries:
            raw = composer.extract(entry)
            original = origins[entry['path']][2]
            if entry['as'] == 'code':
                piece = f"### Template: {posixpath.relpath(entry['path'], posixpath.dirname(path))}\n\n" + fence_around(raw, entry.get('lang', ''))
            else:
                piece = shift_headings(composer.rewrite(raw, entry['path'], anchors(raw)), 3)
            anchor = f"<a id=\"{bundled_id(entry['path'])}\"></a>\n" if not entry['fragment'] else ''
            out.append(anchor + provenance(entry['path'], origins, entry['fragment']) + '\n\n' + piece.rstrip('\n'))
            inlined.append({'path': entry['path'], 'fragment': entry['fragment'], 'source_sha256': original,
                            'bytes': len(raw.encode()), **({'reason': entry['reason']} if 'reason' in entry else {})})
    if adapter_on:
        adapter_body = shift_headings(composer.rewrite(adapter_text, 'SOURCE-ADAPTER.md'), 3).strip('\n')
        out.append(f'## Source adapter contract\n\n<!-- source: maintained in this repository, sdlc-process/SOURCE-ADAPTER.md -->\n\n{adapter_body}')
    text = '\n\n'.join(part.strip('\n') if index else part.rstrip('\n') for index, part in enumerate(out)) + '\n'
    # Invariants: nothing is silently dropped or left pointer-only.
    if not text.startswith(front):
        raise ValueError(f'frontmatter not preserved: {native}')
    try:
        split_fences(text, strict=True)
    except ValueError as error:
        raise ValueError(f'{error} in {native}; correct it under composition.fence_corrections') from None
    if normalized_prose(body) not in normalized_prose(text):
        raise ValueError(f'source body not fully loaded: {native}')
    for entry in composer.entries:
        for block in fenced_blocks(composer.extract(entry)):
            if block not in text:
                raise ValueError(f"fenced code not preserved: {entry['path']} in {native}")
    spans = heading_spans(text)
    counts = {}
    for _, _, base, _ in spans:
        counts[base] = counts.get(base, 0) + 1
    for target in composer.generated:
        if counts.get(target, 0) != 1:
            raise ValueError(f'ambiguous in-document link target #{target} in {native}')
    return text, composer, inlined, front


def maintained_texts(selection):
    result = {}
    for source, spec in selection['composition'].get('maintained', {}).items():
        result[source] = (ROOT / source).read_text()
    return result


ADAPTER_ANCHOR = 'apply-packaged-sources-in-the-working-repository'


def compose_native(selection, texts, origins, maintained):
    policy = selection['composition']
    canonical = policy['canonical_references']
    texts = apply_fence_corrections(texts, origins, policy.get('fence_corrections', {}))
    adapter_text = (ROOT / policy['adapter']).read_text()
    adapter_digest = digest(adapter_text.encode())
    native_of = {}
    for path, text in texts.items():
        if path.endswith('/SKILL.md') and path.startswith(('.claude/skills/', '.agents/skills/')):
            folder = 'claude-skills' if re.search(r'^disable-model-invocation: true$', frontmatter(text), re.M) else 'skills'
            native_of[path] = f"{folder}/{path.split('/')[-2]}/SKILL.md"
        elif path.startswith('.claude/agents/') and path.endswith('.md'):
            native_of[path] = 'agents/' + path.split('/')[-1]
    for path in ordered_unique(list(policy['assets']) + list(canonical)):
        if path not in texts and path not in maintained:
            raise ValueError(f'composition names an unselected source: {path}')
    for path, spec in policy['assets'].items():
        if path not in native_of and path not in maintained:
            raise ValueError(f'composition asset is not a native skill or agent: {path}')
        for entry in inline_entries(spec.get('inline', [])):
            if entry['path'] not in texts:
                raise ValueError(f"composition inlines an unselected source: {entry['path']}")
    for path in native_of:
        if not path.endswith('/SKILL.md'):
            continue
        home = posixpath.dirname(path) + '/'
        wanted = {e['path'] for e in inline_entries(policy['assets'].get(path, {}).get('inline', []))}
        loose = sorted(p for p in texts if p.startswith(home) and p != path and p not in wanted)
        if loose:
            raise ValueError(f"skill supplements are not bundled by the composition policy: {path}: {', '.join(loose)}")
    supplements = {}
    for owner, spec in policy['assets'].items():
        if owner in native_of:
            for entry in inline_entries(spec.get('inline', [])):
                if not entry['fragment'] and entry['as'] == 'text' and entry['path'] not in canonical:
                    supplements.setdefault(entry['path'], native_of[owner])
    files, assets = {}, []
    sources = [(path, native_of[path], 'agent' if native_of[path].startswith('agents/') else 'skill', None) for path in sorted(native_of)]
    sources += [(path, spec['output'], 'skill', maintained[path]) for path, spec in sorted(policy.get('maintained', {}).items())]
    for path, native, kind, own in sources:
        spec = policy['assets'].get(path, policy.get('maintained', {}).get(path, {}))
        text, composer, inlined, front = compose_asset(path, kind, native, texts, origins, spec, native_of,
                                                       adapter_text, canonical, supplements, own)
        files[native] = text.encode()
        for item in inlined:
            if item['path'] in policy.get('fence_corrections', {}):
                item['fence_corrected'] = True
        cited = []
        for target, fragments in sorted(composer.cited.items()):
            whole = texts[target]
            carried = sum(e['bytes'] for e in inlined if e['path'] == target)
            cited.append({'path': target, 'url': origins[target][1]['repository'] + '/blob/' + origins[target][1]['revision'] + '/' + target,
                          'file_bytes': len(whole.encode()), 'carried_bytes': carried, 'reason': composer.cite[target]['reason']})
        lines = text.count('\n')
        flags = []
        if lines > policy['max_lines']:
            flags.append(f"{lines} lines exceeds the recommended {policy['max_lines']}-line skill size; nothing was truncated")
        key = origins.get(path)
        assets.append({
            'path': native, 'kind': kind, 'source': path,
            'source_revision': key[1]['revision'] if key else 'maintained in this repository',
            'source_sha256': key[2] if key else digest(own.encode()),
            'frontmatter_sha256': digest(front.encode()),
            'adapter_sha256': adapter_digest if spec.get('adapter', True) else None,
            'bytes': len(files[native]), 'lines': lines, 'sha256': digest(files[native]),
            'inlined': inlined,
            'invokes': sorted(composer.invokes | composer.agents),
            'cited_sources': cited,
            'size_flags': flags})
    report = {'schema_version': 1, 'generator': 'tools/build-process.py', 'policy': 'tools/process-sources.json#composition',
              'adapter': {'path': policy['adapter'], 'sha256': adapter_digest},
              'assets': sorted(assets, key=lambda a: a['path'])}
    return {'files': files, 'report': report}


def summarize(report):
    lines = ['Native composition (explicit policy: tools/process-sources.json#composition)']
    cited = {}
    for asset in report['assets']:
        lines.append(f"  {asset['path']}: {asset['bytes']} bytes, {asset['lines']} lines, {len(asset['inlined'])} bundled")
        for flag in asset['size_flags']:
            lines.append(f"    SIZE: {flag}")
        for ref in asset['cited_sources']:
            cited.setdefault(ref['path'], {'assets': [], 'file_bytes': ref['file_bytes'], 'carried': set()})['assets'].append(asset['path'])
            cited[ref['path']]['carried'].add(ref['carried_bytes'])
    lines.append('Cited sources (identity links to the pinned upstream file; only the bundled governing sections are carried):')
    for path, info in sorted(cited.items()):
        lines.append(f"  {path}: {len(info['assets'])} assets, file {info['file_bytes']} bytes, carried {', '.join(map(str, sorted(info['carried'])))}")
    return '\n'.join(lines)


def outputs(selection, checkouts):
    selected = {path for source in selection['sources'].values() for path in source['files']}
    if len(selected) != sum(len(s['files']) for s in selection['sources'].values()):
        raise ValueError('duplicate source destination')
    historical = set(selection['historical_links'])
    result = {}
    records = []
    texts = {}
    origins = {}
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
            texts[path] = rendered.decode()
            origins[path] = (key, source, digest(original))
    planning = selection['sources']['planning']
    manifest = {'schema_version': 1, 'source_repository': planning['repository'], 'source_revision': planning['revision'],
                'sources': {k: {'repository': v['repository'], 'revision': v['revision']} for k, v in selection['sources'].items()},
                'files': sorted(records, key=lambda r: r['path'])}
    result['bundle/source-manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
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
    result['scripts/setup/source-manifest.json'] = (json.dumps({
        'source': 'tools/setup', 'files': {name: digest(data) for name, data in runtime.items()}
    }, indent=2) + '\n').encode()
    native = compose_native(selection, texts, origins, maintained_texts(selection))
    result.update(native['files'])
    result['native-composition.json'] = (json.dumps(native['report'], indent=2) + '\n').encode()
    validate_links(result)
    return result


def anchors(raw):
    text = ''.join(part for index, part in enumerate(split_fences(raw)) if not index % 2)
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
        prose = ''.join(part for index, part in enumerate(split_fences(raw.decode())) if not index % 2)
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
    owned_files = ('native-composition.json',)
    actual = {str(p.relative_to(destination)) for folder in managed for p in (destination / folder).rglob('*') if p.is_file()}
    actual |= {name for name in owned_files if (destination / name).is_file()}
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
    print(summarize(json.loads(result['native-composition.json'])))
    print(('Verified' if args.check else 'Generated') + f' {len(result)} packaged files')


if __name__ == '__main__':
    main()
