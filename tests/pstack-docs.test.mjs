import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkRepository, extractContract, KINDS} from '../sidkik-pstack-documentation/skills/work-artifacts/scripts/check-artifacts.mjs';

const plugin = fileURLToPath(new URL('../sidkik-pstack-documentation/', import.meta.url));
const script = path.join(plugin, 'skills/work-artifacts/scripts/check-artifacts.mjs');
const write = (file, text = '# Record\n') => {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, text);
};
const document = contract => `# PStack documentation\n\nPStack owns its runtime stores.\n\n\`\`\`json pstack-docs\n${typeof contract === 'string' ? contract : JSON.stringify(contract, null, 2)}\n\`\`\`\n`;
const base = (extra = {}) => ({version: 1, repository: 'sidkik/core', workRoot: 'docs/work', ...extra});

function tmp(t) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pstack-docs '));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  return dir;
}

function repo(t, {contract, raw, files = [], pointer = true} = {}) {
  const root = path.join(tmp(t), 'repo');
  fs.mkdirSync(root);
  if (pointer) write(path.join(root, 'AGENTS.md'), 'Read docs/agents/pstack-docs.md for documentation ownership.\n');
  if (raw !== undefined) write(path.join(root, 'docs/agents/pstack-docs.md'), raw);
  else if (contract) write(path.join(root, 'docs/agents/pstack-docs.md'), document(contract));
  for (const file of files) write(path.join(root, file));
  return root;
}

const codes = (report, level = 'error') => report.findings.filter(f => f.level === level).map(f => f.code);
const finding = (report, subject, level = 'error') => report.findings.find(f => f.level === level && f.subject === subject);
const {FORCE_COLOR, NO_COLOR, ...childEnv} = process.env;
const run = (args, cwd) => spawnSync(process.execPath, [script, ...args], {cwd, encoding: 'utf8', env: childEnv});

test('missing configuration modes are distinct', t => {
  const bare = repo(t, {pointer: false});
  const report = checkRepository({repo: bare});
  assert.equal(report.status, 'unconfigured');
  const cli = run(['--repo', bare], bare);
  assert.equal(cli.status, 0);
  assert.match(cli.stdout, /result: UNCONFIGURED \(not validated\)/);

  const pointed = checkRepository({repo: repo(t)});
  assert.equal(pointed.status, 'failed');
  assert.match(finding(pointed, 'docs/agents/pstack-docs.md').message, /AGENTS\.md point to it/);

  const supplied = repo(t, {pointer: false, files: ['docs/work/core-gh-1/auth.plan.md']});
  const withArtifacts = checkRepository({repo: supplied, artifacts: ['docs/work/core-gh-1/auth.plan.md']});
  assert.equal(withArtifacts.status, 'failed');
  assert.deepEqual(codes(withArtifacts), ['config-required']);
  assert.equal(run(['--repo', supplied, 'docs/work/core-gh-1/auth.plan.md'], supplied).status, 1);

  const pointedWithArtifacts = checkRepository({repo: repo(t, {files: ['docs/work/core-gh-1/auth.plan.md']}), artifacts: ['docs/work/core-gh-1/auth.plan.md']});
  assert.deepEqual(pointedWithArtifacts.findings.map(f => `${f.level} ${f.code} ${f.subject}`), ['error config-required docs/agents/pstack-docs.md', 'note not-checked artifacts']);
  assert.match(pointedWithArtifacts.findings[0].message, /AGENTS\.md point to it/);
  assert.doesNotMatch(pointedWithArtifacts.findings.map(f => f.message).join('\n'), /run the checker without artifacts|not validated/, 'a pointer to a missing file is broken setup, not the fallback');
});

test('default destinations accept correctly named files for every kind', t => {
  const files = KINDS.map(kind => `docs/work/core-gh-517/${kind === 'evidence' ? '2026-10-25-1' : 'auth'}.${kind}.md`);
  const root = repo(t, {contract: base(), files});
  const report = checkRepository({repo: root, artifacts: files});
  assert.equal(report.status, 'passed', JSON.stringify(report.findings));
  assert.equal(report.findings.filter(f => f.code === 'destination').length, KINDS.length);
  assert.deepEqual(codes(report, 'pending'), [], 'an ordinary plan is not multi-phase');
});

test('wrong filenames and directories fail with the expected destination', t => {
  const wrong = ['docs/work/core-gh-1/auth-plan.md', 'docs/work/auth.plan.md', 'docs/plans/core-gh-1/auth.plan.md', 'docs/work/Core_GH/auth.plan.md', 'docs/work/core-gh-1/auth.notes.md'];
  const root = repo(t, {contract: base(), files: wrong});
  const report = checkRepository({repo: root, artifacts: wrong});
  assert.equal(report.status, 'failed');
  for (const file of wrong) assert.equal(finding(report, file)?.code, 'unmatched-artifact', file);
  assert.match(finding(report, 'docs/work/auth.plan.md').message, /Expected a plan at docs\/work\/<work-key>\/<topic>\.plan\.md/);
  assert.match(finding(report, 'docs/work/core-gh-1/auth.notes.md').message, /names no artifact kind/);
});

