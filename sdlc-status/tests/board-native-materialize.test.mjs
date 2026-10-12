import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

test('native fixtures expose candidate project skills, preserve relative sources and separate ordinary next-work routing', () => {
  const scratch = mkdtempSync(join(process.env.SDLC_TEST_SCRATCH || '/tmp', 'board-native-'));
  const root = join(scratch, 'fixtures');
  try {
    const script = fileURLToPath(new URL('./board-native-materialize.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    for (const client of ['claude', 'codex']) for (const name of ['configured', 'no-skill', 'unavailable']) {
      const repo = join(root, client, name);
      const manifest = JSON.parse(readFileSync(join(repo, 'candidate-skills.json')));
      const nativeRoot = join(repo, client === 'claude' ? '.claude' : '.agents');
      for (const skill of ['sdlc-status', 'sdlc-process']) {
        const candidate = manifest[skill];
        assert.equal(candidate.path, join(nativeRoot, 'skills', skill, 'SKILL.md'));
        assert.deepEqual(readFileSync(candidate.path), readFileSync(candidate.source));
        assert.equal(candidate.sha256, createHash('sha256').update(readFileSync(candidate.path)).digest('hex'));
      }
      const status = manifest['sdlc-status'].path;
      assert.equal(existsSync(resolve(dirname(status), '../../README.md')), true);
      assert.equal(existsSync(join(nativeRoot, 'scripts/board.mjs')), true);
      const process = manifest['sdlc-process'].path;
      assert.equal(existsSync(resolve(dirname(process), '../orchestrator/SKILL.md')), true);
      assert.match(readFileSync(resolve(dirname(process), '../../../docs/work/agent-orchestration/process/orchestration.process.md'), 'utf8'), /finish-before-entry order/);
      const prompt = readFileSync(join(repo, 'prompt.txt'), 'utf8');
      assert.match(prompt, /candidate project skill sdlc-status \(bare name/);
      assert.doesNotMatch(prompt, /sdlc-status:sdlc-status/);
      assert.match(readFileSync(join(repo, 'commands.txt'), 'utf8'), /other-cwd.*\.json/);
      assert.deepEqual(JSON.parse(readFileSync(join(repo, 'advance.json'))), {
        changed: { progress: { active: 'DE' } }, finished: { stage: 'RS', outcome: 'ready assessed; start not authorized' },
      });
      assert.equal(readFileSync(join(repo, 'next-work-prompt.txt'), 'utf8'), "What's up next? Please check GitHub for the next work item. Keep this read-only.\n");
      const launches = readFileSync(join(repo, 'native-commands.txt'), 'utf8');
      assert.doesNotMatch(launches, /sdlc-status:sdlc-status|--plugin-dir/);
      if (client === 'codex') {
        assert.match(launches, /--write --skill sdlc-status/);
        assert.match(launches, /--skill sdlc-process.*next-work-prompt/);
      }
      assert.equal(existsSync(join(repo, 'state')), false);
    }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});
