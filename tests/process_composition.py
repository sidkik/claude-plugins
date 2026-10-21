"""Native skills and agents carry their instructions; the composition policy is explicit and checked.

Everything here runs from committed files, without source checkouts.
"""
import importlib.util
import json
import re
import unittest
from pathlib import Path

try:
    from markdown_it import MarkdownIt
except ImportError:  # the independent Markdown checks need a CommonMark parser that is not the generator's
    MarkdownIt = None

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


def pinned_text(path):
    """The bundle text of a source as the generator inlines it: pinned bytes plus declared fence corrections."""
    manifest = {item['path']: item for item in json.loads((BUNDLE / 'source-manifest.json').read_text())['files']}
    origins = {path: ('planning', SELECTION['sources']['planning'], manifest[path]['source_sha256'])}
    corrections = {k: v for k, v in SELECTION['composition'].get('fence_corrections', {}).items() if k == path}
    return build.apply_fence_corrections({path: (BUNDLE / path).read_text()}, origins, corrections)[path]


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
                    raw = pinned_text(entry['path'])
                    if entry['as'] == 'code':
                        self.assertIn(raw.rstrip('\n'), native)
                        continue
                    if raw.startswith('---\n'):
                        raw = raw[len(build.frontmatter(raw)):]
                    if entry['fragment']:
                        raw = build.section(raw, entry['fragment'])
                        self.assertIsNotNone(raw)
                    self.assertIn(plain(raw), plain(native))
                    for block in build.fenced_blocks(raw):
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
        spec = 'docs/work/agent-orchestration/workstreams/context/governed-context.spec.md'
        contract = build.section((BUNDLE / spec).read_text(), 'policy-agent-checkpoints-across-the-process')
        self.assertIn(plain(contract), plain(native))
        process = (BUNDLE / 'docs/work/agent-orchestration/process/orchestration.process.md').read_text()
        self.assertIn(plain(process[len(build.frontmatter(process)):]), plain(native))
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

    def test_links_resolve_and_no_asset_points_to_a_governing_document(self):
        files = {str(p.relative_to(PLUGIN)): p.read_bytes() for folder in ('bundle', 'skills', 'claude-skills', 'agents')
                 for p in (PLUGIN / folder).rglob('*') if p.is_file()}
        files['native-composition.json'] = (PLUGIN / 'native-composition.json').read_bytes()
        build.validate_links(files)
        for asset in REPORT['assets']:
            text = (PLUGIN / asset['path']).read_text()
            prose = ''.join(build.split_fences(text)[::2])
            for _, target in build.LINK.findall(prose):
                resolved = build.target_path(asset['path'], target)
                self.assertFalse(resolved and resolved.startswith('bundle/'),
                                 f"{asset['path']} leaves a governing document as a read-later link: {target}")
            self.assertNotIn('retained_references', asset)
            for cited in asset['cited_sources']:
                self.assertIn(cited['url'], text)
                self.assertLess(cited['carried_bytes'], cited['file_bytes'])
                self.assertGreater(cited['carried_bytes'], 0)

    def test_governing_sections_are_delivered_inside_the_asset(self):
        def body(path):
            text = (BUNDLE / path).read_text()
            return text[len(build.frontmatter(text)):] if text.startswith('---\n') else text

        def part(path, fragment):
            return build.section(body(path), fragment)

        process, tracker, records, planning, spec = (
            'docs/work/agent-orchestration/process/orchestration.process.md', 'docs/agents/issue-tracker.md',
            'docs/agents/sdlc/records.md', 'docs/work/agent-orchestration/process/planning-repository.process.md',
            'docs/work/agent-orchestration/workstreams/context/governed-context.spec.md')
        checkpoint, handoffs = 'policy-agent-checkpoints-across-the-process', 'workflow-handoffs-producers-durable-records-and-recipients'
        every = [(path, None) for path in (process, tracker, records, planning)] + [(spec, checkpoint), (spec, handoffs), (spec, 'readiness-controls')]
        expected = {
            'skills/sdlc-process/SKILL.md': every, 'skills/sdlc-policy-review/SKILL.md': every, 'agents/sdlc-policy-reviewer.md': every,
            'skills/orchestrator/SKILL.md': [(process, 'converge-reviews-decisions-and-publication'),
                                             (process, 'local-runtime-environments-select-own-validate-and-clean-up'),
                                             (records, 'retain-local-environment-custody'), (records, 'finish-triage-and-clean-up-the-workspace'),
                                             (planning, 'publish-a-reviewable-checkpoint'), (spec, checkpoint)],
            'skills/work-artifacts/SKILL.md': [(planning, None), (process, 'converge-reviews-decisions-and-publication'), (spec, checkpoint)],
        }
        for native, needed in expected.items():
            text = plain((PLUGIN / native).read_text())
            for path, fragment in needed:
                with self.subTest(asset=native, source=path, fragment=fragment):
                    wanted = part(path, fragment) if fragment else body(path)
                    self.assertIsNotNone(wanted)
                    self.assertIn(plain(wanted), text)
        entry = ASSETS['skills/sdlc-process/SKILL.md']
        self.assertGreater(sum(e['bytes'] for e in entry['inlined']), 100000)
        agent = ASSETS['agents/sdlc-policy-reviewer.md']
        self.assertIn('skills/work-artifacts/SKILL.md', agent['invokes'])
        self.assertFalse(any('retained' in key for item in REPORT['assets'] for key in item))
        # Only the identity of the governed-context proposal is cited; its governing sections are carried.
        for native in ('skills/sdlc-process/SKILL.md', 'skills/sdlc-policy-review/SKILL.md', 'agents/sdlc-policy-reviewer.md'):
            cited = ASSETS[native]['cited_sources']
            self.assertEqual([c['path'] for c in cited], [spec])
            self.assertEqual(cited[0]['file_bytes'], len((BUNDLE / spec).read_bytes()))

    def test_leaving_any_governing_section_as_a_pointer_fails_the_build(self):
        canonical = set(SELECTION['composition']['canonical_references'])
        tried = 0
        for asset, asset_policy in SELECTION['composition']['assets'].items():
            for index, entry in enumerate(asset_policy.get('inline', [])):
                if build.inline_entries([entry])[0]['path'] not in canonical:
                    continue
                tried += 1
                with self.subTest(asset=asset, removed=entry):
                    selection = json.loads(json.dumps(SELECTION))
                    del selection['composition']['assets'][asset]['inline'][index]
                    manifest = json.loads((BUNDLE / 'source-manifest.json').read_text())
                    texts = {i['path']: (BUNDLE / i['path']).read_text() for i in manifest['files']}
                    origins = {i['path']: (i['source'], SELECTION['sources'][i['source']], i['source_sha256']) for i in manifest['files']}
                    with self.assertRaisesRegex(ValueError, 'read-later pointer'):
                        build.compose_native(selection, texts, origins, build.maintained_texts(selection))
        self.assertGreaterEqual(tried, 25)

    def test_every_canonical_reference_is_governing_and_inlined_somewhere(self):
        canonical = SELECTION['composition']['canonical_references']
        carried = {i['path'] for a in REPORT['assets'] for i in a['inlined']}
        self.assertEqual(carried & set(canonical), set(canonical))
        for reason in canonical.values():
            self.assertNotRegex(reason, r'retained|not inlined|optional|read later')

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

    def test_skill_links_stay_native_and_a_governing_link_must_be_inlined(self):
        skill, other = '.agents/skills/a/SKILL.md', '.claude/skills/b/SKILL.md'
        doc = 'docs/process.md'
        texts = {skill: fake(body='# A\n\n[b](../../../.claude/skills/b/SKILL.md#go) [p](../../../docs/process.md#part)\n'),
                 other: fake(body='# B\n\n## Go\n'), doc: '# P\n\n## Part\n' + 'x' * 50}
        with self.assertRaisesRegex(ValueError, 'governing reference left as a read-later pointer.*docs/process.md#part'):
            self.compose(texts, {}, canonical={doc: 'canonical'})
        result = self.compose(texts, {skill: {'inline': [{'path': doc, 'fragment': 'part', 'reason': 'directed'}]}}, canonical={doc: 'canonical'})
        native = result['files']['skills/a/SKILL.md'].decode()
        self.assertIn('[b](../b/SKILL.md#go)', native)
        self.assertIn('[p](#part)', native)
        asset = next(a for a in result['report']['assets'] if a['path'] == 'skills/a/SKILL.md')
        self.assertIn('skills/b/SKILL.md', asset['invokes'])
        self.assertEqual(asset['cited_sources'], [])
        self.assertEqual(asset['inlined'][0]['fragment'], 'part')

    def test_whole_file_inline_resolves_every_section_link_into_the_document(self):
        skill, doc = '.agents/skills/a/SKILL.md', 'docs/process.md'
        texts = {skill: fake(body='# A\n\nRead [the process](../../../docs/process.md) and [part](../../../docs/process.md#part).\n'),
                 doc: '# P\n\n## Part\n\nBody.\n'}
        native = self.compose(texts, {skill: {'inline': [doc]}}, canonical={doc: 'governing'})['files']['skills/a/SKILL.md'].decode()
        self.assertIn('[the process](#bundled-docs-process-md)', native)
        self.assertIn('[part](#part)', native)
        self.assertNotIn('bundle/', native)

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

    def test_a_link_leaving_an_inlined_section_must_itself_be_carried(self):
        skill, doc = '.agents/skills/a/SKILL.md', 'docs/spec.md'
        texts = {skill: fake(body='# A\n\nSee [the contract](../../../docs/spec.md#contract).\n'),
                 doc: '# Spec\n\n## Contract\n\nRule, see [controls](#controls).\n\n## Controls\n\nMore.\n'}
        with self.assertRaisesRegex(ValueError, 'read-later pointer.*docs/spec.md#controls'):
            self.compose(texts, {skill: {'inline': [{'path': doc, 'fragment': 'contract'}]}}, canonical={doc: 'spec'})
        native = self.compose(texts, {skill: {'inline': [{'path': doc, 'fragment': 'contract'}, {'path': doc, 'fragment': 'controls'}]}},
                              canonical={doc: 'spec'})['files']['skills/a/SKILL.md'].decode()
        self.assertIn('[the contract](#contract)', native)
        self.assertIn('[controls](#controls)', native)
        self.assertIn('More.', native)

    def test_overlapping_inlines_of_one_file_are_rejected(self):
        skill, doc = '.agents/skills/a/SKILL.md', 'docs/spec.md'
        texts = {skill: fake(), doc: '# Spec\n\n## Outer\n\n### Inner\n\nText.\n'}
        for inline in ([doc, {'path': doc, 'fragment': 'inner'}],
                       [{'path': doc, 'fragment': 'outer'}, {'path': doc, 'fragment': 'inner'}]):
            with self.assertRaisesRegex(ValueError, 'overlapping inline'):
                self.compose(texts, {skill: {'inline': inline}}, canonical={doc: 'spec'})

    def test_cited_identity_link_resolves_to_the_pinned_upstream_and_never_for_a_section(self):
        skill, doc = '.agents/skills/a/SKILL.md', 'docs/spec.md'
        texts = {skill: fake(body='# A\n\n[owner](../../../docs/spec.md) and [rule](../../../docs/spec.md#rule)\n'),
                 doc: '# Spec\n\n## Rule\n\nText.\n\n## Rationale\n\nMore.\n'}
        with self.assertRaisesRegex(ValueError, 'read-later pointer.*docs/spec.md#rule'):
            self.compose(texts, {skill: {'cite': [{'path': doc, 'reason': 'identity'}]}}, canonical={doc: 'spec'})
        result = self.compose(texts, {skill: {'cite': [{'path': doc, 'reason': 'identity'}],
                                              'inline': [{'path': doc, 'fragment': 'rule', 'reason': 'directed'}]}}, canonical={doc: 'spec'})
        native = result['files']['skills/a/SKILL.md'].decode()
        self.assertIn('[owner](https://example.invalid/r/blob/' + 'a' * 40 + '/docs/spec.md)', native)
        self.assertIn('[rule](#rule)', native)
        cited = result['report']['assets'][0]['cited_sources'][0]
        self.assertGreater(cited['file_bytes'], cited['carried_bytes'])

    def test_supplement_links_resolve_to_the_owning_skill_not_to_a_governing_document(self):
        skill, owner, supplement = '.agents/skills/a/SKILL.md', '.agents/skills/b/SKILL.md', '.agents/skills/b/BRIEF.md'
        texts = {skill: fake(body='# A\n\nSee [brief](../b/BRIEF.md#shape).\n'), owner: fake(body='# B\n'), supplement: '# Brief\n\n## Shape\n'}
        result = self.compose(texts, {owner: {'inline': [supplement]}})
        native = result['files']['skills/a/SKILL.md'].decode()
        self.assertIn('[brief](../b/SKILL.md#shape)', native)
        self.assertIn('skills/b/SKILL.md', next(a for a in result['report']['assets'] if a['path'] == 'skills/a/SKILL.md')['invokes'])

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