test('supplied artifacts must be existing files inside the repository', t => {
  const root = repo(t, {contract: base(), files: ['docs/work/core-gh-1/auth.plan.md']});
  const report = checkRepository({repo: root, artifacts: ['docs/work/core-gh-1/absent.plan.md', 'docs/work/core-gh-1', '../outside.plan.md', path.join(root, 'docs/work/core-gh-1/auth.plan.md'), './docs/work/core-gh-1/auth.plan.md']});
  assert.deepEqual(codes(report), ['missing-artifact', 'not-a-file', 'invalid-path', 'invalid-path', 'invalid-path']);
  assert.match(finding(report, 'docs/work/core-gh-1/absent.plan.md').message, /only existing files are checked/);
});

test('destination overrides replace only their own kind', t => {
  const files = ['docs/plans/core-gh-1/auth.plan.md', 'docs/work/core-gh-1/auth.plan.md', 'docs/work/core-gh-1/auth.research.md'];
  const root = repo(t, {contract: base({destinations: {plan: 'docs/plans/<work-key>/<topic>.plan.md'}}), files});
  const report = checkRepository({repo: root, artifacts: files});
  assert.deepEqual(codes(report), ['unmatched-artifact']);
  assert.equal(finding(report, 'docs/work/core-gh-1/auth.plan.md').code, 'unmatched-artifact');
  assert.match(finding(report, 'docs/work/core-gh-1/auth.plan.md').message, /docs\/plans\/<work-key>\/<topic>\.plan\.md/);
});

test('external ownership is scoped to its work key and kinds', t => {
  const files = ['docs/work/payments-2026/rollout.plan.md', 'docs/work/payments-2026/rollout.research.md', 'docs/work/core-gh-9/cache.plan.md'];
  const contract = base({external: [{work: 'payments-2026', kinds: ['plan'], repository: 'sidkik/planning', path: 'docs/work/payments-2026', reason: 'shared plan'}]});
  const report = checkRepository({repo: repo(t, {contract, files}), artifacts: files});
  assert.deepEqual(codes(report), ['wrong-owner']);
  assert.match(finding(report, files[0]).message, /owned by sidkik\/planning at docs\/work\/payments-2026/);
  assert.equal(finding(report, files[1], 'ok').code, 'destination');
  assert.equal(finding(report, files[2], 'ok').code, 'destination');
  assert.match(finding(report, 'external[0]', 'unverified').message, /existence UNVERIFIED/);
});

test('canonical records are exact files and do not block new records of their kind', t => {
  const legacy = 'docs/work/billing/c11-subscriptions.md';
  const files = [legacy, 'docs/work/other/c11-subscriptions.md', 'docs/work/billing/new.plan.md', 'docs/work/billing/notes.research.md', 'docs/shared/roadmap.md'];
  const contract = base({canonical: [
    {work: 'billing', kind: 'plan', owner: 'sidkik/core', path: legacy, reason: 'predates typed filenames'},
    {work: 'roadmap', kind: 'plan', owner: 'sidkik/planning', path: 'docs/shared/roadmap.md', reason: 'shared roadmap'},
  ]});
  const report = checkRepository({repo: repo(t, {contract, files}), artifacts: files});
  assert.equal(finding(report, legacy, 'ok').code, 'canonical');
  assert.equal(finding(report, files[1]).code, 'unmatched-artifact', 'a legacy name is accepted only at its exact path');
  assert.equal(finding(report, files[2], 'ok').code, 'destination', 'a new plan topic beside a canonical plan is a distinct record');
  assert.equal(finding(report, files[3], 'ok').code, 'destination', 'another kind for the same work stays allowed');
  assert.equal(finding(report, files[4]).code, 'wrong-owner', 'a local copy of an external canonical record');
  assert.match(finding(report, 'canonical[1]', 'unverified').message, /UNVERIFIED/);
});

test('canonical entries never accept directories or missing files', t => {
  const contract = base({canonical: [
    {work: 'legacy', kind: 'spec', owner: 'sidkik/core', path: 'docs/legacy', reason: 'whole folder'},
    {work: 'gone', kind: 'spec', owner: 'sidkik/core', path: 'docs/gone.md', reason: 'deleted'},
  ]});
  const root = repo(t, {contract, files: ['docs/legacy/a.md']});
  const report = checkRepository({repo: root, artifacts: ['docs/legacy/a.md']});
  assert.equal(finding(report, 'canonical[0]').code, 'not-a-file');
  assert.equal(finding(report, 'canonical[1]').code, 'missing-canonical');
  assert.equal(finding(report, 'docs/legacy/a.md').code, 'unmatched-artifact');
  const globbed = checkRepository({repo: repo(t, {contract: base({canonical: [{work: 'legacy', kind: 'spec', owner: 'sidkik/core', path: 'docs/legacy/*.md', reason: 'glob'}]})})});
  assert.deepEqual(codes(globbed), ['invalid-path']);
});

