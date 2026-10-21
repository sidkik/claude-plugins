"""Native skills and agents carry their instructions; the composition policy is explicit and checked.

Everything here runs from committed files, without source checkouts.
"""
import importlib.util
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_process', ROOT / 'tools/build-process.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

PLUGIN = ROOT / 'sdlc-process'
BUNDLE = PLUGIN / 'bundle'
SELECTION = json.loads((ROOT / 'tools/process-sources.json').read_text())
REPORT = json.loads((PLUGIN / 'native-composition.json').read_text())
ASSETS = {a['path']: a for a in REPORT['assets']}
# The observed MAIN definition is deliberately empty so Claude keeps its own system prompt.
EMPTY_BY_DESIGN = {'agents/sidkik-sdlc-observed-main.md'}


def plain(text):
    """Compare content across heading shifts and relocated link targets."""
    text = re.sub(r'^#{1,6}[ \t]+', '', text, flags=re.M)
    return build.normalized_prose(text)


def recompute():
    manifest = json.loads((BUNDLE / 'source-manifest.json').read_text())
    texts, origins = {}, {}
    for item in manifest['files']:
        texts[item['path']] = (BUNDLE / item['path']).read_text()
        origins[item['path']] = (item['source'], SELECTION['sources'][item['source']], item['source_sha256'])
    return build.compose_native(SELECTION, texts, origins, build.maintained_texts(SELECTION))


def pinned_assets():
    for item in json.loads((BUNDLE / 'source-manifest.json').read_text())['files']:
        path = item['path']
        if re.fullmatch(r'\.(claude|agents)/skills/[^/]+/SKILL\.md|\.claude/agents/[^/]+\.md', path):
            yield path, (BUNDLE / path).read_text()


def native_text(path):
    return (PLUGIN / ASSETS_BY_SOURCE[path]).read_text()


ASSETS_BY_SOURCE = {a['source']: a['path'] for a in REPORT['assets']}