def parse(text):
    return MarkdownIt('commonmark').parse(text)


def unterminated(text):
    """Opening line numbers of fences that reach the end of the document without a closing line."""
    lines = text.split('\n')
    return [token.map[0] + 1 for token in parse(text)
            if token.type == 'fence' and not (token.map[1] - 1 > token.map[0] and lines[token.map[1] - 1].lstrip().startswith(token.markup))]


def rendered_headings(text):
    """(level, text) of every heading a CommonMark renderer produces, so headings inside code do not count."""
    tokens, found = parse(text), []
    for index, token in enumerate(tokens):
        if token.type == 'heading_open':
            inline = tokens[index + 1]
            found.append((int(token.tag[1:]), ''.join(c.content for c in inline.children if c.type in ('text', 'code_inline'))))
    return found


def rendered_anchors(text):
    seen, anchors = {}, set()
    for _, heading in rendered_headings(text):
        base = re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-')
        anchors.add(base + (f'-{seen[base]}' if base in seen else ''))
        seen[base] = seen.get(base, 0) + 1
    for token in parse(text):
        for html in [token.content] + [c.content for c in token.children or [] if c.type == 'html_inline']:
            if token.type in ('html_block', 'inline'):
                anchors |= set(re.findall(r'<a[^>]+id="([^"]+)"', html))
    return anchors


