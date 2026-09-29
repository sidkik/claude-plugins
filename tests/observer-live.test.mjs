import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createViewer,
  inspectTranscript,
} from "../sdlc-process/scripts/observer-live.mjs";

const sid = "627631fd-9a38-4516-88af-44787f3268e8",
  tid = "a2166e41509ef8cdd";
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "observer-view-"));
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