class CommittedCompositionTests(unittest.TestCase):
    def test_native_files_and_report_match_a_fresh_composition(self):
        fresh = recompute()
        for name, data in fresh['files'].items():
            self.assertEqual((PLUGIN / name).read_bytes(), data, name)
        self.assertEqual(json.loads((PLUGIN / 'native-composition.json').read_text()), fresh['report'])

    def test_every_pinned_skill_and_agent_loads_its_full_body_and_frontmatter(self):
        count = 0
        for path, source in pinned_assets():
            with self.subTest(path=path):
                count += 1
                native = native_text(path)
                front = build.frontmatter(source)
                self.assertTrue(native.startswith(front), 'upstream frontmatter must be preserved byte-for-byte')
                self.assertIn(build.normalized_prose(source[len(front):]), build.normalized_prose(native))
                self.assertNotIn(build.WRAPPER_PHRASE, native)
                self.assertNotIn('Read and follow [the packaged source]', native)
        self.assertEqual(count, 23)

    def test_policy_dependencies_are_loaded_with_fenced_code_intact(self):
        for source_path, asset_policy in SELECTION['composition']['assets'].items():
            native = native_text(source_path)
            for entry in build.inline_entries(asset_policy.get('inline', [])):
                with self.subTest(asset=source_path, dependency=entry['path'], fragment=entry['fragment']):
                    raw = (BUNDLE / entry['path']).read_text()
                    if entry['as'] == 'code':
                        self.assertIn(raw.rstrip('\n'), native)
                        continue
                    if raw.startswith('---\n'):
                        raw = raw[len(build.frontmatter(raw)):]
                    if entry['fragment']:
                        raw = build.section(raw, entry['fragment'])
                        self.assertIsNotNone(raw)
                    self.assertIn(plain(raw), plain(native))
                    for block in build.FENCES.findall(raw):
                        self.assertIn(block, native)

    def test_named_supporting_files_reach_their_skills(self):
        expected = {
            '.agents/skills/triage/SKILL.md': ['# Writing Agent Briefs', 'OUT-OF-SCOPE'],
            '.agents/skills/tdd/SKILL.md': ['When to Mock'],
            '.agents/skills/domain-modeling/SKILL.md': ['ADR Format'],
            '.agents/skills/prototype/SKILL.md': ['Logic Prototype'],
            '.agents/skills/codebase-design/SKILL.md': ['How to deepen a cluster of shallow modules'],
            '.agents/skills/writing-for-agents/SKILL.md': ['Skill mechanics'],
            '.agents/skills/ask-matt/SKILL.md': ['A **phase** is a chunk of work inside a session'],
            '.agents/skills/diagnosing-bugs/SKILL.md': ['#!/usr/bin/env bash', 'Human-in-the-loop reproduction loop'],
        }
        for path, needles in expected.items():
            native = native_text(path)
            for needle in needles:
                with self.subTest(path=path, needle=needle):
                    self.assertIn(needle, native)

    def test_policy_reviewer_agent_is_the_complete_brief(self):
        source = (BUNDLE / '.claude/agents/sdlc-policy-reviewer.md').read_text()
        native = (PLUGIN / 'agents/sdlc-policy-reviewer.md').read_text()
        front = build.frontmatter(source)
        self.assertTrue(native.startswith(front))
        self.assertIn('skills:\n  - sdlc-policy-review\n  - work-artifacts', front)
        self.assertIn(build.normalized_prose(source[len(front):]), build.normalized_prose(native))
        review = (BUNDLE / '.claude/skills/sdlc-policy-review/SKILL.md').read_text()
        self.assertIn(plain(review[len(build.frontmatter(review)):]), plain(native))
        contract = build.section((BUNDLE / SELECTION['composition']['assets']['.claude/agents/sdlc-policy-reviewer.md']['inline'][1]['path']).read_text(),
                                 'policy-agent-checkpoints-across-the-process')
        self.assertIn(plain(contract), plain(native))
        self.assertIn('Return one compact assessment in the existing work issue/PR', native)
        self.assertIn('## Source adapter contract', native)
        self.assertNotRegex(native, r'\]\([^)]*\.claude/(skills|agents)/')
        self.assertNotIn(build.WRAPPER_PHRASE, native)

    def test_adapter_contract_is_concrete_in_every_pinned_native_asset(self):
        adapter = (PLUGIN / 'SOURCE-ADAPTER.md').read_text()
        for path, _ in pinned_assets():
            with self.subTest(path=path):
                self.assertIn(plain(adapter), plain(native_text(path)))
        self.assertIn('Native skills and agents contain their instructions', adapter)

    def test_no_native_asset_is_pointer_only(self):
        found = {str(p.relative_to(PLUGIN)) for folder in ('skills', 'agents') for p in (PLUGIN / folder).rglob('*.md')}
        for name in sorted(found - EMPTY_BY_DESIGN):
            with self.subTest(asset=name):
                text = (PLUGIN / name).read_text()
                body = text[len(build.frontmatter(text)):]
                self.assertGreater(len(body.strip()), 1500, 'body is too short to carry instructions')
                self.assertNotIn(build.WRAPPER_PHRASE, body)
                self.assertNotRegex(body.strip()[:400], r'^Read and follow \[')
        self.assertEqual((PLUGIN / 'agents/sidkik-sdlc-observed-main.md').read_text().split('\n---\n', 1)[1].strip(), '')

    def test_links_resolve_and_every_retained_rule_is_reported(self):
        files = {str(p.relative_to(PLUGIN)): p.read_bytes() for folder in ('bundle', 'skills', 'claude-skills', 'agents')
                 for p in (PLUGIN / folder).rglob('*') if p.is_file()}
        files['native-composition.json'] = (PLUGIN / 'native-composition.json').read_bytes()
        build.validate_links(files)
        for asset in REPORT['assets']:
            prose = ''.join(part for i, part in enumerate(build.FENCES.split((PLUGIN / asset['path']).read_text())) if not i % 2)
            reported = {r['path'] for r in asset['retained_references']}
            seen = set()
            for _, target in build.LINK.findall(prose):
                resolved = build.target_path(asset['path'], target)
                if resolved and resolved.startswith('bundle/'):
                    seen.add(resolved)
            self.assertEqual(seen, reported, asset['path'])

    def test_remaining_mandatory_links_are_reported_not_claimed_covered(self):
        entry = ASSETS['skills/sdlc-process/SKILL.md']
        process = next(r for r in entry['retained_references'] if r['path'].endswith('orchestration.process.md'))
        self.assertGreater(process['fragments']['required-stage-completion'], 20000)
        agent = ASSETS['agents/sdlc-policy-reviewer.md']
        self.assertTrue(any(r['path'].endswith('orchestration.process.md') for r in agent['retained_references']))
        self.assertIn('skills/work-artifacts/SKILL.md', agent['invokes'])
        # The checkpoint contract is bundled into review, so it is no longer a retained link there.
        self.assertFalse(any(r['path'].endswith('governed-context.spec.md') for r in agent['retained_references']))

    def test_size_flags_report_without_truncating(self):
        limit = SELECTION['composition']['max_lines']
        for asset in REPORT['assets']:
            self.assertEqual(bool(asset['size_flags']), asset['lines'] > limit, asset['path'])
        self.assertTrue(ASSETS['skills/triage/SKILL.md']['size_flags'])
        total = sum(e['bytes'] for e in ASSETS['skills/triage/SKILL.md']['inlined'])
        self.assertGreater(total, 10000)

    def test_user_only_routing_and_invocation_permissions_follow_frontmatter(self):
        for path, source in pinned_assets():
            restricted = bool(re.search(r'^disable-model-invocation: true$', build.frontmatter(source), re.M))
            if path.endswith('/SKILL.md'):
                self.assertEqual(ASSETS_BY_SOURCE[path].startswith('claude-skills/'), restricted, path)