def rendered_fragment_links(text):
    return [child.attrs['href'][1:] for token in parse(text) if token.type == 'inline'
            for child in token.children or [] if child.type == 'link_open' and child.attrs['href'].startswith('#')]


class FenceSplitTests(unittest.TestCase):
    def test_parts_alternate_prose_and_code_and_rejoin_to_the_input(self):
        for raw in ('a\n```\nx\n```\nb\n', '```\nopen\n', 'no fences\n', '~~~\n```\n~~~\nz', '   ```js\nx\n   ```\n'):
            self.assertEqual(''.join(build.split_fences(raw)), raw)
            self.assertEqual(len(build.split_fences(raw)) % 2, 1)

    def test_a_longer_fence_holds_a_shorter_fence_as_content(self):
        parts = build.split_fences('p\n````markdown\n```ts\ncode\n```\n````\nq\n')
        self.assertEqual(parts, ['p\n', '````markdown\n```ts\ncode\n```\n````\n', 'q\n'])

    def test_closer_needs_same_character_enough_length_and_no_info_string(self):
        self.assertEqual(build.split_fences('```\n```ts\n~~~\n``\n```\nafter\n')[1], '```\n```ts\n~~~\n``\n```\n')
        self.assertEqual(build.split_fences('````\n```\nstill\n````\n')[1], '````\n```\nstill\n````\n')

    def test_unterminated_fence_runs_to_the_end_and_strict_mode_fails_closed(self):
        raw = 'prose\n```\n## Not a heading\n'
        self.assertEqual(build.split_fences(raw), ['prose\n', '```\n## Not a heading\n', ''])
        with self.assertRaisesRegex(ValueError, 'unterminated code fence opened at line 2'):
            build.split_fences(raw, strict=True)


