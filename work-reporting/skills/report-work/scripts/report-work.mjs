#!/usr/bin/env node
// Report the agent's current work to the session supervisor.
// Node stdlib only. Reads SIDKIK_WORK_REPORT_URL and SIDKIK_WORK_REPORT_TOKEN.
// Exit codes: 0 reported, 1 delivery failed or rejected, 2 usage or environment error.
import http from 'node:http';
import https from 'node:https';
import { parseArgs } from 'node:util';

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 16 * 1024;
const MAX_EVIDENCE = 16;
const MAX_VALUE_BYTES = 2048;

const USAGE = `usage: report-work.mjs [--title T] [--kind K] [--project P] [--process-ref R]
                      [--activity A] [--issue-url U] [--board-url U] [--evidence L]...
Supply at least one flag. --evidence may repeat, at most 16 times.
Each value is at most 2048 bytes (UTF-8); the whole report is at most 16 KiB.
Requires SIDKIK_WORK_REPORT_URL and SIDKIK_WORK_REPORT_TOKEN in the environment.`;

function fail(code, message) {
  process.stderr.write(`report-work: ${message}\n`);
  process.exit(code);
}

let parsed;
try {
  parsed = parseArgs({
    options: {
      title: { type: 'string' },
      kind: { type: 'string' },
      project: { type: 'string' },
      'process-ref': { type: 'string' },
      activity: { type: 'string' },
      'issue-url': { type: 'string' },
      'board-url': { type: 'string' },
      evidence: { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });
} catch (err) {
  fail(2, `${err.message}\n${USAGE}`);
}
const v = parsed.values;
if (v.help) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(0);
}

const url = process.env.SIDKIK_WORK_REPORT_URL;
const token = process.env.SIDKIK_WORK_REPORT_TOKEN;
const missing = [];
if (!url) missing.push('SIDKIK_WORK_REPORT_URL');
if (!token) missing.push('SIDKIK_WORK_REPORT_TOKEN');
if (missing.length > 0) {
  fail(
    2,
    `${missing.join(' and ')} not set. This session has no work-report endpoint, so nothing was reported. The supervisor injects these variables into a native session it launches.`,
  );
}

let target;
try {
  target = new URL(url);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error('unsupported scheme');
} catch {
  fail(2, 'SIDKIK_WORK_REPORT_URL is not a valid http(s) URL.');
}

const body = {};
const fields = [
  ['title', v.title],
  ['kind', v.kind],
  ['project', v.project],
  ['processRef', v['process-ref']],
  ['activity', v.activity],
  ['issueUrl', v['issue-url']],
  ['boardUrl', v['board-url']],
];
for (const [key, value] of fields) {
  if (value !== undefined && value !== '') body[key] = value;
}
const evidence = (v.evidence ?? []).filter((l) => l !== '');
if (evidence.length > 0) body.evidenceLinks = evidence;
if (Object.keys(body).length === 0) fail(2, `no report fields given.\n${USAGE}`);

const flagNames = ['--title', '--kind', '--project', '--process-ref', '--activity', '--issue-url', '--board-url'];
const labelled = [...fields.map(([, value], i) => [flagNames[i], value]), ...(body.evidenceLinks ?? []).map((l) => ['--evidence', l])];
if ((body.evidenceLinks ?? []).length > MAX_EVIDENCE) {
  fail(2, `${body.evidenceLinks.length} --evidence values given; the limit is ${MAX_EVIDENCE}. Keep the most relevant links.`);
}
for (const [flag, value] of labelled) {
  const size = value === undefined ? 0 : Buffer.byteLength(value, 'utf8');
  if (size > MAX_VALUE_BYTES) fail(2, `${flag} value is ${size} bytes; the limit is ${MAX_VALUE_BYTES}. Shorten it.`);
}

const payload = Buffer.from(JSON.stringify(body), 'utf8');
if (payload.length > MAX_BODY_BYTES) {
  fail(2, `report is ${payload.length} bytes; the limit is ${MAX_BODY_BYTES}. Shorten the activity or evidence.`);
}

const scrub = (text) => (token ? text.split(token).join('[redacted]') : text);

const client = target.protocol === 'https:' ? https : http;
const req = client.request(
  target,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
      Authorization: `Bearer ${token}`,
    },
    timeout: TIMEOUT_MS,
  },
  (res) => {
    const chunks = [];
    let size = 0;
    res.on('data', (chunk) => {
      size += chunk.length;
      if (size <= 4096) chunks.push(chunk);
    });
    res.on('end', () => {
      const text = scrub(Buffer.concat(chunks).toString('utf8').trim());
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const label = body.title ?? body.activity ?? 'work report';
        process.stdout.write(`reported: ${label} (HTTP ${res.statusCode})\n`);
        process.exit(0);
      }
      const hint = res.statusCode === 401 ? ' The session token is unknown or revoked; this session can no longer report.' : '';
      fail(1, `supervisor rejected the report: HTTP ${res.statusCode}${text ? ` ${text}` : ''}.${hint}`);
    });
  },
);
req.on('timeout', () => req.destroy(new Error(`no response within ${TIMEOUT_MS / 1000}s`)));
req.on('error', (err) => fail(1, scrub(`could not deliver the report: ${err.message}`)));
req.end(payload);
