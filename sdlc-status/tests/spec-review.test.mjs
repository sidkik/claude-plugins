import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../scripts/status.mjs', import.meta.url));
function fixture(fn) {
  const root = mkdtempSync(join(process.env.SDLC_TEST_SCRATCH || '/tmp', 'spec-board-'));
  const delivery = join(root, 'delivery');
  mkdirSync(join(delivery, 'docs/agents'), { recursive: true });
  writeFileSync(join(delivery, 'docs/agents/issue-tracker.md'), '---\nboard_skill: fake-board\n---\n');
  const run = (verb, payload, opts = []) => {
    const result = spawnSync(process.execPath, [cli, verb, '--client', 'codex', '--session', 'spec', ...opts], {
      cwd: root, input: payload && JSON.stringify(payload), encoding: 'utf8',
      env: { ...process.env, SDLC_STATUS_DIR: join(root, 'state'), SDLC_STATUS_SESSION: '', NO_COLOR: '1' },
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout;
  };
  const requests = output => output.split('\n').filter(x => x.startsWith('SDLC_BOARD_DELEGATE ')).map(x => JSON.parse(x.slice(20)));
  const state = JSON.parse(run('template', undefined, ['--route', 'delivery']));
  state.work = 'https://github.com/example/delivery/issues/17';
  state.progress.evidenceRevision = 'spec-fixture';
  run('write', state, ['--delivery-repo', delivery]);
  const saved = () => JSON.parse(readFileSync(join(root, 'state', readdirSync(join(root, 'state'))[0]), 'utf8'));
  try { fn({ run, requests, state, saved, delivery }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}
test('SPEC: finish old stage before entering next stage in an atomic record', () => fixture(({ run, requests }) => {
  run('record', { changed: { progress: { active: 'RS' } } });
  const actual = requests(run('record', { changed: { progress: { active: 'DE' } }, finished: { stage: 'RS', outcome: 'ready assessed' } })).map(x => `${x.input.event}:${x.input.stage}`);
  console.log('ORDER actual=' + JSON.stringify(actual));
  assert.deepEqual(actual, ['stage-finish:RS', 'stage-change:DE']);
}));
test('SPEC: explicit finish outcome is recorded before delegation', () => fixture(({ run, saved }) => {
  run('record', { finished: { stage: 'IN', outcome: 'investigation handed off' } });
  const actual = JSON.stringify(saved()).includes('investigation handed off');
  console.log('PERSIST outcomePresent=' + actual);
  assert.equal(actual, true, 'recorded projection must retain the emitted finish disposition');
}));
test('SPEC: repeating an unchanged finish produces no event', () => fixture(({ run, requests }) => {
  const event = { finished: { stage: 'IN', outcome: 'investigation handed off' } };
  run('record', event);
  const actual = requests(run('record', event));
  console.log('REPEAT actual=' + JSON.stringify(actual.map(x => x.input)));
  assert.deepEqual(actual, []);
}));
test('CONTROL: switching work without new checkout clears the old pointer', () => fixture(({ run, requests, state, saved }) => {
  state.work = 'https://github.com/example/other/issues/18';
  const output = run('write', state);
  assert.deepEqual(requests(output), []);
  assert.equal(saved().deliveryRepository, undefined);
  assert.match(output, /SDLC_BOARD_GAP/);
}));
