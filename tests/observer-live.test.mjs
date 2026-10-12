import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import {
  createViewer,
  inspectTranscript,
  ownerOptions,
  resolveOwner,
} from "../sdlc-process/scripts/observer-live.mjs";

const sid = "627631fd-9a38-4516-88af-44787f3268e8",
  tid = "a2166e41509ef8cdd";
function fixture(t) {
  // Real path: macOS tmpdir sits behind /var -> /private/var; ancestor symlinks have their own test.
  const dir = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "observer-view-"),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, `${sid}.jsonl`);
  return {
    dir,
    file,
    append: (o) =>
      fs.appendFileSync(
        file,
        typeof o === "string" ? o + "\n" : JSON.stringify(o) + "\n",
      ),
  };
}

test("same-session viewer stays reusable while native evidence is pending and later arrives", async (t) => {
  const f = fixture(t);
  f.append({type: "user", sessionId: sid, message: {content: "Prepare this session"}});
  const v = createViewer({transcriptPath: f.file, sessionId: sid});
  await new Promise((r) => v.server.listen(0, "127.0.0.1", r));
  t.after(() => v.server.close());
  const base = `http://127.0.0.1:${v.server.address().port}/${v.cap}/`;
  let state = await fetch(base + "state").then((r) => r.json());
  assert.equal(state.sessionId, sid);
  assert.equal(state.coverage, "complete");
  assert.equal(state.launch, null);
  assert.equal(state.observerActivity, null);
  assert.deepEqual(state.reports, []);
  f.append({type: "observer-ref", sessionId: sid, observerAgentType: "sidkik-sdlc-observer", observerTaskId: tid, timestamp: "2026-01-01T00:00:03Z"});
  state = await fetch(base + "state").then((r) => r.json());
  assert.equal(state.sessionId, sid);
  assert.equal(state.launch.observerTaskId, tid);
  assert.equal(state.launch.evidence, "native-observer-ref");
  assert.equal((await fetch(base + "stop", {method: "POST"})).status, 202);
  assert.deepEqual(fs.readdirSync(f.dir), [`${sid}.jsonl`]);
});

