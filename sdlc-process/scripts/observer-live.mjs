#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";
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
// Ancestors of `base` may be OS or user-level symlinks (macOS /var, /tmp);
// the file itself and every component below `base` must not be.
function symlinkEscapes(file, base = path.dirname(file)) {
  const root = path.resolve(base),
    relative = path.relative(root, path.resolve(file));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    return true;
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) return true;
  }
  return fs.realpathSync(current) !== path.join(fs.realpathSync(root), relative);
}
// Re-read fixed head/tail windows on refresh. This bounds I/O and retained JSON
// while letting new appended activity enter the tail; skipped history stays partial.
function readObserverSnapshot(file) {
  const limit = 8 * 1024 * 1024;
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK | (fs.constants.O_NOFOLLOW || 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw Error("Observer transcript must be a regular file.");
    const windows = stat.size <= limit
      ? [[0, stat.size]]
      : [[0, limit / 2], [stat.size - limit / 2, limit / 2]];
    const texts = [], ranges = [];
    let bytesRead = 0, incompleteFinalRecord = false;
    for (const [offset, length] of windows) {
      const buffer = Buffer.alloc(length);
      let count = 0;
      while (count < length) {
        const read = fs.readSync(fd, buffer, count, length - count, offset + count);
        if (!read) break;
        count += read;
      }
      bytesRead += count;
      const bytes = buffer.subarray(0, count);
      // A tail starts inside unknown history. Discard its first fragment and
      // every incomplete final fragment before decoding UTF-8 or parsing JSON.
      const start = offset ? bytes.indexOf(10) + 1 : 0;
      const end = bytes.lastIndexOf(10) + 1;
      if (offset + count === stat.size)
        incompleteFinalRecord = count > 0 && bytes[count - 1] !== 10;
      if (end > start) {
        texts.push(bytes.subarray(start, end).toString("utf8"));
        ranges.push({start: offset + start, end: offset + end});
      }
    }
    const omittedBytes = stat.size - ranges.reduce((sum, r) => sum + r.end - r.start, 0);
    return {texts, ranges, bytesRead, snapshotBytes: stat.size, omittedBytes,
      incompleteFinalRecord, bounded: stat.size > limit};
  } finally {
    fs.closeSync(fd);
  }
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
      if (symlinkEscapes(sub, path.dirname(file))) { sourceCoverage.push({taskId: id, coverage: "unavailable", reason: "Observer transcript symlink rejected."}); continue; }
      const snapshot = readObserverSnapshot(sub);
      const parsed = [];
      let malformed = 0;
      for (const raw of snapshot.texts)
        for (const line of raw.split("\n").filter(Boolean)) {
          try { parsed.push(JSON.parse(line)); } catch { malformed++; }
        }
      const selected = observerRecords(parsed, sessionId, id);
      const partial = malformed > 0 || snapshot.omittedBytes > 0 || !selected.length;
      const {texts, ...scan} = snapshot;
      const reasons = [];
      if (snapshot.bounded) reasons.push("Observer history sampled at whole-record boundaries within an 8 MiB head/tail scan; omitted history is unknown.");
      if (snapshot.incompleteFinalRecord) reasons.push("Incomplete final observer record excluded until its newline arrives.");
      if (!selected.length) reasons.push("No matching native observer records.");
      sourceCoverage.push({taskId: id, coverage: partial ? "partial" : "complete",
        malformedLines: malformed, ...scan, reason: reasons.join(" ") || null});
      const inputs = selected.filter(r => r.type === "user" && r.origin?.kind === "observer-activity");
      out.observerSources.push({taskId: id, records: selected});
      out.observerActivity = {
        observerTaskId: id,
        firstRecordedInputAt: inputs[0]?.timestamp || null,
        lastRecordedAt: selected.at(-1)?.timestamp || null,
        inputCount: inputs.length,
        coverage: partial ? "partial" : "recorded",
        label: partial ? "recorded activity in partial coverage; counts cover sampled records only; not a heartbeat" : "recorded activity; not a heartbeat",
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
// Linux /proc identity reads. A missing process reads as null; other read
// failures throw so the caller can retry rather than treat them as an exit.
const linuxProc = {
  stat: (pid) => procRead(`/proc/${pid}/stat`),
  cmdline: (pid) => procRead(`/proc/${pid}/cmdline`)?.split("\0").filter(Boolean) ?? null,
  nativeSession: (pid) => {
    const file = path.join(
      (process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude")).normalize("NFC"),
      "sessions", `${pid}.json`,
    );
    try {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.size > 256 * 1024)
        throw Error("Native session identity must be a regular file within 256 KiB");
      const session = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!session || typeof session !== "object" || Array.isArray(session))
        throw Error("Invalid native session identity record");
      return session;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  },
  // Claude 2.1.296 uses machine-id and the PID namespace for this domain.
  pidDomain: () => `linux:${fs.readFileSync("/etc/machine-id", "utf8").trim()}:${fs.readlinkSync("/proc/self/ns/pid")}`,
};
function procRead(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ESRCH") return null;
    throw error;
  }
}
// Fields after the command name's closing parenthesis: state (3), ppid (4) and
// starttime (22) as the exact decimal string.
function statFields(text) {
  if (!text) return null;
  const rest = text.slice(text.lastIndexOf(")") + 2).trim().split(" ");
  return { state: rest[0], ppid: rest[1], startTicks: rest[19] };
}
function ownerLive(owner, proc) {
  const fields = statFields(proc.stat(owner.pid));
  return Boolean(
    fields &&
      fields.state !== "Z" &&
      fields.state !== "X" &&
      fields.startTicks === owner.startTicks,
  );
}
function ownerProc(proc) {
  if (proc) return proc;
  if (process.platform !== "linux")
    throw Error(
      `Owned viewer binding requires Linux /proc; unsupported platform: ${process.platform}`,
    );
  return linuxProc;
}
// Select exactly one ancestor using Claude's native session registry and process
// incarnation. Explicit session argv remains a fallback for older clients that
// have no registry; a present registry must agree, never be bypassed by argv.
export function resolveOwner({ sessionId, proc, startPid = String(process.pid) }) {
  proc = ownerProc(proc);
  const matches = [];
  for (
    let pid = statFields(proc.stat(startPid))?.ppid, hops = 0;
    pid && pid !== "0" && hops < 4096;
    pid = statFields(proc.stat(pid))?.ppid, hops++
  ) {
    // Pin the incarnation before reading argv: that read can race with PID reuse.
    const fields = statFields(proc.stat(pid));
    if (!fields || fields.state === "Z" || fields.state === "X") continue;
    const argv = proc.cmdline(pid) || [];
    if (path.basename(argv[0] || "") !== "claude") continue;
    const session = proc.nativeSession(pid);
    const explicit = argv.some(
        (arg, i) =>
          (arg === "--session-id" || arg === "--resume") &&
          argv[i + 1] === sessionId,
      );
    if (session !== null) {
      if (
        session?.sessionId !== sessionId ||
        session.pid !== Number(pid) ||
        session.procStart !== fields.startTicks ||
        session.pidDomain !== proc.pidDomain() ||
        session.kind !== "interactive" || session.entrypoint !== "cli"
      ) {
        if (explicit || session?.sessionId === sessionId)
          throw Error("Native session identity does not match this ancestor incarnation");
        continue;
      }
      // A conflicting explicit session selection cannot be repaired by registry.
      if (argv.some((arg, i) =>
        (arg === "--session-id" || arg === "--resume") && argv[i + 1] !== sessionId
      )) throw Error("Native session identity conflicts with ancestor argv");
    } else if (!explicit) continue;
    matches.push({ pid, startTicks: fields.startTicks });
  }
  if (matches.length !== 1)
    throw Error(
      matches.length
        ? `Ambiguous owner: ${matches.length} ancestor native sessions match this session ID`
        : "No ancestor native session matches this session ID",
    );
  if (!ownerLive(matches[0], proc))
    throw Error("Owner process ended or changed incarnation during discovery");
  return matches[0];
}
export function createViewer({
  transcriptPath,
  sessionId,
  owner = null,
  proc,
  ownerCheckMs = 5000,
}) {
  if (owner) {
    if (
      !/^[1-9][0-9]*$/.test(owner.pid ?? "") ||
      owner.pid === "1" ||
      !/^(0|[1-9][0-9]*)$/.test(owner.startTicks ?? "")
    )
      throw Error("Owner requires a decimal PID greater than 1 and decimal start ticks");
    proc = ownerProc(proc);
    if (!ownerLive(owner, proc))
      throw Error("Owner process identity does not match a live process");
    owner = { pid: owner.pid, startTicks: owner.startTicks };
  }
  if (
    !path.isAbsolute(transcriptPath) ||
    !uuid(sessionId) ||
    path.basename(transcriptPath) !== `${sessionId}.jsonl`
  )
    throw Error(
      "Transcript must be an absolute MAIN transcript path matching the expected session ID",
    );
  if (symlinkEscapes(transcriptPath))
    throw Error("Transcript symlinks are not accepted");
  const real = fs.realpathSync(transcriptPath);
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
          owner,
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
      return setImmediate(shutdown);
    }
    res.writeHead(404);
    res.end("not found\n");
  });
  // One shutdown path for the stop endpoint and the owner's end: release the
  // liveness timer and close this server once. No process is signalled.
  let watch = null;
  function shutdown() {
    clearInterval(watch);
    watch = null;
    if (server.listening) server.close();
  }
  server.on("close", () => clearInterval(watch));
  if (owner)
    server.on("listening", () => {
      watch = setInterval(() => {
        let live = true;
        try {
          live = ownerLive(owner, proc);
        } catch {
          live = true; // unreadable but present: retry on the next check
        }
        if (!live) shutdown();
      }, ownerCheckMs);
      watch.unref();
    });
  return { server, cap, assessments, owner };
}
// Owner selection for `serve`: --owner-main, or the exact --owner-pid and
// --owner-start-ticks pair, or neither (unowned manual view). Modes never mix.
export function ownerOptions(args, sessionId, proc) {
  const main = args.includes("--owner-main"),
    hasPid = args.includes("--owner-pid"),
    hasTicks = args.includes("--owner-start-ticks");
  if (main && (hasPid || hasTicks))
    throw Error("Use either --owner-main or --owner-pid with --owner-start-ticks, not both");
  if (hasPid !== hasTicks)
    throw Error("--owner-pid and --owner-start-ticks must be given together");
  if (main) return resolveOwner({ sessionId, proc });
  if (hasPid)
    return {
      pid: args[args.indexOf("--owner-pid") + 1],
      startTicks: args[args.indexOf("--owner-start-ticks") + 1],
    };
  return null;
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
      owner: ownerOptions(args, get("--session")),
    });
    viewer.server.listen(0, "127.0.0.1", () => {
      const base = `http://127.0.0.1:${viewer.server.address().port}/${viewer.cap}/`;
      console.log(
        JSON.stringify({
          url: base,
          assessmentUrl: base + "assess",
          stopUrl: base + "stop",
          owner: viewer.owner,
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
    "Usage: observer-live.mjs serve --transcript ABSOLUTE.jsonl --session SESSION_ID [--owner-main | --owner-pid PID --owner-start-ticks TICKS] | assess --url URL --report UUID --outcome corrected|continued|disputed|unresolved --assessor ID --role ROLE --rationale TEXT --refs UUID,... | stop --url URL",
  );
}
function invokedDirectly() {
  try {
    return (
      Boolean(process.argv[1]) &&
      fs.realpathSync(process.argv[1]) ===
        fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}
if (invokedDirectly())
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
