#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { buildLedger, observerRecords } from "./observer-ledger.mjs";
import { page } from "./observer-view-page.mjs";
const AGENT = "observer:sidkik-sdlc-observer",
  TYPE = "sidkik-sdlc-observer",
  OUTCOMES = new Set(["corrected", "continued", "disputed", "unresolved"]);
const uuid = (v) => typeof v === "string" && /^[0-9a-f-]{16,}$/i.test(v),
  task = (v) => typeof v === "string" && /^[a-z0-9]{8,64}$/i.test(v);
function action(r) {
  if (!uuid(r?.uuid)) return null;
  if (r.type === "user" && Array.isArray(r.message?.content)) {
    const results = r.message.content
      .filter((x) => x?.type === "tool_result")
      .map((x) => ({
        kind: "tool-result",
        toolUseId: typeof x.tool_use_id === "string" ? x.tool_use_id : null,
        status: x.is_error ? "error" : "success",
      }));
    if (results.length)
      return { uuid: r.uuid, timestamp: r.timestamp, parts: results };
  }
  if (r.type !== "assistant" || !Array.isArray(r.message?.content)) return null;
  const parts = r.message.content.flatMap((x) =>
    x?.type === "text" && typeof x.text === "string" && x.text
      ? [{ kind: "text", text: x.text.slice(0, 1200) }]
      : x?.type === "tool_use" && typeof x.name === "string" && x.name
        ? [{ kind: "tool", name: x.name }]
        : [],
  );
  return parts.length ? { uuid: r.uuid, timestamp: r.timestamp, parts } : null;
}
function hasSymlinkComponent(file) {
  let current = path.parse(path.resolve(file)).root;
  for (const part of path.resolve(file).slice(current.length).split(path.sep)) {
    if (!part) continue;
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) return true;
  }
  return false;
}
export function inspectTranscript(file, sessionId) {
  const out = {
    sessionId,
    coverage: "complete",
    malformedLines: 0,
    launch: null,
    reports: [],
    observerActivity: null,
  };
  let text;
  try {
    const stat = fs.statSync(file);
    if (stat.size > 32 * 1024 * 1024)
      return {
        ...out,
        coverage: "unavailable",
        reason: "Transcript exceeds the 32 MiB live-view limit.",
      };
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    return { ...out, coverage: "unavailable", reason: e.code || e.message };
  }
  const records = [];
  let malformedBlocks = 0;
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      out.malformedLines++;
    }
  }
  if (out.malformedLines || (text && !text.endsWith("\n")))
    out.coverage = "partial";
  const own = records.filter(
      (r) =>
        r &&
        typeof r === "object" &&
        (r.sessionId === sessionId || (!r.sessionId && r.type === "observer-ref")) && !r.isSidechain && !r.agentId,
    ),
    refs = new Map();
  own.forEach((r, i) => {
    if (
      r.type === "observer-ref" &&
      r.observerAgentType === TYPE &&
      task(r.observerTaskId)
    )
      refs.set(r.observerTaskId, { r, i });
  });
  const seen = new Set();
  own.forEach((r, i) => {
    const o = r.origin;
    if (
      r.type !== "user" ||
      o?.kind !== "observer" ||
      o.from !== AGENT ||
      !task(o.senderTaskId) ||
      !uuid(r.uuid) ||
      seen.has(r.uuid)
    )
      return;
    seen.add(r.uuid);
    const actions = own
      .slice(i + 1)
      .map(action)
      .filter(Boolean);
    const reportText =
      typeof r.message?.content === "string" ? r.message.content : "";
    out.reports.push({
      uuid: r.uuid,
      timestamp: r.timestamp,
      observerTaskId: o.senderTaskId,
      text: reportText.slice(0, 4000),
      textTruncated: reportText.length > 4000,
      actionCount: actions.length,
      actions: actions.slice(-50),
      _actions: actions,
      actionsTruncated: actions.length > 50,
    });
  });
  if (refs.size) {
    const [observerTaskId, x] = [...refs].at(-1);
    out.launch = {
      observerTaskId,
      timestamp: x.r.timestamp,
      evidence: "native-observer-ref",
      qualification:
        "Recorded launch/activity does not prove every earlier turn was observed.",
    };
  }
  if (!out.launch && out.reports.length) {
    const report = out.reports[0];
    out.launch = {
      observerTaskId: report.observerTaskId,
      timestamp: report.timestamp,
      evidence: "native-observer-delivery",
      qualification:
        "A delivery proves observer activity at this record; it does not prove every earlier turn was observed.",
    };
  }
  out.observerSources = [];
  const sourceCoverage = [];
  for (const id of new Set([
    ...refs.keys(),
    ...out.reports.map((r) => r.observerTaskId),
  ])) {
    const sub = path.join(
      path.dirname(file),
      sessionId,
      "subagents",
      `agent-${id}.jsonl`,
    );
    try {
      if (hasSymlinkComponent(sub)) { sourceCoverage.push({taskId: id, coverage: "unavailable", reason: "Observer transcript symlink rejected."}); continue; }
      const stat = fs.lstatSync(sub);
      if (stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024) { sourceCoverage.push({taskId: id, coverage: "unavailable", reason: "Observer transcript exceeds the 8 MiB limit or is a symlink."}); continue; }
      const raw = fs.readFileSync(sub, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      const parsed = [];
      let malformed = 0;
      for (const line of lines) { try { parsed.push(JSON.parse(line)); } catch { malformed++; } }
      const selected = observerRecords(parsed, sessionId, id);
      sourceCoverage.push({taskId: id, coverage: malformed || (raw && !raw.endsWith("\n")) || !selected.length ? "partial" : "complete", malformedLines: malformed, reason: !selected.length ? "No matching native observer records." : null});
      const inputs = selected.filter(r => r.type === "user" && r.origin?.kind === "observer-activity");
      out.observerSources.push({taskId: id, records: selected});
      out.observerActivity = {
        observerTaskId: id,
        firstRecordedInputAt: inputs[0]?.timestamp || null,
        lastRecordedAt: selected.at(-1)?.timestamp || null,
        inputCount: inputs.length,
        coverage: malformed ? "partial" : "recorded",
        label: "recorded activity; not a heartbeat",
      };
    } catch (error) { sourceCoverage.push({taskId: id, coverage: "unavailable", reason: error.code || error.message}); }
  }
  if (!out.launch && !out.reports.length)
    out.reason =
      "No validated native observer evidence is recorded; health is unknown.";
  for (const record of own)
    if (Array.isArray(record.message?.content))
      malformedBlocks += record.message.content.filter(
        (item) =>
          !item ||
          typeof item !== "object" ||
          (item.type === "text" && typeof item.text !== "string") ||
          (item.type === "tool_use" && typeof item.name !== "string") ||
          (item.type === "tool_result" &&
            item.tool_use_id !== undefined &&
            typeof item.tool_use_id !== "string"),
      ).length;
  if (malformedBlocks) {
    out.coverage = "partial";
    out.malformedBlocks = malformedBlocks;
  }
  out.ledger = buildLedger(own, out.reports, out.observerSources, sessionId);
  out.ledger.coverage = out.coverage === "complete" && sourceCoverage.length && sourceCoverage.every(x => x.coverage === "complete") ? "complete" : "partial";
  out.ledger.sources = sourceCoverage;
  out.ledger.usage.coverage = out.ledger.coverage;
  delete out.observerSources;
  out.reportCount = out.reports.length;
  out.reportsTruncated = out.reportCount > 100;
  if (out.reportsTruncated) out.reports = out.reports.slice(-100);
  return out;
}
function currentAssessments(state, assessments) {
  if (state.coverage === "unavailable") return [];
  return assessments.filter((assessment) => {
    const report = state.reports.find(
      (item) => item.uuid === assessment.reportUuid,
    );
    const refs = new Set(report?._actions.map((item) => item.uuid));
    return report && assessment.sourceRecordRefs.every((ref) => refs.has(ref));
  });
}
function publicState(state, assessments) {
  const current = currentAssessments(state, assessments);
  return {
    ...state,
    reports: state.reports.map((report) => {
      const cited = new Set(
        current
          .filter((assessment) => assessment.reportUuid === report.uuid)
          .flatMap((assessment) => assessment.sourceRecordRefs),
      );
      const displayed = new Set(report.actions.map((item) => item.uuid));
      const actions = report._actions.filter(
        (item) => cited.has(item.uuid) || displayed.has(item.uuid),
      );
      const { _actions, ...visible } = report;
      return { ...visible, actions };
    }),
    assessments: current,
  };
}
export function createViewer({ transcriptPath, sessionId }) {
  if (
    !path.isAbsolute(transcriptPath) ||
    !uuid(sessionId) ||
    path.basename(transcriptPath) !== `${sessionId}.jsonl`
  )
    throw Error(
      "Transcript must be an absolute MAIN transcript path matching the expected session ID",
    );
  if (hasSymlinkComponent(transcriptPath))
    throw Error("Transcript symlinks are not accepted");
  const real = fs.realpathSync(transcriptPath);
  if (real !== path.resolve(transcriptPath))
    throw Error("Transcript symlinks are not accepted");
  const identity = fs.statSync(real);
  const cap = crypto.randomBytes(24).toString("hex"),
    assessments = [];
  const server = http.createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    const expectedHost = `127.0.0.1:${server.address().port}`;
    let originAllowed = true;
    if (req.headers.origin) {
      try {
        originAllowed = new URL(req.headers.origin).host === expectedHost;
      } catch {
        originAllowed = false;
      }
    }
    if (req.headers.host !== expectedHost || !originAllowed) {
      res.writeHead(403);
      return res.end("forbidden\n");
    }
    const base = `/${cap}/`;
    const readState = () => {
      const current = fs.lstatSync(real);
      if (
        current.isSymbolicLink() ||
        current.dev !== identity.dev ||
        current.ino !== identity.ino
      )
        return {
          sessionId,
          coverage: "unavailable",
          reason:
            "The selected MAIN transcript was replaced; restart the view explicitly.",
          reports: [],
          reportCount: 0,
          reportsTruncated: false,
          launch: null,
          observerActivity: null,
        };
      return inspectTranscript(real, sessionId);
    };
    if (req.method === "GET" && req.url === base) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(page());
    }
    if (req.method === "GET" && req.url === base + "state") {
      res.setHeader("Content-Type", "application/json");
      let state;
      try {
        state = readState();
      } catch (error) {
        state = {
          sessionId,
          coverage: "unavailable",
          reason: error.code || error.message,
          reports: [],
          reportCount: 0,
          reportsTruncated: false,
          launch: null,
          observerActivity: null,
        };
      }
      return res.end(
        JSON.stringify({
          ...publicState(state, assessments),
        }),
      );
    }
    if (req.method === "POST" && req.url === base + "assess") {
      let body = "";
      req.on("data", (c) => {
        body += c;
        if (body.length > 16384) req.destroy();
      });
      return req.on("end", () => {
        try {
          const x = JSON.parse(body),
            state = readState(),
            report = state.reports.find((r) => r.uuid === x.reportUuid),
            valid = new Set(report?._actions.map((a) => a.uuid));
          if (
            !report ||
            !OUTCOMES.has(x.outcome) ||
            !x.assessorIdentity?.trim() ||
            !x.assessorRole?.trim() ||
            !x.rationale?.trim() ||
            !Array.isArray(x.sourceRecordRefs) ||
            !x.sourceRecordRefs.length ||
            x.sourceRecordRefs.some((id) => !valid.has(id))
          )
            throw Error("invalid assessment or post-report source references");
          const v = {
            reportUuid: x.reportUuid,
            outcome: x.outcome,
            assessorIdentity: x.assessorIdentity.trim(),
            assessorRole: x.assessorRole.trim(),
            rationale: x.rationale.trim(),
            sourceRecordRefs: [...new Set(x.sourceRecordRefs)],
            recordedAt: new Date().toISOString(),
            assurance: "attributed assessment; not authenticated proof",
          };
          const i = assessments.findIndex((a) => a.reportUuid === x.reportUuid);
          i < 0 ? assessments.push(v) : (assessments[i] = v);
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(v));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    }
    if (req.method === "POST" && req.url === base + "stop") {
      res.writeHead(202);
      res.end("stopping\n");
      return setImmediate(() => server.close());
    }
    res.writeHead(404);
    res.end("not found\n");
  });
  return { server, cap, assessments };
}
async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw Error(`${response.status}: ${text}`);
  console.log(text.trim());
}
async function main(argv) {
  const [command, ...args] = argv;
  const get = (name) => args[args.indexOf(name) + 1];
  if (command === "serve") {
    const viewer = createViewer({
      transcriptPath: get("--transcript"),
      sessionId: get("--session"),
    });
    viewer.server.listen(0, "127.0.0.1", () => {
      const base = `http://127.0.0.1:${viewer.server.address().port}/${viewer.cap}/`;
      console.log(
        JSON.stringify({
          url: base,
          assessmentUrl: base + "assess",
          stopUrl: base + "stop",
          retention:
            "Manual assessments are memory-only. Automatic tracking is rebuilt from native transcripts and follows Claude retention; no separate archive is created.",
        }),
      );
    });
    return;
  }
  if (command === "assess")
    return post(get("--url"), {
      reportUuid: get("--report"),
      outcome: get("--outcome"),
      assessorIdentity: get("--assessor"),
      assessorRole: get("--role"),
      rationale: get("--rationale"),
      sourceRecordRefs: (get("--refs") || "").split(",").filter(Boolean),
    });
  if (command === "stop") return post(get("--url"));
  throw Error(
    "Usage: observer-live.mjs serve --transcript ABSOLUTE.jsonl --session SESSION_ID | assess --url URL --report UUID --outcome corrected|continued|disputed|unresolved --assessor ID --role ROLE --rationale TEXT --refs UUID,... | stop --url URL",
  );
}
if (import.meta.url === pathToFileURL(process.argv[1] || "").href)
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