test("HTTP view follows appended unique native delivery without hidden thinking or archives", async (t) => {
  const f = fixture(t);
  f.append({
    type: "user",
    uuid: "11111111-1111-1111-1111-111111111111",
    sessionId: sid,
    origin: {
      kind: "observer",
      from: "observer:sidkik-sdlc-observer",
      senderTaskId: tid,
    },
    timestamp: "2026-01-01T00:00:00Z",
    message: { content: "finding" },
  });
  f.append({
    type: "assistant",
    uuid: "22222222-2222-2222-2222-222222222222",
    sessionId: sid,
    timestamp: "2026-01-01T00:00:02Z",
    message: {
      content: [
        { type: "thinking", thinking: "secret" },
        { type: "text", text: "acknowledged only" },
      ],
    },
  });
  assert.equal(inspectTranscript(f.file, sid).reports.length, 1);
  f.append({
    type: "observer-ref",
    observerTaskId: tid,
    observerAgentType: "sidkik-sdlc-observer",
    timestamp: "2026-01-01T00:00:03Z",
  });
  f.append({
    type: "user",
    uuid: "11111111-1111-1111-1111-111111111111",
    sessionId: sid,
    origin: {
      kind: "observer",
      from: "observer:sidkik-sdlc-observer",
      senderTaskId: tid,
    },
    message: { content: "duplicate" },
  });
  const v = createViewer({ transcriptPath: f.file, sessionId: sid });
  await new Promise((r) => v.server.listen(0, "127.0.0.1", r));
  t.after(() => v.server.close());
  const base = `http://127.0.0.1:${v.server.address().port}/${v.cap}/`;
  let state = await fetch(base + "state").then((r) => r.json());
  assert.equal(state.reports.length, 1);
  assert.doesNotMatch(JSON.stringify(state), /secret/);
  assert.equal(state.assessments.length, 0);
  f.append({
    type: "assistant",
    uuid: "33333333-3333-3333-3333-333333333333",
    sessionId: sid,
    timestamp: "2026-01-01T00:00:04Z",
    message: {
      content: [
        {
          type: "tool_use",
          name: "Read",
          input: { file_path: "/secret/path" },
        },
      ],
    },
  });
  f.append({
    type: "user",
    uuid: "44444444-4444-4444-4444-444444444444",
    sessionId: sid,
    timestamp: "2026-01-01T00:00:05Z",
    message: { content: [{ type: "tool_result", content: "secret result" }] },
  });
  state = await fetch(base + "state").then((r) => r.json());
  assert.equal(state.reports[0].actions.length, 3);
  assert.doesNotMatch(JSON.stringify(state), /secret\/path|secret result/);
  const response = await fetch(base + "assess", {
    method: "POST",
    body: JSON.stringify({
      reportUuid: state.reports[0].uuid,
      outcome: "corrected",
      assessorIdentity: "agent-1",
      assessorRole: "reviewer",
      rationale: "Evidence read and claim replaced",
      sourceRecordRefs: [
        "33333333-3333-3333-3333-333333333333",
        "44444444-4444-4444-4444-444444444444",
      ],
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(
    (await fetch(base + "state").then((r) => r.json())).assessments[0].outcome,
    "corrected",
  );
  for (let i = 0; i < 51; i++)
    f.append({
      type: "assistant",
      uuid: `55555555-5555-5555-5555-${String(i).padStart(12, "0")}`,
      sessionId: sid,
      timestamp: "2026-01-01T00:00:06Z",
      message: { content: [{ type: "text", text: `later ${i}` }] },
    });
  state = await fetch(base + "state").then((r) => r.json());
  assert.equal(state.assessments[0].outcome, "corrected");
  assert.ok(
    state.reports[0].actions.some(
      (item) => item.uuid === "33333333-3333-3333-3333-333333333333",
    ),
  );
  assert.deepEqual(fs.readdirSync(f.dir), [`${sid}.jsonl`]);
  fs.writeFileSync(f.file, "");
  assert.equal(
    (await fetch(base + "state").then((r) => r.json())).assessments.length,
    0,
  );
  fs.renameSync(f.file, f.file + ".old");
  fs.writeFileSync(f.file, "");
  assert.equal(
    (await fetch(base + "state").then((r) => r.json())).coverage,
    "unavailable",
  );
});

test("spoofs, malformed tails, arbitrary routes and unsupported assessments remain honest", async (t) => {
  const f = fixture(t);
  f.append({
    type: "observer-ref",
    observerTaskId: tid,
    observerAgentType: "other",
    timestamp: "x",
  });
  f.append({
    type: "user",
    uuid: "11111111-1111-1111-1111-111111111111",
    sessionId: "wrong",
    origin: {
      kind: "observer",
      from: "observer:sidkik-sdlc-observer",
      senderTaskId: tid,
    },
    message: { content: "quoted only" },
  });
  f.append("{truncated");
  f.append("null");
  f.append("42");
  let state = inspectTranscript(f.file, sid);
  assert.equal(state.coverage, "partial");
  assert.equal(state.reports.length, 0);
  assert.match(state.reason, /unknown/);
  f.append({
    type: "user",
    uuid: "77777777-7777-7777-7777-777777777777",
    sessionId: sid,
    origin: {
      kind: "observer",
      from: "observer:sidkik-sdlc-observer",
      senderTaskId: tid,
    },
    message: { content: "valid native report" },
  });
  f.append({
    type: "assistant",
    uuid: "66666666-6666-6666-6666-666666666666",
    sessionId: sid,
    message: { content: [null, { type: "text", text: 42 }] },
  });
  state = inspectTranscript(f.file, sid);
  assert.equal(state.coverage, "partial");
  assert.equal(state.malformedBlocks, 2);
  assert.equal(state.reports.length, 1);
  const v = createViewer({ transcriptPath: f.file, sessionId: sid });
  await new Promise((r) => v.server.listen(0, "127.0.0.1", r));
  t.after(() => v.server.close());
  const base = `http://127.0.0.1:${v.server.address().port}/${v.cap}/`;
  assert.equal(
    (await fetch(base + "assess", { method: "POST", body: "{}" })).status,
    400,
  );
  assert.equal((await fetch(base + "anything")).status, 404);
  assert.equal(
    (
      await fetch(base + "state", {
        headers: { Origin: "http://example.test" },
      })
    ).status,
    403,
  );
});
test("unavailable transcript, path mismatch, and symlinks are rejected", (t) => {
  assert.equal(inspectTranscript("/no/such/file", sid).coverage, "unavailable");
  assert.throws(
    () => createViewer({ transcriptPath: "/tmp/other.jsonl", sessionId: sid }),
    /matching/,
  );
  const f = fixture(t),
    link = path.join(f.dir, "link", `${sid}.jsonl`);
  fs.writeFileSync(f.file, "");
  fs.mkdirSync(path.dirname(link));
  fs.symlinkSync(f.file, link);
  assert.throws(
    () => createViewer({ transcriptPath: link, sessionId: sid }),
    /symlink/,
  );
  const target = path.join(f.dir, "actual-subagents");
  fs.mkdirSync(path.join(target, "subagents"), { recursive: true });
  fs.writeFileSync(
    path.join(target, "subagents", `agent-${tid}.jsonl`),
    JSON.stringify({
      type: "user",
      timestamp: "2026-01-01T00:00:00Z",
      message: { content: "<sidkik-sdlc-observed-main-activity>" },
    }) + "\n",
  );
  fs.symlinkSync(target, path.join(f.dir, sid));
  f.append({
    type: "observer-ref",
    observerTaskId: tid,
    observerAgentType: "sidkik-sdlc-observer",
  });
  assert.equal(inspectTranscript(f.file, sid).observerActivity, null);
});
test("ancestor directory symlinks are accepted; transcript and session symlinks are not", (t) => {
  const f = fixture(t),
    real = path.join(f.dir, "real"),
    alias = path.join(f.dir, "alias"),
    sub = path.join(real, sid, "subagents", `agent-${tid}.jsonl`);
  fs.mkdirSync(path.dirname(sub), { recursive: true });
  fs.symlinkSync(real, alias);
  const transcript = path.join(alias, `${sid}.jsonl`);
  fs.writeFileSync(
    transcript,
    JSON.stringify({
      type: "observer-ref",
      observerTaskId: tid,
      observerAgentType: "sidkik-sdlc-observer",
    }) + "\n",
  );
  fs.writeFileSync(
    sub,
    JSON.stringify({
      type: "user",
      timestamp: "2026-01-01T00:00:00Z",
      message: { content: "<sidkik-sdlc-observed-main-activity>" },
    }) + "\n",
  );
  const v = createViewer({ transcriptPath: transcript, sessionId: sid });
  v.server.close();
  const inspected = inspectTranscript(transcript, sid);
  assert.notEqual(inspected.observerActivity, null);
  assert.notEqual(inspected.ledger.sources[0].coverage, "unavailable");
  const linked = path.join(f.dir, "linked", `${sid}.jsonl`);
  fs.mkdirSync(path.dirname(linked));
  fs.symlinkSync(transcript, linked);
  assert.throws(
    () => createViewer({ transcriptPath: linked, sessionId: sid }),
    /Transcript symlinks are not accepted/,
  );
  const viaAlias = path.join(alias, "nested", `${sid}.jsonl`);
  fs.mkdirSync(path.dirname(viaAlias));
  fs.symlinkSync(transcript, viaAlias);
  assert.throws(
    () => createViewer({ transcriptPath: viaAlias, sessionId: sid }),
    /Transcript symlinks are not accepted/,
  );
  fs.renameSync(path.join(real, sid), path.join(real, "moved"));
  fs.symlinkSync(path.join(real, "moved"), path.join(real, sid));
  const escaped = inspectTranscript(transcript, sid);
  assert.equal(escaped.observerActivity, null);
  assert.equal(escaped.ledger.sources[0].reason, "Observer transcript symlink rejected.");
});

// Injected owner identity reads only: no process is started, signalled or ended.
// A stat line carries state (field 3), parent PID (field 4) and starttime (field 22).
const pidDomain = "linux:test-machine:pid:[4026532212]";
function fakeProc(table) {
  const stat = (pid) => {
    const p = table[pid];
    if (!p) return null;
    const fields = [p.state || "S", String(p.ppid ?? 0)];
    while (fields.length < 19) fields.push("0");
    fields.push(p.ticks);
    return `${pid} (${p.comm || "proc"}) ${fields.join(" ")}\n`;
  };
  return {
    stat,
    cmdline: (pid) => table[pid]?.argv ?? null,
    nativeSession: (pid) => table[pid]?.session ?? null,
    pidDomain: () => pidDomain,
  };
}
async function closedWithin(server, ms) {
  for (let waited = 0; server.listening && waited < ms; waited += 10)
    await new Promise((r) => setTimeout(r, 10));
  return !server.listening;
}

test("owned viewer closes its own server when the injected owner identity disappears", async (t) => {
  const f = fixture(t);
  f.append({ type: "user", sessionId: sid, message: { content: "Prepare" } });
  const table = { 4242: { ppid: 1, ticks: "18446744073709551615" } };
  const v = createViewer({
    transcriptPath: f.file,
    sessionId: sid,
    owner: { pid: "4242", startTicks: "18446744073709551615" },
    proc: fakeProc(table),
    ownerCheckMs: 10,
  });
  await new Promise((r) => v.server.listen(0, "127.0.0.1", r));
  t.after(() => v.server.listening && v.server.close());
  delete table[4242];
  assert.equal(await closedWithin(v.server, 1000), true);
});

test("owned viewer closes on PID reuse or a zombie owner, and refuses a mismatched start", async (t) => {
  const f = fixture(t);
  f.append({ type: "user", sessionId: sid, message: { content: "Prepare" } });
  for (const change of [{ ticks: "901" }, { state: "Z" }]) {
    const table = { 4242: { ppid: 1, ticks: "900" } };
    const v = createViewer({
      transcriptPath: f.file,
      sessionId: sid,
      owner: { pid: "4242", startTicks: "900" },
      proc: fakeProc(table),
      ownerCheckMs: 10,
    });
    await new Promise((r) => v.server.listen(0, "127.0.0.1", r));
    t.after(() => v.server.listening && v.server.close());
    Object.assign(table[4242], change);
    assert.equal(await closedWithin(v.server, 1000), true);
  }
  const proc = fakeProc({ 4242: { ppid: 1, ticks: "900" } });
  for (const owner of [
    { pid: "4242", startTicks: "899" },
    { pid: "1", startTicks: "900" },
    { pid: "4242", startTicks: "0900" },
    { pid: "4242" },
  ])
    assert.throws(
      () => createViewer({ transcriptPath: f.file, sessionId: sid, owner, proc }),
      /Owner/,
    );
});

test("manual stop still closes an owned viewer once, and state reports the bound owner", async (t) => {
  const f = fixture(t);
  f.append({ type: "user", sessionId: sid, message: { content: "Prepare" } });
  const table = { 4242: { ppid: 1, ticks: "900" } };
  const v = createViewer({
    transcriptPath: f.file,
    sessionId: sid,
    owner: { pid: "4242", startTicks: "900" },
    proc: fakeProc(table),
    ownerCheckMs: 10,
  });
  await new Promise((r) => v.server.listen(0, "127.0.0.1", r));
  t.after(() => v.server.listening && v.server.close());
  const base = `http://127.0.0.1:${v.server.address().port}/${v.cap}/`;
  const state = await fetch(base + "state").then((r) => r.json());
  assert.deepEqual(state.owner, { pid: "4242", startTicks: "900" });
  assert.equal((await fetch(base + "stop", { method: "POST" })).status, 202);
  assert.equal(await closedWithin(v.server, 1000), true);
  delete table[4242];
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(v.server.listening, false);
});

test("owner discovery selects the one ancestor whose argv carries the exact session ID", () => {
  const chain = (extra = {}) =>
    fakeProc({
      100: { ppid: 200, ticks: "1", argv: ["node", "observer-live.mjs", "serve", "--session", sid] },
      200: { ppid: 300, ticks: "2", argv: ["bash", "-c", `echo --session-id ${sid}`] },
      300: { ppid: 400, ticks: "3", argv: ["claude", "--print", "--session-id", sid] },
      400: { ppid: 1, ticks: "4", argv: ["supervisor", `/x/${sid}`] },
      ...extra,
    });
  assert.deepEqual(resolveOwner({ sessionId: sid, proc: chain(), startPid: "100" }), {
    pid: "300",
    startTicks: "3",
  });
  const resumed = chain({ 300: { ppid: 400, ticks: "3", argv: ["claude", "--resume", sid] } });
  assert.equal(resolveOwner({ sessionId: sid, proc: resumed, startPid: "100" }).pid, "300");
  const twice = chain({ 400: { ppid: 1, ticks: "4", argv: ["claude", "--resume", sid] } });
  assert.throws(() => resolveOwner({ sessionId: sid, proc: twice, startPid: "100" }), /Ambiguous/);
  const none = chain({ 300: { ppid: 400, ticks: "3", argv: ["claude", `--session-id=${sid}`] } });
  assert.throws(() => resolveOwner({ sessionId: sid, proc: none, startPid: "100" }), /No ancestor/);
});

test("owner discovery binds ordinary Claude startup using its native session incarnation", () => {
  const proc = fakeProc({
    100: { ppid: 200, ticks: "1", argv: ["node", "observer-live.mjs"] },
    200: { ppid: 300, ticks: "2", argv: ["bash", "-c", "viewer"] },
    300: {
      ppid: 1, ticks: "105810418", argv: ["claude"],
      session: {
        pid: 300, sessionId: sid, procStart: "105810418", pidDomain,
        kind: "interactive", entrypoint: "cli",
      },
    },
  });
  assert.deepEqual(resolveOwner({ sessionId: sid, proc, startPid: "100" }), {
    pid: "300", startTicks: "105810418",
  });
});

test("ordinary startup rejects missing, unrelated, stale, mismatched and ambiguous native identities", () => {
  const session = {
    pid: 300, sessionId: sid, procStart: "3", pidDomain,
    kind: "interactive", entrypoint: "cli",
  };
  const chain = (change = {}, other = {}) => fakeProc({
    100: { ppid: 200, ticks: "1", argv: ["node", "observer-live.mjs", "--session", sid] },
    200: { ppid: 300, ticks: "2", argv: ["claude"], session: { ...session, pid: 200, sessionId: "unrelated", procStart: "2" } },
    300: { ppid: 400, ticks: "3", argv: ["claude"], session, ...change },
    400: { ppid: 1, ticks: "4", argv: ["bash"] },
    ...other,
  });
  // A closer unrelated Claude must not replace the exact identity farther up.
  assert.deepEqual(resolveOwner({ sessionId: sid, proc: chain(), startPid: "100" }), { pid: "300", startTicks: "3" });
  for (const change of [
    { session: null },
    { session: { ...session, sessionId: "unrelated" } },
    { session: { ...session, pid: 301 } },
    { session: { ...session, procStart: "2" } },
    { session: { ...session, pidDomain: "linux:test-machine:pid:[4026532227]" } },
    { session: { ...session, pidDomain: undefined } },
    { session: { ...session, kind: "bg" } },
    { session: { ...session, entrypoint: "sdk" } },
    { argv: ["bash", "--session-id", sid] },
    { state: "Z" },
    { state: "X" },
  ]) assert.throws(() => resolveOwner({ sessionId: sid, proc: chain(change), startPid: "100" }), /No ancestor|identity/);
  assert.throws(() => resolveOwner({ sessionId: sid, proc: chain({}, {
    400: { ppid: 1, ticks: "4", argv: ["claude"], session: { ...session, pid: 400, procStart: "4" } },
  }), startPid: "100" }), /Ambiguous/);
  // A matching registry outside the ancestry is never searched or adopted.
  assert.throws(() => resolveOwner({ sessionId: sid, proc: chain({ session: null }, {
    900: { ppid: 1, ticks: "9", argv: ["claude"], session: { ...session, pid: 900, procStart: "9" } },
  }), startPid: "100" }), /No ancestor/);
});

test("explicit session argv cannot override a conflicting native identity", () => {
  const session = { pid: 300, sessionId: sid, procStart: "3", pidDomain, kind: "interactive", entrypoint: "cli" };
  const chain = (argv, record) => fakeProc({
    100: { ppid: 300, ticks: "1", argv: ["node", "observer-live.mjs"] },
    300: { ppid: 1, ticks: "3", argv, session: record },
  });
  for (const record of [
    { ...session, sessionId: "unrelated" },
    { ...session, procStart: "2" },
    { ...session, pidDomain: "linux:other:pid:[4026532212]" },
  ]) assert.throws(() => resolveOwner({ sessionId: sid, proc: chain(["claude", "--resume", sid], record), startPid: "100" }), /identity/);
  assert.throws(() => resolveOwner({ sessionId: sid, proc: chain(["claude", "--resume", "unrelated"], session), startPid: "100" }), /conflicts/);
  assert.throws(() => resolveOwner({ sessionId: sid, proc: chain(["node", "--session-id", sid], null), startPid: "100" }), /No ancestor/);
});

test("discovery does not adopt a recycled PID after identifying an ancestor", () => {
  const table = {
    100: { ppid: 300, ticks: "1", argv: ["node", "observer-live.mjs"] },
    300: { ppid: 1, ticks: "3", argv: ["claude", "--session-id", sid] },
  };
  const proc = fakeProc(table), stat = proc.stat;
  let reads = 0;
  proc.stat = (pid) => {
    if (pid === "300" && ++reads === 3) table[300].ticks = "4";
    return stat(pid);
  };
  assert.throws(() => resolveOwner({ sessionId: sid, proc, startPid: "100" }), /changed incarnation/);
});

// This is a native-schema fixture, not a real Claude launch. It exercises the
// shipped CLI, registry reader and actual Linux process lifetime without a model.
function startOwnedCli(t, f, registryContent) {
  const config = {
    dir: f.dir, transcript: f.file, sessionId: sid, registryContent,
    runtime: fileURLToPath(new URL("../sdlc-process/scripts/observer-live.mjs", import.meta.url)),
  };
  const script = `
    import fs from "node:fs";
    import path from "node:path";
    import { spawn } from "node:child_process";
    const config = ${JSON.stringify(config)};
    const stat = fs.readFileSync('/proc/' + process.pid + '/stat', 'utf8');
    const session = {
      pid: process.pid, sessionId: config.sessionId,
      procStart: stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19],
      pidDomain: 'linux:' + fs.readFileSync('/etc/machine-id', 'utf8').trim() + ':' + fs.readlinkSync('/proc/self/ns/pid'),
      kind: 'interactive', entrypoint: 'cli',
    };
    fs.mkdirSync(path.join(config.dir, 'sessions'));
    fs.writeFileSync(path.join(config.dir, 'sessions', process.pid + '.json'), config.registryContent ?? JSON.stringify(session));
    const viewer = spawn(process.execPath, [config.runtime, 'serve', '--owner-main', '--transcript', config.transcript, '--session', config.sessionId], { stdio: ['ignore', 'inherit', 'inherit'] });
    viewer.on('exit', code => console.log(JSON.stringify({ viewerExit: code })));
    process.stdin.resume();
    process.stdin.on('end', () => process.exit(0));
  `;
  const owner = spawn(process.execPath, ["--input-type=module", "-e", script], {
    argv0: "claude", env: { ...process.env, CLAUDE_CONFIG_DIR: f.dir },
    stdio: ["pipe", "pipe", "pipe"],
  });
  t.after(() => { owner.stdin.end(); owner.kill(); });
  const closed = once(owner, "close");
  let stdout = "", stderr = "";
  let exited;
  const viewerExited = new Promise(resolve => { exited = resolve; });
  owner.stderr.on("data", data => { stderr += data; });
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error(`CLI startup timeout: ${stderr}`)), 5000);
    owner.stdout.on("data", data => {
      stdout += data;
      let newline;
      while ((newline = stdout.indexOf("\n")) !== -1) {
        const line = stdout.slice(0, newline);
        stdout = stdout.slice(newline + 1);
        if (!line) continue;
        const record = JSON.parse(line);
        if ("viewerExit" in record) exited(record.viewerExit);
        if (record.url || "viewerExit" in record) {
          clearTimeout(timeout);
          resolve(record);
        }
      }
    });
    owner.on("error", error => { clearTimeout(timeout); reject(error); });
  });
  return { owner, ready, closed, viewerExited, stderr: () => stderr };
}