@unittest.skipIf(MarkdownIt is None, 'markdown-it-py is required for the independent CommonMark checks')
class MalformedNestedFenceTests(unittest.TestCase):
    """The pinned triage OUT-OF-SCOPE.md closes its markdown example at the nested ts fence and leaves a stray opener."""
    SOURCE = CompositionPolicyTests.SOURCE
    SKILL, DEP = '.agents/skills/a/SKILL.md', '.agents/skills/a/EXAMPLE.md'
    TEXT = ('# Example\n\nIntro.\n\n```markdown\n# Title\n\n## Why\n\n```ts\nconst x = 1;\n```\n\n## Prior\n\n- one\n```\n\n'
              '## After\n\nTail text.\n')
    NESTED = ('# Title\n\n## Why\n\n```ts\nconst x = 1;\n```\n\n## Prior\n\n- one\n')
    FIX = {'source_sha256': build.digest(TEXT.encode()), 'reason': 'fixture',
           'lines': [{'line': 5, 'was': '```markdown', 'now': '````markdown'}, {'line': 17, 'was': '```', 'now': '````'}]}

    def compose(self, **extra):
        return CompositionPolicyTests.compose(self, {self.SKILL: fake(body='# A\n\nSee the example below.\n'), self.DEP: self.TEXT},
                                              {self.SKILL: {'inline': [self.DEP]}}, **extra)

    def test_the_fixture_reproduces_the_swallowing_fence_in_an_independent_parser(self):
        self.assertEqual(unterminated(self.TEXT), [17])
        self.assertNotIn(('After'), [h for _, h in rendered_headings(self.TEXT)])

    def test_uncorrected_inline_fails_closed_and_names_the_asset_and_the_remedy(self):
        with self.assertRaisesRegex(ValueError, r'unterminated code fence opened at line \d+ in skills/a/SKILL.md; correct it under composition.fence_corrections'):
            self.compose()

    def test_declared_correction_makes_the_example_one_block_with_its_text_unchanged(self):
        native = self.compose(fence_corrections={self.DEP: self.FIX})['files']['skills/a/SKILL.md'].decode()
        self.assertEqual(unterminated(native), [])
        fences = [t for t in parse(native) if t.type == 'fence' and t.info == 'markdown']
        self.assertEqual([t.content for t in fences], [self.NESTED])
        headings = [h for _, h in rendered_headings(native)]
        for kept in ('After', 'Source adapter contract', 'Apply packaged sources in the working repository'):
            self.assertIn(kept, headings)
        for hidden in ('Title', 'Why', 'Prior'):
            self.assertNotIn(hidden, headings)
        self.assertLessEqual(set(rendered_fragment_links(native)), rendered_anchors(native))
        self.assertIn('apply-packaged-sources-in-the-working-repository', rendered_fragment_links(native))

    def test_correction_is_reported_and_its_source_is_never_rewritten(self):
        result = self.compose(fence_corrections={self.DEP: self.FIX})
        self.assertTrue(result['report']['assets'][0]['inlined'][0]['fence_corrected'])
        self.assertEqual(result['report']['assets'][0]['inlined'][0]['source_sha256'], build.digest(self.TEXT.encode()))

    def test_corrections_fail_closed_when_the_pin_the_line_or_the_edit_is_wrong(self):
        for label, change in (
            ('digest', {'source_sha256': '0' * 64}),
            ('line text', {'lines': [{'line': 5, 'was': '```md', 'now': '````md'}]}),
            ('past the end', {'lines': [{'line': 99, 'was': '```', 'now': '````'}]}),
            ('shorter marker', {'lines': [{'line': 17, 'was': '```', 'now': '``'}]}),
            ('changed info string', {'lines': [{'line': 5, 'was': '```markdown', 'now': '````text'}]}),
            ('different character', {'lines': [{'line': 17, 'was': '```', 'now': '~~~~'}]}),
            ('added text', {'lines': [{'line': 17, 'was': '```', 'now': '```` x'}]}),
        ):
            with self.subTest(label), self.assertRaisesRegex(ValueError, 'fence correction'):
                self.compose(fence_corrections={self.DEP: {**self.FIX, **change}})
        with self.assertRaisesRegex(ValueError, 'unselected source'):
            self.compose(fence_corrections={'missing.md': self.FIX})


