import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../scripts/status.mjs', import.meta.url));
function fixture(fn) {
  const root = mkdtempSync(join(process.env.SDLC_TEST_SCRATCH || '/tmp', 'board-sync-'));
  const delivery = join(root, 'delivery');
  const cwd = join(root, 'other');
  for (const repo of [delivery, cwd]) mkdirSync(join(repo, 'docs/agents'), { recursive: true });
  const tracker = (repo, text) => writeFileSync(join(repo, 'docs/agents/issue-tracker.md'), text);
  tracker(delivery, '---\nboard_skill: fake-board\n---\n# Tracker\n');
  tracker(cwd, '---\nboard_skill: wrong-board\n---\n');
  const run = (args, payload) => spawnSync(process.execPath, [cli, ...args], {
    cwd, input: payload && JSON.stringify(payload), encoding: 'utf8',
    env: { ...process.env, SDLC_STATUS_DIR: join(root, 'state'), SDLC_STATUS_SESSION: '', NO_COLOR: '1' },
  });
  const state = JSON.parse(run(['template', '--route', 'delivery']).stdout);
  state.work = 'https://github.com/example/delivery/issues/17';
  state.progress.evidenceRevision = 'fixture-v1';
  const write = payload => run(['write', '--client', 'codex', '--session', 'case', '--delivery-repo', delivery], payload);
  const record = payload => run(['record', '--client', 'codex', '--session', 'case'], payload);
  try { fn({ root, delivery, cwd, tracker, run, state, write, record }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}
const requests = result => result.stdout.split('\n').filter(line => line.startsWith('SDLC_BOARD_DELEGATE ')).map(line => JSON.parse(line.slice('SDLC_BOARD_DELEGATE '.length)));

test('recorded initial stage delegates exact inputs from delivery configuration, not cwd', () => fixture(({ write, state, delivery }) => {
  const result = write(state);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(requests(result), [{ skill: 'fake-board', deliveryRepository: delivery, input: {
    event: 'stage-change', issueUrl: 'https://github.com/example/delivery/issues/17', route: 'delivery', stage: 'IN', outcome: null,
  } }]);
  assert.match(result.stdout, /native invocation required/);
}));

test('unchanged status and criterion-only updates do not delegate; changed stage does', () => fixture(({ write, record, state, delivery }) => {
  assert.equal(write(state).status, 0);
  assert.deepEqual(requests(write(state)), []);
  assert.deepEqual(requests(record({ changed: { next: 'Keep investigating' } })), []);
  const result = record({ changed: { progress: { active: 'RS' } } });
  assert.equal(result.status, 0, result.stdout);
  assert.deepEqual(requests(result), [{ skill: 'fake-board', deliveryRepository: delivery, input: {
    event: 'stage-change', issueUrl: state.work, route: 'delivery', stage: 'RS', outcome: null,
  } }]);
}));

test('stage finish delegates recorded outcome and completion claims retain their actual standing', () => fixture(({ write, record, state, delivery }) => {
  write(state);
  const result = record({ finished: { stage: 'IN', outcome: 'investigation handed off' } });
  assert.equal(result.status, 0, result.stdout);
  assert.deepEqual(requests(result), [{ skill: 'fake-board', deliveryRepository: delivery, input: {
    event: 'stage-finish', issueUrl: state.work, route: 'delivery', stage: 'IN', outcome: 'investigation handed off',
  } }]);
  const claimed = record({ changed: { progress: { claimedComplete: ['IN'] } } });
  assert.equal(requests(claimed)[0].input.outcome, 'held');
  assert.deepEqual(requests(record({})), []);
  const invalid = record({ finished: { stage: 'Deliver', outcome: 'complete' } });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stdout, /current-route stage ID/);
  assert.deepEqual(requests(invalid), []);
}));

test('route changes preserve route and machine stage IDs without inventing mappings', () => fixture(({ write, run, state, delivery }) => {
  write(state);
  for (const route of ['triage', 'feature', 'research']) {
    const next = JSON.parse(run(['template', '--route', route]).stdout);
    next.work = state.work;
    next.progress.evidenceRevision = 'fixture-v1';
    const result = write(next);
    assert.equal(result.status, 0, result.stdout);
    assert.deepEqual(requests(result), [{ skill: 'fake-board', deliveryRepository: delivery, input: {
      event: 'stage-change', issueUrl: state.work, route, stage: 'IN', outcome: null,
    } }]);
  }
}));

test('no board skill does nothing; unreadable or malformed tracker stays a visible nonblocking gap', () => fixture(({ write, state, tracker, delivery }) => {
  tracker(delivery, '# Tracker\n```yaml\nboard_skill: prose-only\n```\n');
  const absent = write(state);
  assert.equal(absent.status, 0);
  assert.deepEqual(requests(absent), []);
  assert.doesNotMatch(absent.stdout, /SDLC_BOARD_/);
  state.progress.active = 'RS';
  tracker(delivery, '---\nboard_skill: one\nboard_skill: two\n---\n');
  const malformed = write(state);
  assert.equal(malformed.status, 0);
  assert.match(malformed.stdout, /SDLC_BOARD_GAP .*duplicate board_skill.*"blocksWork":false/);
  rmSync(join(delivery, 'docs/agents/issue-tracker.md'));
  state.progress.active = 'DE';
  const missing = write(state);
  assert.equal(missing.status, 0);
  assert.match(missing.stdout, /SDLC_BOARD_GAP .*ENOENT.*"blocksWork":false/);
}));

test('configured unavailable skill is delegated for native resolution, never treated as loaded by Node', () => fixture(({ write, state, tracker, delivery, record }) => {
  tracker(delivery, '---\nboard_skill: no-such-board\n---\n');
  const result = write(state);
  assert.equal(result.status, 0);
  assert.equal(requests(result)[0].skill, 'no-such-board');
  assert.match(result.stdout, /unavailable skill is a scoped board gap; continue authorized work/);
  assert.doesNotMatch(result.stdout, /skill loaded|card moved/);
  assert.equal(record({ changed: { next: 'Continue authorized work' } }).status, 0);
}));

test('next-work delegates read-only candidates from explicit delivery repo and never writes session state', () => fixture(({ run, delivery, tracker }) => {
  const result = run(['next-work', '--delivery-repo', delivery]);
  assert.equal(result.status, 0);
  assert.deepEqual(requests(result), [{ skill: 'fake-board', deliveryRepository: delivery, input: { event: 'next-work', readOnly: true } }]);
  assert.match(result.stdout, /selection never authorizes start/);
  assert.equal(run(['inspect', '--client', 'codex', '--session', 'case']).stdout.includes('no projection'), true);
  tracker(delivery, '# No board\n');
  assert.deepEqual(requests(run(['next-work', '--delivery-repo', delivery])), []);
  const missing = run(['next-work']);
  assert.equal(missing.status, 0);
  assert.match(missing.stdout, /explicit absolute delivery repository is missing/);
}));

test('new work cannot inherit the old delivery checkout or consult cwd implicitly', () => fixture(({ write, run, state }) => {
  write(state);
  state.work = 'https://github.com/example/another-repository/issues/19';
  const result = run(['write', '--client', 'codex', '--session', 'case'], state);
  assert.equal(result.status, 0);
  assert.deepEqual(requests(result), []);
  assert.match(result.stdout, /SDLC_BOARD_GAP .*explicit absolute delivery repository is missing/);
  assert.doesNotMatch(result.stdout, /fake-board|wrong-board/);
}));

test('finish dedup survives full writes while changed outcomes, evidence and stage re-entry permit a new finish', () => fixture(({ write, record, state }) => {
  write(state);
  const finished = { stage: 'IN', outcome: 'handed off' };
  assert.equal(requests(record({ finished })).length, 1);
  assert.deepEqual(requests(write(state)), []);
  assert.deepEqual(requests(record({ finished })), []);
  assert.equal(requests(record({ finished: { stage: 'IN', outcome: 'returned for revision' } })).length, 1);
  assert.equal(requests(record({ finished })).length, 1);
  assert.equal(requests(record({ changed: { progress: { evidenceRevision: 'fixture-v2' } }, finished })).length, 1);
  assert.deepEqual(requests(record({ finished })), []);
  record({ changed: { progress: { active: 'RS' } } });
  record({ changed: { progress: { active: 'IN' } } });
  assert.equal(requests(record({ finished })).length, 1);
  assert.deepEqual(requests(record({ finished })), []);
}));