test("owned CLI reads the native registry and exits on real owner exit or manual stop", {
  skip: process.platform !== "linux", timeout: 15000,
}, async (t) => {
  for (const stop of [false, true]) {
    const f = fixture(t);
    f.append({ type: "user", sessionId: sid, message: { content: "Prepare" } });
    const cli = startOwnedCli(t, f), launch = await cli.ready;
    assert.ok(launch.url, cli.stderr());
    const record = JSON.parse(fs.readFileSync(path.join(f.dir, "sessions", `${cli.owner.pid}.json`), "utf8"));
    assert.deepEqual(launch.owner, { pid: String(cli.owner.pid), startTicks: record.procStart });
    const state = await fetch(launch.url + "state").then(r => r.json());
    assert.deepEqual(state.owner, launch.owner);
    if (stop) {
      assert.equal((await fetch(launch.stopUrl, { method: "POST" })).status, 202);
      assert.equal(await cli.viewerExited, 0);
      assert.equal(cli.owner.exitCode, null, "manual stop leaves its owner alive");
      cli.owner.stdin.end();
    } else cli.owner.stdin.end();
    // The inherited output pipe closes only after the viewer exits as well.
    await cli.closed;
    await assert.rejects(fetch(launch.url + "state"));
  }
});

test("owned CLI fails closed when the native registry is malformed or lacks identity fields", {
  skip: process.platform !== "linux", timeout: 10000,
}, async (t) => {
  for (const raw of ["{broken", "null", "{}", "[]"]) {
    const f = fixture(t);
    f.append({ type: "user", sessionId: sid, message: { content: "Prepare" } });
    const cli = startOwnedCli(t, f, raw);
    assert.deepEqual(await cli.ready, { viewerExit: 1 });
    assert.match(cli.stderr(), /JSON|native session identity|No ancestor/);
    cli.owner.stdin.end();
    await cli.closed;
  }
});

test("owner modes never mix and the explicit pair is all or nothing", () => {
  const proc = fakeProc({});
  assert.equal(ownerOptions(["--transcript", "x"], sid, proc), null);
  assert.deepEqual(
    ownerOptions(["--owner-pid", "4242", "--owner-start-ticks", "900"], sid, proc),
    { pid: "4242", startTicks: "900" },
  );
  assert.throws(() => ownerOptions(["--owner-pid", "4242"], sid, proc), /together/);
  assert.throws(
    () => ownerOptions(["--owner-main", "--owner-pid", "4242", "--owner-start-ticks", "9"], sid, proc),
    /either/,
  );
});