@unittest.skipIf(MarkdownIt is None, 'markdown-it-py is required for the independent CommonMark checks')
class CommittedNativeMarkdownTests(unittest.TestCase):
    """Judged by markdown-it-py (CommonMark), not by the generator's own parser."""
    NATIVES = sorted(a['path'] for a in REPORT['assets'])

    def test_no_native_asset_has_a_fence_that_swallows_the_rest_of_the_document(self):
        for path in self.NATIVES:
            with self.subTest(path=path):
                self.assertEqual(unterminated((PLUGIN / path).read_text()), [])

    def test_every_in_document_link_reaches_a_rendered_heading_or_anchor(self):
        for path in self.NATIVES:
            with self.subTest(path=path):
                text = (PLUGIN / path).read_text()
                self.assertLessEqual(set(rendered_fragment_links(text)), rendered_anchors(text))

    def test_triage_adapter_contract_is_a_rendered_heading_and_the_example_is_the_pinned_text(self):
        text = native_text('.agents/skills/triage/SKILL.md')
        headings = rendered_headings(text)
        self.assertIn((2, 'Source adapter contract'), headings)
        self.assertIn((3, 'Apply packaged sources in the working repository'), headings)
        self.assertIn((5, 'Naming the file'), headings)
        self.assertIn('apply-packaged-sources-in-the-working-repository', rendered_fragment_links(text))
        source = 'sdlc-process/bundle/.agents/skills/triage/OUT-OF-SCOPE.md'
        pinned = (ROOT / source).read_text().split('\n')
        example = [t for t in parse(text) if t.type == 'fence' and t.info == 'markdown' and '# Dark Mode' in t.content]
        self.assertEqual(len(example), 1)
        self.assertEqual(example[0].markup, '````')
        self.assertEqual(example[0].content, '\n'.join(pinned[23:53]) + '\n')

    def test_the_pinned_bundle_copy_is_unchanged_by_the_correction(self):
        path = '.agents/skills/triage/OUT-OF-SCOPE.md'
        manifest = {item['path']: item for item in json.loads((BUNDLE / 'source-manifest.json').read_text())['files']}
        fix = SELECTION['composition']['fence_corrections'][path]
        data = (BUNDLE / path).read_bytes()
        self.assertEqual(build.digest(data), manifest[path]['sha256'])
        self.assertEqual(build.digest(data), fix['source_sha256'])
        self.assertEqual(manifest[path]['representation'], 'unchanged pinned source')
        self.assertEqual(data.decode().split('\n')[22], '```markdown')


if __name__ == '__main__':
    unittest.main()