def fake(front='name: x\ndescription: d\n', body='# X\n\nBody.\n'):
    return f'---\n{front}---\n\n{body}'


class CompositionPolicyTests(unittest.TestCase):
    SOURCE = {'repository': 'https://example.invalid/r', 'revision': 'a' * 40}

    def compose(self, texts, assets, canonical=None, **extra):
        origins = {path: ('planning', self.SOURCE, build.digest(text.encode())) for path, text in texts.items()}
        selection = {'composition': {'adapter': 'sdlc-process/SOURCE-ADAPTER.md', 'max_lines': 500,
                                     'canonical_references': canonical or {}, 'assets': assets, **extra}}
        return build.compose_native(selection, texts, origins, {})

    def test_dependency_link_becomes_in_document_anchor_and_fences_survive(self):
        skill = '.agents/skills/a/SKILL.md'
        dep = '.agents/skills/a/DEP.md'
        texts = {skill: fake(body='# A\n\nSee [the brief](DEP.md) and [by name](DEP.md#sub).\n'),
                 dep: '# Dep\n\n## Sub\n\n```md\n# not a heading\n[x](nowhere.md)\n```\n'}
        result = self.compose(texts, {skill: {'inline': [dep]}})
        native = result['files']['skills/a/SKILL.md'].decode()
        self.assertIn('[the brief](#bundled-agents-skills-a-dep-md)', native)
        self.assertIn('[by name](#sub)', native)
        self.assertIn('<a id="bundled-agents-skills-a-dep-md"></a>', native)
        self.assertIn('### Dep\n', native)
        self.assertIn('#### Sub\n', native)
        self.assertIn('```md\n# not a heading\n[x](nowhere.md)\n```', native)
        self.assertEqual(result['report']['assets'][0]['inlined'][0]['path'], dep)

    def test_skill_links_are_native_and_canonical_links_keep_fragments(self):
        skill, other = '.agents/skills/a/SKILL.md', '.claude/skills/b/SKILL.md'
        doc = 'docs/process.md'
        texts = {skill: fake(body='# A\n\n[b](../../../.claude/skills/b/SKILL.md#go) [p](../../../docs/process.md#part)\n'),
                 other: fake(body='# B\n\n## Go\n'), doc: '# P\n\n## Part\n' + 'x' * 50}
        result = self.compose(texts, {}, canonical={doc: 'canonical'})
        native = result['files']['skills/a/SKILL.md'].decode()
        self.assertIn('[b](../b/SKILL.md#go)', native)
        self.assertIn('[p](../../bundle/docs/process.md#part)', native)
        asset = next(a for a in result['report']['assets'] if a['path'] == 'skills/a/SKILL.md')
        self.assertIn('skills/b/SKILL.md', asset['invokes'])
        self.assertEqual(asset['retained_references'][0]['path'], 'bundle/docs/process.md')
        self.assertGreater(asset['retained_references'][0]['fragments']['part'], 0)

    def test_unclassified_local_dependency_fails_the_build(self):
        skill = '.agents/skills/a/SKILL.md'
        texts = {skill: fake(body='# A\n\n[hidden](../../../docs/EXTRA.md)\n'), 'docs/EXTRA.md': '# Extra\n'}
        with self.assertRaisesRegex(ValueError, 'unclassified local dependency'):
            self.compose(texts, {})

    def test_missing_dependency_or_fragment_fails_instead_of_dropping_content(self):
        skill = '.agents/skills/a/SKILL.md'
        texts = {skill: fake(), '.agents/skills/a/DEP.md': '# Dep\n'}
        with self.assertRaisesRegex(ValueError, 'unselected source'):
            self.compose(texts, {skill: {'inline': ['.agents/skills/a/NOPE.md']}})
        with self.assertRaisesRegex(ValueError, 'fragment not found'):
            self.compose(texts, {skill: {'inline': [{'path': '.agents/skills/a/DEP.md', 'fragment': 'absent'}]}})
        with self.assertRaisesRegex(ValueError, 'not a native skill or agent'):
            self.compose(texts, {'.agents/skills/a/DEP.md': {}})

    def test_section_inline_retargets_links_that_leave_the_section(self):
        skill, doc = '.agents/skills/a/SKILL.md', 'docs/spec.md'
        texts = {skill: fake(body='# A\n\nSee [the contract](../../../docs/spec.md#contract).\n'),
                 doc: '# Spec\n\n## Contract\n\nRule, see [controls](#controls).\n\n## Controls\n\nMore.\n'}
        result = self.compose(texts, {skill: {'inline': [{'path': doc, 'fragment': 'contract'}]}}, canonical={doc: 'spec'})
        native = result['files']['skills/a/SKILL.md'].decode()
        self.assertIn('[the contract](#contract)', native)
        self.assertIn('[controls](../../bundle/docs/spec.md#controls)', native)
        self.assertNotIn('More.', native)
        asset = result['report']['assets'][0]
        self.assertEqual(list(asset['retained_references'][0]['fragments']), ['controls'])

    def test_unlisted_skill_supplement_fails_instead_of_being_dropped(self):
        skill = '.agents/skills/a/SKILL.md'
        texts = {skill: fake(), '.agents/skills/a/NEW.md': '# New\n', '.agents/skills/a/scripts/x.sh': 'echo\n'}
        with self.assertRaisesRegex(ValueError, 'not bundled by the composition policy.*NEW.md.*x.sh'):
            self.compose(texts, {})
        self.compose(texts, {skill: {'inline': ['.agents/skills/a/NEW.md', {'path': '.agents/skills/a/scripts/x.sh', 'as': 'code'}]}})

    def test_ambiguous_in_document_target_is_rejected(self):
        skill, doc = '.agents/skills/a/SKILL.md', 'docs/spec.md'
        texts = {skill: fake(body='# A\n\n## Contract\n\nSee [c](../../../docs/spec.md#contract).\n'),
                 doc: '# Spec\n\n## Contract\n\nText.\n'}
        with self.assertRaisesRegex(ValueError, 'ambiguous in-document link target'):
            self.compose(texts, {skill: {'inline': [{'path': doc, 'fragment': 'contract'}]}}, canonical={doc: 'spec'})

    def test_frontmatter_routing_adapter_and_size_flags(self):
        user_only = '.agents/skills/u/SKILL.md'
        long = '# U\n\n' + 'line\n' * 600
        texts = {user_only: fake('name: u\ndescription: d\ndisable-model-invocation: true\n', long)}
        result = self.compose(texts, {})
        native = result['files']['claude-skills/u/SKILL.md'].decode()
        self.assertTrue(native.startswith('---\nname: u\ndescription: d\ndisable-model-invocation: true\n---\n'))
        self.assertIn('## Source adapter contract', native)
        asset = result['report']['assets'][0]
        self.assertTrue(asset['size_flags'])
        self.assertGreater(native.count('line\n'), 599)

    def test_code_dependency_uses_a_fence_longer_than_its_content(self):
        skill, script = '.agents/skills/a/SKILL.md', '.agents/skills/a/scripts/run.sh'
        texts = {skill: fake(), script: '#!/bin/sh\necho "```"\n'}
        native = self.compose(texts, {skill: {'inline': [{'path': script, 'as': 'code', 'lang': 'sh'}]}})['files']['skills/a/SKILL.md'].decode()
        self.assertIn('````sh\n#!/bin/sh\necho "```"\n````', native)
        self.assertIn('### Template: scripts/run.sh', native)


if __name__ == '__main__':
    unittest.main()