test('duplicate and ambiguous ownership is rejected', t => {
  const record = {work: 'billing', kind: 'plan', owner: 'sidkik/core', path: 'docs/a.md', reason: 'legacy'};
  const scope = {work: 'billing', kinds: ['plan'], repository: 'sidkik/planning', path: 'plans', reason: 'shared'};
  const cases = [
    [{canonical: [record, {...record}]}, 'duplicate-authority'],
    [{canonical: [record, {...record, owner: 'sidkik/planning'}]}, 'ambiguous-ownership'],
    [{canonical: [record], external: [scope]}, 'duplicate-authority'],
    [{external: [scope, {...scope, repository: 'sidkik/other'}]}, 'ambiguous-ownership'],
    [{resources: [{role: 'domain-contract', state: 'unconfigured'}, {role: 'domain-contract', state: 'unconfigured'}]}, 'duplicate-authority'],
    [{resources: [{role: 'domain-docs', state: 'destination', type: 'file', path: 'a.md'}, {role: 'architecture', state: 'destination', type: 'file', path: 'a.md'}]}, 'duplicate-authority'],
    [{resources: [{role: 'decision-records', state: 'destination', type: 'directory', path: 'docs/work/adr'}]}, 'ambiguous-rule'],
    [{multiphasePlan: 'docs/work/<work-key>/<topic>.plan.md'}, 'ambiguous-rule'],
    [{destinations: {plan: 'docs/work/<work-key>/<topic>.review.md'}}, 'ambiguous-rule'],
  ];
  for (const [extra, code] of cases) {
    const report = checkRepository({repo: repo(t, {contract: base(extra), files: ['docs/a.md']})});
    assert.equal(report.status, 'failed', JSON.stringify(extra));
    assert.ok(codes(report).includes(code), `${JSON.stringify(extra)} -> ${JSON.stringify(report.findings)}`);
  }
});

test('malformed contracts and unknown tokens fail', t => {
  const cases = [
    [base({extra: true}), /contract\.extra/],
    [base({version: 2}), /contract\.version/],
    [{version: 1, repository: 'sidkik/core'}, /contract\.workRoot.*required/],
    [base({repository: 'core'}), /owner\/name/],
    [base({repository: 'owner/name'}), /seed placeholder/],
    [base({workRoot: '../docs'}), /"\." or "\.\."/],
    [base({workRoot: '/docs/work'}), /not absolute/],
    [base({resources: [{role: 'glossary', state: 'existing', type: 'file', path: 'CONTEXT.md'}]}), /resources\[0\]\.role/],
    [base({resources: [{role: 'domain-docs', state: 'present', path: 'CONTEXT.md'}]}), /resources\[0\]\.state/],
    [base({resources: [{role: 'domain-docs', state: 'existing', path: 'CONTEXT.md'}]}), /resources\[0\]\.type.*required/],
    [base({resources: [{role: 'domain-docs', state: 'unconfigured', path: 'CONTEXT.md'}]}), /resources\[0\]\.path.*not a recognised/],
    [base({destinations: {notes: 'docs/<work-key>/<topic>.notes.md'}}), /destinations\.notes/],
    [base({destinations: {plan: 'docs/<work>/<topic>.plan.md'}}), /unknown token <work>/],
    [base({destinations: {plan: 'docs/<work-key>/(<topic>|x).plan.md'}}), /not regular expressions/],
    [base({destinations: {plan: 'docs/<work-key>/<topic>.plan.md'}, multiphasePlan: 'docs/work/<work-key>/<topic>.plan.md$'}), /not regular expressions/],
    [base({destinations: {plan: 'docs/**/<topic>.plan.md'}}), /glob characters/],
    [base({destinations: {plan: 'docs/<topic>.plan.md'}}), /<work-key> exactly once/],
    [base({destinations: {plan: 'docs/<work-key><topic>.plan.md'}}), /one token per path segment/],
    [base({destinations: {plan: 'docs/<work-key>.x/<topic>.plan.md'}}), /<work-key> exactly once, as a whole path segment/],
    [base({destinations: {plan: 'docs/<topic>/<work-key>/a.plan.md'}}), /only literal segments before <work-key>/],
    [base({external: [{work: 'Payments', kinds: ['plan'], repository: 'sidkik/planning', path: 'p', reason: 'r'}]}), /external\[0\]\.work/],
    [base({external: [{work: 'payments', kinds: ['notes'], repository: 'sidkik/planning', path: 'p', reason: 'r'}]}), /external\[0\]\.kinds/],
    [base({external: [{work: 'payments', kinds: ['plan'], repository: 'sidkik/core', path: 'p', reason: 'r'}]}), /names this repository/],
    [base({canonical: [{work: 'w', kind: 'plan', owner: 'sidkik/core', path: 'docs/<topic>.md', reason: 'r'}]}), /without <tokens>/],
    [base({canonical: [{work: 'w', kind: 'spec', owner: 'sidkik/core', path: 'a.md', reason: 'r', multiphase: true}]}), /only to plan/],
    [base({canonical: [{work: 'w', kind: 'plan', owner: 'sidkik/core', path: 'a.md'}]}), /canonical\[0\]\.reason.*required/],
  ];
  for (const [contract, pattern] of cases) {
    const report = checkRepository({repo: repo(t, {contract, files: ['a.md']})});
    assert.equal(report.status, 'failed', JSON.stringify(contract));
    assert.ok(report.findings.some(f => pattern.test(`${f.subject} ${f.message}`)), `${JSON.stringify(contract)} -> ${JSON.stringify(report.findings)}`);
  }
});

