"""Packaging acceptance tests run without source checkouts or user configuration."""
import copy
import hashlib
import importlib.util
import json
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
        self.assertEqual((ROOT / 'tools/session-start/SKILL.md').read_bytes(),
                         (ROOT / 'sdlc-process/skills/session-start/SKILL.md').read_bytes())
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
            self.assertEqual((ROOT / 'tools/observer' / source).read_bytes(),
                             (ROOT / 'sdlc-process' / destination).read_bytes())


if __name__ == '__main__':
    unittest.main()
