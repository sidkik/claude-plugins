import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(pluginRoot, '..');
const script = join(pluginRoot, 'skills', 'report-work', 'scripts', 'report-work.mjs');
const TOKEN = 'tok-secret-0123456789';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function run(args, env) {
  const clean = { PATH: process.env.PATH, ...env };
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { env: clean });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function server(handler) {
  return new Promise((resolve) => {
    const received = [];
    const srv = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const record = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') };
        received.push(record);
        handler(record, res);
      });
    });
    srv.listen(0, '127.0.0.1', () => {
      resolve({ srv, received, url: `http://127.0.0.1:${srv.address().port}/v1/report` });
    });
  });
}

test('manifest names the plugin its directory holds', () => {
  const manifest = readJson(join(pluginRoot, '.claude-plugin', 'plugin.json'));
  assert.equal(manifest.name, 'work-reporting');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.ok(manifest.description);
});

test('marketplace lists the plugin once at a resolvable source', () => {
  const { plugins } = readJson(join(repoRoot, '.claude-plugin', 'marketplace.json'));
  const matches = plugins.filter((p) => p.name === 'work-reporting');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].source, './work-reporting');
  assert.ok(existsSync(join(repoRoot, matches[0].source, '.claude-plugin', 'plugin.json')));
  assert.equal(matches[0].version, readJson(join(pluginRoot, '.claude-plugin', 'plugin.json')).version);
});

test('report-work skill is model-invoked, named for its directory, and points at the script', () => {
  const text = readFileSync(join(pluginRoot, 'skills', 'report-work', 'SKILL.md'), 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fm);
  assert.match(fm[1], /^name: report-work$/m);
  assert.match(fm[1], /^description: .+/m);
  assert.doesNotMatch(fm[1], /disable-model-invocation:\s*true/);
  assert.ok(text.includes('scripts/report-work.mjs'));
  assert.ok(existsSync(script));
});

test('sends identity header and a protojson-shaped body, then prints a receipt', async () => {
  const { srv, received, url } = await server((_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  try {
    const r = await run(
      [
        '--title', 'Fix login', '--kind', 'troubleshooting', '--project', 'core',
        '--process-ref', 'https://example.test/p', '--activity', 'reading logs',
        '--issue-url', 'https://github.com/o/r/issues/1',
        '--board-url', 'https://github.com/orgs/o/projects/2',
        '--evidence', 'https://e/1', '--evidence', 'https://e/2',
      ],
      { SIDKIK_WORK_REPORT_URL: url, SIDKIK_WORK_REPORT_TOKEN: TOKEN },
    );
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /^reported: Fix login \(HTTP 200\)/);
    assert.ok(!r.stdout.includes(TOKEN) && !r.stderr.includes(TOKEN));
    assert.equal(received.length, 1);
    const [req] = received;
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/v1/report');
    assert.equal(req.headers.authorization, `Bearer ${TOKEN}`);
    assert.match(req.headers['content-type'], /application\/json/);
    assert.deepEqual(JSON.parse(req.body), {
      title: 'Fix login',
      kind: 'troubleshooting',
      project: 'core',
      processRef: 'https://example.test/p',
      activity: 'reading logs',
      issueUrl: 'https://github.com/o/r/issues/1',
      boardUrl: 'https://github.com/orgs/o/projects/2',
      evidenceLinks: ['https://e/1', 'https://e/2'],
    });
  } finally {
    srv.close();
  }
});

test('omits flags that were not given and never sends identity fields', async () => {
  const { srv, received, url } = await server((_, res) => res.end('{}'));
  try {
    const r = await run(['--activity', 'waiting on review'], { SIDKIK_WORK_REPORT_URL: url, SIDKIK_WORK_REPORT_TOKEN: TOKEN });
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(JSON.parse(received[0].body), { activity: 'waiting on review' });
  } finally {
    srv.close();
  }
});

test('missing environment exits 2 with clear text and sends nothing', async () => {
  const r = await run(['--title', 't'], {});
  assert.equal(r.code, 2);
  assert.match(r.stderr, /SIDKIK_WORK_REPORT_URL and SIDKIK_WORK_REPORT_TOKEN not set/);
  assert.match(r.stderr, /nothing was reported/);
  const onlyToken = await run(['--title', 't'], { SIDKIK_WORK_REPORT_TOKEN: TOKEN });
  assert.equal(onlyToken.code, 2);
  assert.match(onlyToken.stderr, /SIDKIK_WORK_REPORT_URL not set/);
  assert.ok(!onlyToken.stderr.includes(TOKEN));
});

test('no fields exits 2', async () => {
  const r = await run([], { SIDKIK_WORK_REPORT_URL: 'http://127.0.0.1:9/v1/report', SIDKIK_WORK_REPORT_TOKEN: TOKEN });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /no report fields/);
});