test('the contract block is exactly one strict fence', t => {
  const body = JSON.stringify(base());
  const cases = [
    ['# No contract\n', /no ```json pstack-docs fence/],
    [`${document(base())}\n${document(base())}`, /found 2 pstack-docs fences/],
    [`\`\`\`JSON pstack-docs\n${body}\n\`\`\`\n`, /exactly ```json pstack-docs/],
    [`  \`\`\`json pstack-docs\n${body}\n\`\`\`\n`, /exactly ```json pstack-docs/],
    [`\`\`\`json pstack-docs\n${body}\n`, /not closed/],
    [document('{"version": 1, "repository": "sidkik/core",}'), /not valid JSON/],
    [document('{"version": 1, "repository": "sidkik/core", "workRoot": "docs/work", "workRoot": "x"}'), /repeats JSON keys: workRoot/],
  ];
  for (const [raw, pattern] of cases) {
    const report = checkRepository({repo: repo(t, {raw, files: ['docs/work/a/b.plan.md']}), artifacts: ['docs/work/a/b.plan.md']});
    assert.equal(report.status, 'failed');
    assert.match(finding(report, 'docs/agents/pstack-docs.md').message, pattern);
    assert.equal(finding(report, 'artifacts', 'note').code, 'not-checked');
  }
});

test('existing resources must exist; future, external and unconfigured ones do not', t => {
  const contract = base({resources: [
    {role: 'domain-contract', state: 'existing', type: 'file', path: 'docs/agents/domain.md'},
    {role: 'decision-records', state: 'existing', type: 'directory', path: 'docs/adr'},
    {role: 'decision-records', state: 'existing', type: 'directory', path: 'docs/domains/billing/adr'},
    {role: 'verification', state: 'destination', type: 'directory', path: '.claude/skills/verify-app'},
    {role: 'tracker', state: 'external', repository: 'sidkik/planning', path: 'docs/agents/issue-tracker.md'},
    {role: 'evidence-retention', state: 'unconfigured', note: 'local only'},
  ]});
  const files = ['docs/adr/0001-record.md', 'docs/domains/billing/adr/0001-x.md'];
  const missingContract = checkRepository({repo: repo(t, {contract, files})});
  assert.deepEqual(codes(missingContract), ['missing-resource']);
  assert.match(finding(missingContract, 'resources[0] domain-contract').message, /declared existing but was not found/);

  const root = repo(t, {contract, files: [...files, 'docs/agents/domain.md']});
  const report = checkRepository({repo: root, artifacts: ['docs/adr/0001-record.md']});
  assert.equal(report.status, 'passed', JSON.stringify(report.findings));
  assert.equal(finding(report, 'resources[3] verification', 'note').code, 'future');
  assert.match(finding(report, 'resources[4] tracker', 'unverified').message, /UNVERIFIED/);
  assert.equal(finding(report, 'resources[5] evidence-retention', 'gap').code, 'unconfigured');
  assert.equal(finding(report, 'docs/adr/0001-record.md', 'ok').code, 'resource', 'decision records keep their own names');
  assert.match(run(['--repo', root], root).stdout, /result: PASSED; 1 external reference UNVERIFIED/);

  const wrongType = checkRepository({repo: repo(t, {contract: base({resources: [{role: 'domain-docs', state: 'existing', type: 'directory', path: 'CONTEXT.md'}]}), files: ['CONTEXT.md']})});
  assert.deepEqual(codes(wrongType), ['wrong-type']);

  const unconfigured = checkRepository({repo: repo(t, {contract: base()})});
  assert.equal(unconfigured.status, 'passed');
  assert.equal(finding(unconfigured, 'domain-contract', 'gap').code, 'unconfigured');
});

