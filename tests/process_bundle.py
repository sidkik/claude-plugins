"""Packaging acceptance tests run without source checkouts or user configuration."""
import copy
import hashlib
import importlib.util
import json
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_process', ROOT / 'tools/build-process.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class ProcessBundleTests(unittest.TestCase):
    def test_dual_host_plugin_release_versions_agree(self):
        marketplace = json.loads((ROOT / '.claude-plugin/marketplace.json').read_text())
        entries = {entry['name']: entry for entry in marketplace['plugins']}
        codex_manifests = sorted(ROOT.glob('*/.codex-plugin/plugin.json'))
        self.assertTrue(codex_manifests, 'expected dual-host plugins')
        for codex_path in codex_manifests:
            plugin = codex_path.parent.parent
            with self.subTest(plugin=plugin.name):
                codex = json.loads(codex_path.read_text())
                claude = json.loads((plugin / '.claude-plugin/plugin.json').read_text())
                self.assertEqual(codex['name'], claude['name'])
                self.assertEqual(codex['version'], claude['version'])
                entry = entries[claude['name']]
                if 'version' in entry:
                    self.assertEqual(entry['version'], claude['version'])

    def test_claude_manifest_points_only_at_existing_skill_surfaces_and_workflows_are_model_invocable(self):
        manifest = json.loads((ROOT / 'sdlc-process/.claude-plugin/plugin.json').read_text())
        self.assertEqual(manifest['skills'], ['./skills/'])
        for entry in manifest['skills']:
            self.assertTrue((ROOT / 'sdlc-process' / entry).is_dir(), entry)
        common = {p.parent.name for p in (ROOT / 'sdlc-process/skills').glob('*/SKILL.md')}
        user_only = {p.parent.name for p in (ROOT / 'sdlc-process/claude-skills').glob('*/SKILL.md')}
        self.assertIn('sdlc-process', common)
        self.assertIn('orchestrator', common)
        workflows = {'ask-matt', 'grill-with-docs', 'handoff', 'implement', 'to-spec', 'to-tickets', 'triage', 'wayfinder'}
        self.assertLessEqual(workflows, common)
        self.assertFalse(workflows & user_only)
        self.assertEqual(user_only, set())
        for name in workflows:
            frontmatter = (ROOT / 'sdlc-process/skills' / name / 'SKILL.md').read_text().split('---')[1]
            self.assertNotIn('disable-model-invocation', frontmatter, name)
        self.assertIn('sdlc-observer', common)
        self.assertIn('session-start', common)
        self.assertEqual(len(common | user_only), 25)

    def test_installed_bytes_match_every_recorded_digest(self):
        bundle = ROOT / 'sdlc-process/bundle'
        manifest = json.loads((bundle / 'source-manifest.json').read_text())
        self.assertRegex(manifest['source_revision'], r'^[a-f0-9]{40}$')
        for item in manifest['files']:
            self.assertEqual(hashlib.sha256((bundle / item['path']).read_bytes()).hexdigest(), item['sha256'], item['path'])
        process = (bundle / 'docs/work/agent-orchestration/process/orchestration.process.md').read_text()
        self.assertRegex(process, r'captured_at: [^\n]+Z\n')
        listed = {r['path'] for r in manifest['files']}
        actual = {str(p.relative_to(bundle)) for p in bundle.rglob('*') if p.is_file()} - {'source-manifest.json'}
        self.assertEqual(listed, actual)

    def test_all_packaged_required_links_and_diagnosis_resource_resolve(self):
        plugin = ROOT / 'sdlc-process'
        files = {str(p.relative_to(plugin)): p.read_bytes() for folder in ('bundle', 'skills', 'claude-skills', 'agents') for p in (plugin / folder).rglob('*') if p.is_file()}
        build.validate_links(files)
        for name in ('sdlc-process', 'orchestrator', 'sdlc-policy-review', 'work-artifacts', 'resolving-merge-conflicts'):
            self.assertIn('skills/' + name + '/SKILL.md', files)
        self.assertIn('skills/ask-matt/SKILL.md', files)
        self.assertNotIn('claude-skills/ask-matt/SKILL.md', files)

    def test_missing_required_fragment_is_rejected(self):
        files = {'a.md': b'[required](b.md#missing)', 'b.md': b'# Present', 'bundle/.agents/skills/diagnosing-bugs/scripts/hitl-loop.template.sh': b''}
        with self.assertRaisesRegex(ValueError, 'broken packaged fragment'):
            build.validate_links(files)
        files['a.md'] = b'[required](b.md#present)'
        build.validate_links(files)

    def test_historical_link_is_pinned_but_required_link_stays_local(self):
        source = {'repository': 'https://github.com/example/source', 'revision': 'a' * 40}
        raw = '[required](../skill.md) [history](../history.md#receipt)\n```md\n[example](./not-real.md)\n```\n'
        result = build.relocate_links(raw, 'docs/a.md', {'skill.md'}, {'history.md'}, source)
        self.assertIn('[required](../skill.md)', result)
        self.assertIn('/blob/' + 'a' * 40 + '/history.md#receipt', result)
        self.assertIn('[example](./not-real.md)', result)
        with self.assertRaisesRegex(ValueError, 'unbundled local dependency'):
            build.relocate_links('[required](../missing.md)', 'docs/a.md', set(), set(), source)

    def test_generation_checks_drift_and_only_replaces_owned_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'README.md').write_text('maintained')
            expected = {'bundle/a.md': b'first', 'skills/test/SKILL.md': b'entry'}
            build.write_or_check(expected, root, False)
            build.write_or_check(expected, root, True)
            (root / 'bundle/a.md').write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError, 'generated drift'):
                build.write_or_check(expected, root, True)
            (root / 'bundle/old.md').write_text('stale')
            build.write_or_check(expected, root, False)
            self.assertFalse((root / 'bundle/old.md').exists())
            self.assertEqual((root / 'README.md').read_text(), 'maintained')

    def test_commit_source_ignores_dirty_tree_and_is_reproducible(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            subprocess.run(['git', 'init', '-q', str(repo)], check=True)
            def git(*args):
                return subprocess.check_output(['git', '-C', str(repo), *args]).decode().strip()
            git('config', 'user.email', 'test@example.invalid')
            git('config', 'user.name', 'Fixture')
            (repo / 'skill.md').write_text('committed')
            git('add', 'skill.md')
            git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture')
            revision = git('rev-parse', 'HEAD')
            source = {'revision': revision}
            (repo / 'skill.md').write_text('unreviewed dirty bytes')
            self.assertEqual(build.source_bytes(source, repo, 'skill.md'), b'committed')
            with self.assertRaisesRegex(ValueError, 'full immutable commit'):
                build.source_bytes({'revision': 'HEAD'}, repo, 'skill.md')

    def test_setup_runtime_is_packaged_from_maintained_source(self):
        maintained = (ROOT / 'tools/session-start/SKILL.md').read_text()
        packaged = (ROOT / 'sdlc-process/skills/session-start/SKILL.md').read_text()
        self.assertTrue(packaged.startswith(build.frontmatter(maintained)))
        self.assertIn(build.normalized_prose(maintained[len(build.frontmatter(maintained)):]), build.normalized_prose(packaged))
        self.assertIn('## Source adapter contract', packaged)
        for name in ('setup.mjs', 'status.mjs', 'agent-setup.mjs'):
            self.assertEqual((ROOT / 'tools/setup' / name).read_bytes(),
                             (ROOT / 'sdlc-process/scripts/setup' / name).read_bytes())
        self.assertEqual((ROOT / 'tools/setup/SKILL.md').read_bytes(),
                         (ROOT / 'sdlc-process/skills/sdlc-setup/SKILL.md').read_bytes())
        for source, destination in (
            ('agents/sdlc-observer.md', 'agents/sidkik-sdlc-observer.md'),
            ('agents/sdlc-observed-main.md', 'agents/sidkik-sdlc-observed-main.md'),
            ('skills/sdlc-observer/SKILL.md', 'skills/sdlc-observer/SKILL.md'),
        ):
            expected = (ROOT / 'tools/observer' / source).read_bytes()
            if source == 'agents/sdlc-observer.md':
                # The only generated part is the governing-extracts block; everything else is the maintained source.
                self.assertEqual(expected.count(build.EXTRACTS_MARKER), 1)
                head, tail = expected.split(build.EXTRACTS_MARKER)
                generated = (ROOT / 'sdlc-process' / destination).read_bytes()
                self.assertTrue(generated.startswith(head) and generated.endswith(tail))
                continue
            self.assertEqual(expected, (ROOT / 'sdlc-process' / destination).read_bytes())

    def test_observer_governing_rules_are_the_declared_pinned_sections_with_provenance(self):
        """Locate each declared section independently of the generator, then check what the observer actually carries."""
        selection = json.loads((ROOT / 'tools/process-sources.json').read_text())
        planning = selection['sources']['planning']
        manifest = {item['path']: item for item in json.loads((ROOT / 'sdlc-process/bundle/source-manifest.json').read_text())['files']}
        generated = (ROOT / 'sdlc-process/agents/sidkik-sdlc-observer.md').read_text()
        self.assertEqual(generated.count(build.EXTRACTS_BEGIN), 1)
        self.assertEqual(generated.count(build.EXTRACTS_END), 1)
        block = generated[generated.index(build.EXTRACTS_BEGIN):generated.index(build.EXTRACTS_END)]
        self.assertNotIn('__SIDKIK_', generated)
        wanted = {(e['path'], e['fragment']) for e in selection['composition']['observer_extracts']}
        # The extracts are an explicit, reviewed choice: the routing table, triage's steps and the mandatory-process rule.
        self.assertEqual(wanted, {('.claude/skills/sdlc-process/SKILL.md', 'compose-pocock-from-the-actual-situation'),
                                  ('.agents/skills/triage/SKILL.md', 'triage-a-specific-issue-or-pr'),
                                  ('.claude/skills/sdlc-process/SKILL.md', 'required-execution')})

        def find_section(text, fragment):
            lines, start, level = text.split('\n'), None, None
            for index, line in enumerate(lines):
                m = re.match(r'(#{1,6})\s+(.*?)\s*#*$', line)
                if not m:
                    continue
                name = re.sub(r'\s+', '-', re.sub(r'[^a-z0-9 -]', '', m[2].lower()).strip())
                if start is None and name == fragment:
                    start, level = index, len(m[1])
                elif start is not None and len(m[1]) <= level:
                    return '\n'.join(lines[start:index]).rstrip('\n') + '\n'
            self.assertIsNotNone(start, fragment)
            return '\n'.join(lines[start:]).rstrip('\n') + '\n'

        def plain(raw):
            raw = re.sub(r'^#{1,6}[ \t]+', '', raw, flags=re.M)
            return re.sub(r'\s+', ' ', re.sub(r'\[([^\]]+)\]\([^)\s]+\)', r'[\1]', raw)).strip()
        for path, fragment in sorted(wanted):
            raw = (ROOT / 'sdlc-process/bundle' / path).read_text()
            body = find_section(raw[len(build.frontmatter(raw)):].lstrip('\n') if raw.startswith('---\n') else raw, fragment)
            self.assertIn(plain(body), plain(block), f'{path}#{fragment} is not carried in full')
            # Provenance names the pinned revision, the source file's digest and the excerpt's own digest.
            marker = f"<!-- source: {planning['repository']} @ {planning['revision']} {path}#{fragment} sha256:{manifest[path]['source_sha256']} -->"
            self.assertIn(marker, block)
            self.assertIn('sha256:' + hashlib.sha256(body.encode()).hexdigest() + ';', block)
            # Every local reference is kept and resolved to the pinned upstream file, never erased.
            for text, target in re.findall(r'(?<!!)\[([^\]]+)\]\(([^\s)]+)\)', body):
                if target.startswith(('http://', 'https://')):
                    continue
                resolved = path if target.startswith('#') else build.target_path(path, target)
                pinned = f"[{text}]({planning['repository']}/blob/{planning['revision']}/" + build.quote(resolved)
                self.assertIn(pinned, block, f'link target {target} was erased or left local')
        self.assertNotRegex(re.sub(r'\]\(https?://[^)]*\)', ']()', block), r'\]\((?!\))')
        # The text claims bounded excerpts with transformations; it never claims the sources or exact bytes.
        self.assertIn('Bounded coverage:', block)
        self.assertIn('headings shifted and local links resolved to the pinned upstream revision, text otherwise unchanged', block)
        self.assertNotRegex(block.lower(), r'exact bytes|byte-for-byte|verbatim')
        for rule in ('Bounded repo-backed idea', 'Grill (if needed).', 'cannot mark a stage complete'):
            self.assertIn(rule, block)

    def test_observer_recovery_recipe_quotes_valid_native_tool_arguments(self):
        """The recipe's examples must be callable as written, and must not rest on count mode or on where a UUID sits."""
        grep_keys = {'pattern', 'path', 'glob', 'type', 'output_mode', '-B', '-A', '-C', 'context', '-n', '-i', '-o', 'head_limit', 'offset', 'multiline'}
        read_keys = {'file_path', 'offset', 'limit', 'allow_large', 'pages'}
        for name in ('tools/observer/agents/sdlc-observer.md', 'sdlc-process/agents/sidkik-sdlc-observer.md'):
            text = (ROOT / name).read_text()
            calls = []
            for span in re.findall(r'`(\{"[^`]*\})`', text):
                try:
                    calls.append(json.loads(span.replace('<line>', '1')))
                except ValueError:
                    pass  # an illustrative fragment with an ellipsis, not a complete call
            greps = [c for c in calls if 'pattern' in c]
            reads = [c for c in calls if 'file_path' in c]
            self.assertEqual(len(greps), 1, name)
            self.assertEqual(len(reads), 1, name)
            self.assertEqual(greps[0], {'pattern': 'example-check', 'path': '<transcriptPath>', 'output_mode': 'content', '-n': True, '-o': True}, name)
            self.assertEqual(reads[0], {'file_path': '<transcriptPath>', 'offset': 1, 'limit': 1, 'allow_large': True}, name)
            self.assertLessEqual(set(greps[0]), grep_keys)
            self.assertLessEqual(set(reads[0]), read_keys)
            recipe = text[text.index('Recovery recipe.'):text.index('Absence needs a search,')]
            for rule in ('The `count` and `files_with_matches` modes return no line and no record identity',
                         'A UUID you already hold, from the ledger, is a valid search key. Never guess a UUID, and never assume where a field sits in a record or what lies beside the phrase',
                         'do not open the artifact\'s path on disk to judge a recorded action',
                         'A search that returns nothing proves nothing'):
                self.assertIn(rule, recipe, name)
            # A compaction proves nothing missing: it never alone supports another native call.
            for rule in ('never by itself invalidates a proved native invocation: do not ask for another `Skill` call because of a compaction',
                         'A new call is supported only by an explicit reload requirement in the rules MAIN received, a changed source, or an invocation that is actually missing',
                         'A re-read of a source MAIN already invoked is not reading in place of invoking it'):
                self.assertIn(rule, text, name)
            self.assertIn('Do not pass `offset` to `Grep` when locating evidence: it skips matching output entries, never source lines', recipe, name)
            # The instructions must not hand the evaluator the scored target as an example.
            self.assertNotIn('SK-grilling', text)
            # The index covers invocation, not reads: read absence needs a whole-transcript search.
            absence = text[text.index('Absence needs a search,'):text.index('## Skill checkpoint')]
            for rule in ('it does not index `Read` or `cat` calls or their results',
                         'plus the newer matches from a `Grep` of the transcript',
                         'needs a `Grep` over the whole relevant transcript, including before the ledger\'s boundary',
                         '`Grep` has no line-range argument: search the whole file and use the returned line numbers to tell newer matches from older ones'):
                self.assertIn(rule, absence, name)
            # The failed pattern shape from the qualification run stays out of the instructions.
            self.assertNotIn('^.{0,400}', text)

    def test_observer_instruction_boundaries_stay_exact(self):
        """Focused source assertions for what the observer may rely on, say and claim."""
        selection = json.loads((ROOT / 'tools/process-sources.json').read_text())
        for name in ('tools/observer/agents/sdlc-observer.md', 'sdlc-process/agents/sidkik-sdlc-observer.md'):
            text = (ROOT / name).read_text()
            front = build.frontmatter(text)
            self.assertRegex(front, r'(?m)^model: claude-sonnet-5-5$', name)
            self.assertRegex(front, r'(?m)^effort: medium$', name)
            # The excerpt intro names exactly what the extracts carry and claims no stage-completion rules.
            intro = text[text.index('## Governing rules'):text.index('<!-- ', text.index('## Governing rules'))]
            self.assertIn("the entry's mandatory-process rule (following the process is mandatory, phase prose cannot mark a stage complete, and how an unmet criterion is handled)", intro, name)
            self.assertIn('They cover only these three sections', intro, name)
            for claim in ('not-applicable result', 'an exception', 'stage-completion rules'):
                self.assertNotIn(claim, intro, name)
            self.assertEqual(len(selection['composition']['observer_extracts']), 3)
            # Private reasoning and internal request records are never evidence.
            self.assertIn('ignore them, use only the public MAIN text, tool calls and results, and never quote private reasoning or base a finding on it', text, name)
            for private in ('`thinking`', '`redacted_thinking`', 'signatures', 'internal request records'):
                self.assertIn(private, text, name)
            # Completeness markers are a property of the Sidkik composed distribution, not of every skill.
            acquisition = text[text.index('3. **Acquisition.**'):text.index('4. **Adherence.**')]
            self.assertIn('for a Sidkik composed skill, confirm it is whole', acquisition, name)
            self.assertIn('a Sidkik record without them is cut', acquisition, name)
            self.assertIn('A self-contained third-party or local skill carries no such markers', acquisition, name)
            self.assertIn('A pointer wrapper only tells MAIN to read a packaged source', acquisition, name)
            self.assertIn('require no separate `Read` of the packaged source and never ask for one', acquisition, name)
            # A recorded prerequisite or status claim is assessed now; draft, unpushed, pending review or a later chance to object defer nothing.
            claims = text[text.index('5. **Recorded claims.**'):text.index('Report when invocation')]
            for rule in ('Assess now whether a prerequisite or status claim MAIN recorded is true',
                         'A draft, an unpushed change, a pending review or a later chance for the human to object does not defer that check',
                         'a recorded passed or not-applicable claim that depends on that choice is unsupported unless it cites the human\'s actual disposition',
                         'reconciled to pending or to cite that disposition',
                         'do not presume consent is absent',
                         'This leaves drafting and proposals free, and a conditional step stays met where its own condition does not hold'):
                self.assertIn(rule, claims, name)
            self.assertIn('adherence or the truth of a recorded claim fails at the action', text, name)
            # The claims rule carries no case identifiers or examples from the qualification session.
            for case in ('w3', 'AC-16', 'SK-', 'D-813', 'grilling and domain'):
                self.assertNotIn(case, claims, name)
            # The checkpoint explanation stays generic: it names no example of the scored step.
            checkpoint = text[text.index('## Skill checkpoint'):text.index('## Report')]
            self.assertNotIn('grill if needed', checkpoint.lower(), name)
            self.assertIn('A conditional step is required only where its own condition holds', checkpoint, name)

    def test_observer_reads_and_searches_but_never_edits_and_has_no_installed_path_placeholders(self):
        source = (ROOT / 'tools/observer/agents/sdlc-observer.md').read_text()
        generated = (ROOT / 'sdlc-process/agents/sidkik-sdlc-observer.md').read_text()
        for text in (source, generated):
            self.assertRegex(build.frontmatter(text), r'(?m)^tools:\n  - Read\n  - Grep\n(?!  - )')
            self.assertNotIn('__SIDKIK_', text)


if __name__ == '__main__':
    unittest.main()