test('401 exits 1 and explains a revoked session without echoing the token', async () => {
  const { srv, url } = await server((_, res) => {
    res.writeHead(401);
    res.end(`unauthorized ${TOKEN}`);
  });
  try {
    const r = await run(['--title', 't'], { SIDKIK_WORK_REPORT_URL: url, SIDKIK_WORK_REPORT_TOKEN: TOKEN });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /HTTP 401/);
    assert.match(r.stderr, /unknown or revoked/);
    assert.ok(!r.stderr.includes(TOKEN));
  } finally {
    srv.close();
  }
});

test('unreachable endpoint exits 1', async () => {
  const { srv, url } = await server((_, res) => res.end());
  srv.close();
  await new Promise((r) => srv.once('close', r));
  const r = await run(['--title', 't'], { SIDKIK_WORK_REPORT_URL: url, SIDKIK_WORK_REPORT_TOKEN: TOKEN });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /could not deliver/);
});

const ENV = (url) => ({ SIDKIK_WORK_REPORT_URL: url, SIDKIK_WORK_REPORT_TOKEN: TOKEN });

test('16 evidence values are accepted and 17 are rejected before any request', async () => {
  const { srv, received, url } = await server((_, res) => res.end('{}'));
  try {
    const flags = (n) => Array.from({ length: n }, (_, i) => ['--evidence', `https://e/${i}`]).flat();
    const ok = await run(flags(16), ENV(url));
    assert.equal(ok.code, 0, ok.stderr);
    assert.equal(JSON.parse(received[0].body).evidenceLinks.length, 16);
    const bad = await run(flags(17), ENV(url));
    assert.equal(bad.code, 2);
    assert.match(bad.stderr, /17 --evidence values given; the limit is 16/);
    assert.equal(received.length, 1);
  } finally {
    srv.close();
  }
});

test('a 2048-byte value is accepted and 2049 bytes is rejected, for flags and evidence', async () => {
  const { srv, received, url } = await server((_, res) => res.end('{}'));
  try {
    const ok = await run(['--activity', 'x'.repeat(2048), '--evidence', 'y'.repeat(2048)], ENV(url));
    assert.equal(ok.code, 0, ok.stderr);
    for (const flag of ['--title', '--kind', '--project', '--process-ref', '--activity', '--issue-url', '--board-url', '--evidence']) {
      const bad = await run([flag, 'z'.repeat(2049)], ENV(url));
      assert.equal(bad.code, 2, flag);
      assert.match(bad.stderr, new RegExp(`${flag.replace(/-/g, '\\-')} value is 2049 bytes; the limit is 2048`));
    }
    assert.equal(received.length, 1);
  } finally {
    srv.close();
  }
});

test('the limit counts UTF-8 bytes, not characters', async () => {
  const { srv, received, url } = await server((_, res) => res.end('{}'));
  try {
    const bad = await run(['--activity', '\u00e9'.repeat(1025)], ENV(url));
    assert.equal(bad.code, 2);
    assert.match(bad.stderr, /2050 bytes/);
    assert.equal(received.length, 0);
  } finally {
    srv.close();
  }
});

test('a report over 16 KiB in total exits 2 before any request', async () => {
  const { srv, received, url } = await server((_, res) => res.end());
  try {
    const args = Array.from({ length: 16 }, () => ['--evidence', 'w'.repeat(2048)]).flat();
    const r = await run(args, ENV(url));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /limit is 16384/);
    assert.equal(received.length, 0);
  } finally {
    srv.close();
  }
});

test('empty --evidence values are not report fields', async () => {
  const { srv, received, url } = await server((_, res) => res.end('{}'));
  try {
    for (const args of [['--evidence', ''], ['--evidence', '', '--evidence', ''], ['--title', '']]) {
      const r = await run(args, ENV(url));
      assert.equal(r.code, 2, args.join(' '));
      assert.match(r.stderr, /no report fields/);
    }
    const mixed = await run(['--activity', 'a', '--evidence', '', '--evidence', 'https://e/1'], ENV(url));
    assert.equal(mixed.code, 0, mixed.stderr);
    assert.deepEqual(JSON.parse(received[0].body), { activity: 'a', evidenceLinks: ['https://e/1'] });
    assert.equal(received.length, 1);
  } finally {
    srv.close();
  }
});