test('multi-phase plans are declared, not inferred, and stay pending', t => {
  const files = ['docs/work/core-gh-1/launch.multiphase.plan.md', 'docs/work/core-gh-1/launch.plan.md', 'docs/work/old/program.md'];
  const contract = base({
    multiphasePlan: 'docs/work/<work-key>/<topic>.multiphase.plan.md',
    canonical: [{work: 'old', kind: 'plan', owner: 'sidkik/core', path: 'docs/work/old/program.md', reason: 'legacy program', multiphase: true}],
  });
  const root = repo(t, {contract, files});
  const report = checkRepository({repo: root, artifacts: files});
  assert.equal(report.status, 'passed', JSON.stringify(report.findings));
  const pending = report.findings.filter(f => f.level === 'pending').map(f => f.subject);
  assert.deepEqual(pending.sort(), [files[0], files[2]].sort());
  assert.ok(!pending.includes(files[1]), 'an ordinary plan is not sent to check-plan.mjs');
  assert.match(finding(report, files[0], 'pending').message, new RegExp(`skills/poteto-mode/scripts/check-plan\\.mjs ${path.join(root, files[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(run(['--repo', root, ...files, files[0], files[2]], os.tmpdir()).stdout, /PASSED with 2 plan content checks PENDING/, 'a repeated argument is checked once');

  const untouched = checkRepository({repo: root, artifacts: [files[1]]});
  assert.equal(untouched.status, 'passed');
  assert.deepEqual(codes(untouched, 'pending'), [], 'an unsupplied canonical multi-phase plan needs no validation');
  assert.match(run(['--repo', root], os.tmpdir()).stdout, /^result: PASSED$/m);
});

test('symbolic links cannot lead outside the repository', t => {
  const outside = tmp(t);
  write(path.join(outside, 'secret.plan.md'));
  fs.mkdirSync(path.join(outside, 'dir'));

  const root = repo(t, {contract: base({destinations: {plan: 'ext/<work-key>/<topic>.plan.md'}})});
  fs.mkdirSync(path.join(root, 'docs/work/core-gh-1'), {recursive: true});
  fs.symlinkSync(path.join(outside, 'secret.plan.md'), path.join(root, 'docs/work/core-gh-1/leak.research.md'));
  fs.symlinkSync(path.join(outside, 'dir'), path.join(root, 'ext'));
  const report = checkRepository({repo: root, artifacts: ['docs/work/core-gh-1/leak.research.md']});
  assert.equal(finding(report, 'docs/work/core-gh-1/leak.research.md').code, 'symlink-escape');
  assert.equal(finding(report, 'destinations.plan').code, 'symlink-escape', 'a future destination behind an escaping ancestor');

  const rootLink = repo(t, {contract: base()});
  fs.symlinkSync(path.join(outside, 'dir'), path.join(rootLink, 'docs/work'));
  assert.equal(finding(checkRepository({repo: rootLink}), 'workRoot').code, 'symlink-escape');

  const configLink = repo(t);
  write(path.join(outside, 'pstack-docs.md'), document(base()));
  fs.mkdirSync(path.join(configLink, 'docs/agents'), {recursive: true});
  fs.symlinkSync(path.join(outside, 'pstack-docs.md'), path.join(configLink, 'docs/agents/pstack-docs.md'));
  assert.deepEqual(codes(checkRepository({repo: configLink})), ['symlink-escape']);

  const inner = repo(t, {contract: base(), files: ['docs/work/core-gh-1/real.plan.md']});
  fs.symlinkSync('real.plan.md', path.join(inner, 'docs/work/core-gh-1/alias.plan.md'));
  assert.equal(checkRepository({repo: inner, artifacts: ['docs/work/core-gh-1/alias.plan.md']}).status, 'passed', 'links inside the repository are allowed');
});

test('the repository argument, not the working directory, selects what is checked', t => {
  const good = repo(t, {contract: base(), files: ['docs/work/core-gh-1/auth.plan.md']});
  const decoy = repo(t, {contract: base({destinations: {plan: 'elsewhere/<work-key>/<topic>.plan.md'}}), files: ['docs/work/core-gh-1/auth.plan.md']});
  for (const cwd of [decoy, path.join(decoy, 'docs'), os.tmpdir()]) {
    const result = run(['--repo', good, 'docs/work/core-gh-1/auth.plan.md'], cwd);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(`pstack-docs: ${good.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(sidkik/core\\)`));
  }
  assert.equal(run(['--repo', decoy, 'docs/work/core-gh-1/auth.plan.md'], good).status, 1);
  assert.equal(run(['docs/work/core-gh-1/auth.plan.md'], good).status, 2, '--repo is required');
  assert.equal(run(['--repo', 'repo'], path.dirname(good)).status, 2, '--repo must be absolute');
  assert.equal(run(['--repo', good, '--strict'], good).status, 2);
});

test('shipped contract examples check in a fixture repository', t => {
  const reference = fs.readFileSync(path.join(plugin, 'skills/work-artifacts/references/contract.md'), 'utf8');
  const example = extractContract(reference);
  const bound = 'docs/work/items/core-gh-541-price-payment-terms/fees.research.md';
  const root = repo(t, {contract: example, files: ['docs/agents/domain.md', 'CONTEXT-MAP.md', 'docs/adr/0001-a.md', '.claude/skills/verify-core/SKILL.md', 'docs/work/billing/c11-subscriptions.md', 'docs/work/README.md', bound]});
  const report = checkRepository({repo: root, artifacts: ['docs/work/billing/c11-subscriptions.md', 'docs/adr/0001-a.md', 'docs/work/README.md', bound]});
  assert.equal(report.status, 'passed', JSON.stringify(report.findings));

  const setup = fs.readFileSync(path.join(plugin, 'skills/setup-documentation/SKILL.md'), 'utf8');
  const seed = extractContract(setup);
  assert.match(checkRepository({repo: repo(t, {contract: seed})}).findings.map(f => f.message).join('\n'), /seed placeholder/);
  const configured = checkRepository({repo: repo(t, {contract: {...seed, repository: 'sidkik/web-platform'}, files: ['docs/work/wp-1/a.spec.md']}), artifacts: ['docs/work/wp-1/a.spec.md']});
  assert.equal(configured.status, 'passed', JSON.stringify(configured.findings));

  for (const kind of KINDS) assert.match(reference, new RegExp(`\`${kind}\``), `contract reference documents ${kind}`);
});

test('nested work directories are bound explicitly and the flat default is not a second location', t => {
  const payment = 'docs/work/items/core-gh-541-price-payment-terms';
  const process = 'docs/work/agent-orchestration/items/core-gh-512-process-enablement';
  const kept = [`${payment}/2026-09-30-installment-fee-legal.research.md`, `${payment}/summary.md`, `${process}/core-distribution.plan.md`];
  const added = [`${payment}/late-fees.research.md`, `${payment}/2026-10-25-1.evidence.md`, `${process}/rollout.multiphase.plan.md`, 'docs/work/core-gh-9/cache.plan.md'];
  const flat = ['docs/work/core-gh-541/late-fees.research.md', 'docs/work/core-gh-512/rollout.plan.md'];
  const contract = base({
    works: {'core-gh-541': payment, 'core-gh-512': process},
    multiphasePlan: 'docs/work/<work-key>/<topic>.multiphase.plan.md',
    canonical: [
      {work: 'core-gh-541', kind: 'research', owner: 'sidkik/core', path: `${payment}/summary.md`, reason: 'named before typed filenames'},
      {work: 'core-gh-541', kind: 'research', owner: 'sidkik/core', path: kept[0], reason: 'established research'},
    ],
  });
  const root = repo(t, {contract, files: [...kept, ...added, ...flat]});
  const report = checkRepository({repo: root, artifacts: [...kept, ...added, ...flat]});
  assert.deepEqual(codes(report), ['wrong-location', 'wrong-location'], JSON.stringify(report.findings));
  assert.equal(finding(report, kept[1], 'ok').code, 'canonical', 'a legacy name keeps its own name');
  assert.match(finding(report, kept[2], 'ok').message, /plan for core-gh-512 in docs\/work\/agent-orchestration\/items\/core-gh-512-process-enablement/);
  for (const file of added) assert.equal(finding(report, file, 'ok').code, 'destination', `${file} is a new record`);
  assert.equal(finding(report, added[2], 'pending').code, 'plan-content', 'the multi-phase file name applies inside the bound directory');
  assert.match(finding(report, flat[0]).message, /core-gh-541 is bound to docs\/work\/items\/core-gh-541-price-payment-terms in works; write its research records there as <topic>\.research\.md/);
  assert.equal(finding(report, 'works.core-gh-541', 'ok').code, 'work');

  const scoped = base({works: {'core-gh-512': process}, external: [{work: 'core-gh-512', kinds: ['plan'], repository: 'sidkik/planning', path: 'plans/core-gh-512', reason: 'shared plan'}]});
  const scopedReport = checkRepository({repo: repo(t, {contract: scoped, files: [`${process}/rollout.plan.md`, `${process}/notes.research.md`]}), artifacts: [`${process}/rollout.plan.md`, `${process}/notes.research.md`]});
  assert.deepEqual(codes(scopedReport), ['wrong-owner'], 'external scopes still bind a work in its bound directory');
});

test('work bindings must be distinct, unnested and not another work directory', t => {
  const cases = [
    [{works: {a: 'docs/work/items/a', b: 'docs/work/items/a'}}, 'duplicate-authority', /already bound to a/],
    [{works: {a: 'docs/work/items/a', b: 'docs/work/items/a/b'}}, 'ambiguous-rule', /are nested/],
    [{works: {'core-gh-541': 'docs/work/core-gh-541-terms'}}, 'ambiguous-rule', /directory of work core-gh-541-terms/],
    [{works: {'Core GH': 'docs/x'}}, 'invalid-contract', /works\.Core GH/],
    [{works: {a: '../outside'}}, 'invalid-path', /"\." or "\.\."/],
    [{works: ['docs/x']}, 'invalid-contract', /contract\.works/],
    [{works: {a: 'docs/items/a'}, destinations: {plan: 'docs/plans/<work-key>/<topic>.md', research: 'docs/research/<work-key>/<topic>.md'}}, 'ambiguous-rule', /bound in works/],
    [{works: {a: 'docs/items/a'}, resources: [{role: 'runbooks', state: 'existing', type: 'directory', path: 'docs/items'}]}, 'ambiguous-rule', /works\.a docs\/items\/a/],
  ];
  for (const [extra, code, pattern] of cases) {
    const report = checkRepository({repo: repo(t, {contract: base(extra), files: ['docs/items/x.md']})});
    assert.equal(report.status, 'failed', JSON.stringify(extra));
    assert.ok(report.findings.some(f => f.code === code && pattern.test(`${f.subject} ${f.message}`)), `${JSON.stringify(extra)} -> ${JSON.stringify(report.findings)}`);
  }
  const file = checkRepository({repo: repo(t, {contract: base({works: {a: 'docs/items/x.md'}}), files: ['docs/items/x.md']})});
  assert.equal(finding(file, 'works.a').code, 'wrong-type');
  const future = checkRepository({repo: repo(t, {contract: base({works: {a: 'docs/items/a'}})})});
  assert.equal(future.status, 'passed');
  assert.equal(finding(future, 'works.a', 'note').code, 'future');
});

test('resources overlap work records only where a destination can actually name a file', t => {
  const accepted = [
    {role: 'index', state: 'existing', type: 'file', path: 'docs/work/README.md'},
    {role: 'index', state: 'existing', type: 'file', path: 'docs/work/core-gh-1/README.md'},
    {role: 'runbooks', state: 'destination', type: 'directory', path: 'docs/runbooks'},
    {role: 'domain-docs', state: 'destination', type: 'file', path: 'GLOSSARY.md'},
    {role: 'architecture', state: 'existing', type: 'directory', path: 'docs/work-notes'},
  ];
  const files = ['docs/work/README.md', 'docs/work/core-gh-1/README.md', 'docs/runbooks/deploy.md', 'GLOSSARY.md', 'docs/work-notes/a.md', 'docs/work/core-gh-1/auth.plan.md'];
  const report = checkRepository({repo: repo(t, {contract: base({resources: accepted}), files}), artifacts: files});
  assert.equal(report.status, 'passed', JSON.stringify(report.findings));
  for (const file of files.slice(0, 5)) assert.equal(finding(report, file, 'ok').code, 'resource', `${file} follows its resource`);
  assert.equal(finding(report, files[5], 'ok').code, 'destination');

  const rejected = [
    [{role: 'index', state: 'existing', type: 'file', path: 'docs/work/core-gh-1/index.plan.md'}, /is itself a plan destination/],
    [{role: 'runbooks', state: 'existing', type: 'directory', path: 'docs/work'}, /can contain research records/],
    [{role: 'decision-records', state: 'destination', type: 'directory', path: 'docs/work/adr'}, /can contain research records/],
    [{role: 'verification', state: 'destination', type: 'directory', path: 'docs/work/core-gh-1'}, /can contain research records/],
  ];
  for (const [resource, pattern] of rejected) {
    const result = checkRepository({repo: repo(t, {contract: base({resources: [resource]}), files: ['docs/work/core-gh-1/index.plan.md']})});
    assert.equal(result.status, 'failed', resource.path);
    assert.match(finding(result, 'docs/agents/pstack-docs.md resources[0]').message, pattern);
  }

  const bound = {works: {a: 'docs/items/a'}};
  const displaced = [
    {role: 'architecture', state: 'existing', type: 'directory', path: 'docs/work/a'},
    {role: 'index', state: 'existing', type: 'file', path: 'docs/work/a/legacy.plan.md'},
  ];
  const legacy = repo(t, {contract: base({...bound, resources: displaced}), files: ['docs/work/a/legacy.plan.md', 'docs/work/a/notes.md']});
  const legacyReport = checkRepository({repo: legacy, artifacts: ['docs/work/a/legacy.plan.md', 'docs/work/a/notes.md']});
  assert.equal(legacyReport.status, 'passed', JSON.stringify(legacyReport.findings));
  assert.equal(finding(legacyReport, 'docs/work/a/legacy.plan.md', 'ok').code, 'resource', 'a bound work\'s displaced default directory is not an active destination');
  const active = [
    [{role: 'architecture', state: 'existing', type: 'directory', path: 'docs/work/b'}, /can contain research records under default research destination/],
    [{role: 'index', state: 'existing', type: 'file', path: 'docs/work/b/legacy.plan.md'}, /is itself a plan destination under default plan destination/],
    [{role: 'architecture', state: 'existing', type: 'directory', path: 'docs/items/a'}, /under works\.a docs\/items\/a/],
    [{role: 'index', state: 'existing', type: 'file', path: 'docs/items/a/legacy.plan.md'}, /is itself a plan destination under works\.a/],
    [{role: 'runbooks', state: 'existing', type: 'directory', path: 'docs/work'}, /can contain research records/],
  ];
  for (const [resource, pattern] of active) {
    const result = checkRepository({repo: repo(t, {contract: base({...bound, resources: [resource]}), files: [`${resource.path}${resource.type === 'directory' ? '/x.md' : ''}`]})});
    assert.equal(result.status, 'failed', resource.path);
    assert.match(finding(result, 'docs/agents/pstack-docs.md resources[0]').message, pattern, resource.path);
  }
  const sameDir = checkRepository({repo: repo(t, {contract: base({works: {a: 'docs/work/a'}, resources: [displaced[0]]}), files: ['docs/work/a/x.md']})});
  assert.equal(sameDir.status, 'failed', 'a work bound to its default directory still writes there');

  const undeclared = checkRepository({repo: repo(t, {contract: base(), files: ['docs/work/README.md']}), artifacts: ['docs/work/README.md']});
  assert.equal(finding(undeclared, 'docs/work/README.md').code, 'unmatched-artifact', 'an index needs an explicit resource');
});

test('prototype names are ordinary unknown values on the command line', t => {
  const cases = [
    [base({resources: [{role: 'domain-docs', state: 'constructor', type: 'file', path: 'a.md'}]}), /resources\[0\]\.state: must be one of/],
    [base({resources: [{role: 'domain-docs', state: 'toString'}]}), /resources\[0\]\.state: must be one of/],
    [base({resources: [{role: 'domain-docs', state: '__proto__'}]}), /resources\[0\]\.state: must be one of/],
    [base({resources: [{role: 'constructor', state: 'unconfigured'}]}), /resources\[0\]\.role: must be one of/],
    [base({destinations: {plan: 'docs/<work-key>/<constructor>.plan.md'}}), /unknown token <constructor>/],
    [base({destinations: {plan: 'docs/<work-key>/<toString>.plan.md'}}), /unknown token <toString>/],
    [base({destinations: {constructor: 'docs/<work-key>/<topic>.plan.md'}}), /destinations\.constructor: is not an artifact kind/],
  ];
  const cwd = tmp(t);
  for (const [contract, pattern] of cases) {
    const result = run(['--repo', repo(t, {contract})], cwd);
    assert.equal(result.status, 1, `${JSON.stringify(contract)}\n${result.stdout}${result.stderr}`);
    assert.equal(result.stderr, '', 'no crash');
    assert.match(result.stdout, /^ERROR /m);
    assert.match(result.stdout, pattern);
  }
  const proto = run(['--repo', repo(t, {raw: document('{"version": 1, "repository": "sidkik/core", "workRoot": "docs/work", "works": {"__proto__": "docs/x"}}')})], cwd);
  assert.equal(proto.status, 1, proto.stdout + proto.stderr);
  assert.equal(proto.stderr, '');
  assert.match(proto.stdout, /works\.__proto__: must be one work key/);
});

test('one path cannot be canonical for two owners', t => {
  const shared = 'docs/work/roadmap/program.md';
  const contract = base({canonical: [
    {work: 'roadmap', kind: 'plan', owner: 'sidkik/core', path: shared, reason: 'local copy'},
    {work: 'roadmap', kind: 'plan', owner: 'sidkik/planning', path: shared, reason: 'shared roadmap'},
  ]});
  const root = repo(t, {contract, files: [shared]});
  const result = run(['--repo', root, shared], tmp(t));
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /ERROR ambiguous-ownership docs\/agents\/pstack-docs\.md canonical\[1\]: docs\/work\/roadmap\/program\.md is also declared canonical for sidkik\/core/);
  assert.doesNotMatch(result.stdout, /OK canonical/, 'the local entry does not hide the competing owner');

  const external = base({canonical: [{work: 'roadmap', kind: 'plan', owner: 'sidkik/planning', path: shared, reason: 'shared roadmap'}]});
  const unverified = run(['--repo', repo(t, {contract: external})], tmp(t));
  assert.equal(unverified.status, 0, unverified.stdout);
  assert.match(unverified.stdout, /UNVERIFIED external docs\/agents\/pstack-docs\.md canonical\[0\]|UNVERIFIED external canonical\[0\]/);
});

test('unconfigured fallback guidance matches the checker', t => {
  const bare = repo(t, {pointer: false, files: ['docs/work/core-gh-1/auth.plan.md']});
  const quiet = run(['--repo', bare], tmp(t));
  assert.equal(quiet.status, 0);
  assert.match(quiet.stdout, /nothing was validated/);
  const loud = run(['--repo', bare, 'docs/work/core-gh-1/auth.plan.md'], tmp(t));
  assert.equal(loud.status, 1);
  assert.match(loud.stdout, /run the checker without artifacts and report the records as not validated/);

  const skill = fs.readFileSync(path.join(plugin, 'skills/work-artifacts/SKILL.md'), 'utf8');
  const handoff = skill.slice(skill.indexOf('## Check before handoff'));
  assert.match(handoff, /without artifacts/);
  assert.match(handoff, /not validated/);
  assert.match(handoff, /does not authorize setup|not authorize[^.]*setup/);
  const readme = fs.readFileSync(path.join(plugin, 'README.md'), 'utf8');
  assert.match(readme, /not validated/);
});
