#!/usr/bin/env node
// Local display projection only. All assertions remain attributable, not authenticated.
import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { template, validateProgress, project, templates, retainRequirements } from "./stages.mjs";
const LIMIT = 65536;
const clients = ["claude", "grok", "codex"];
const clean = (value) =>
  String(value)
    .replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const text = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 2000;
function validate(s, writing = false) {
  if (s?.progress !== undefined) validateProgress(s.progress, writing);
  if (
    !s ||
    !text(s.work) ||
    !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/.test(
      s.work,
    ) ||
    !text(s.phase) ||
    !text(s.next)
  )
    throw Error("work must be a GitHub issue URL; phase and next are required");
  if (
    !Array.isArray(s.skills) ||
    s.skills.length > 20 ||
    !s.skills.every(
      (x) =>
        x &&
        text(x.name) &&
        ["loaded", "applied", "pending"].includes(x.standing) &&
        (x.standing !== "applied" || text(x.reference)),
    )
  )
    throw Error("invalid skill standing or missing applied reference");
  if (
    !Array.isArray(s.checks) ||
    s.checks.length > 20 ||
    !s.checks.every(
      (x) =>
        x &&
        text(x.name) &&
        ["passed", "failed", "pending", "unknown"].includes(x.result) &&
        ["agent", "reviewer"].includes(x.source) &&
        text(x.actor) &&
        (!["passed", "failed"].includes(x.result) || text(x.reference)),
    )
  )
    throw Error("invalid check or missing result reference");
  if (
    !s.human ||
    !["none", "needed", "unknown"].includes(s.human.status) ||
    !text(s.human.detail)
  )
    throw Error("human status and detail required");
}
async function input() {
  let data = "";
  for await (const chunk of process.stdin) {
    data += chunk;
    if (Buffer.byteLength(data) > LIMIT) throw Error("input too large");
  }
  return JSON.parse(data);
}
function options(args) {
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i];
    if (
      !["--session", "--client", "--width", "--max-age", "--color", "--route", "--source-revision", "--evidence-revision"].includes(k) ||
      !args[i + 1] ||
      opts[k] !== undefined
    )
      throw Error("invalid arguments");
    opts[k] = args[i + 1];
  }
  return opts;
}
function identity(client, id) {
  if (
    !clients.includes(client) ||
    typeof id !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(id)
  )
    throw Error("session identity missing or invalid");
  return { client, session: id };
}
function location(id) {
  return join(
    process.env.SDLC_STATUS_DIR ||
      join(homedir(), ".local", "state", "sidkik-sdlc-status"),
    createHash("sha256").update(JSON.stringify(id)).digest("hex") + ".json",
  );
}
function lines(s, age, stale) {
  const priority = { failed: 0, unknown: 1, pending: 2, passed: 3 };
  const checks =
    [...s.checks]
      .sort((a, b) => priority[a.result] - priority[b.result])
      .map(
        (x) =>
          `${clean(x.name)} ${x.result} (${x.source}:${clean(x.actor)} assertion)`,
      )
      .join("; ") || "unknown";
  return [
    `SDLC ${stale ? "STALE" : "REPORTED"} ${Math.floor(age / 1000)}s | ${clean(s.work)} | ${clean(s.phase)}`,
    `Skills (agent): ${s.skills.map((x) => `${clean(x.name)} ${x.standing}`).join("; ") || "unknown"}`,
    `Checks (references unverified): ${checks}`,
    `Next: ${clean(s.next)}`,
    `Human: ${s.human.status} | ${clean(s.human.detail)}`,
  ];
}
// ASCII output avoids terminal-control injection and ambiguous wide-cell truncation.
const ascii = (value) => clean(value).replace(/[^\x20-\x7e]/g, "?");
const clip = (value, width) => {
  const s = ascii(value);
  return s.length > width ? s.slice(0, width - 3) + "..." : s;
};
// Styling is applied only to already sanitized, visibly bounded ASCII segments.
const palette = { red: "31", amber: "33", cyan: "36", green: "32", detail: "2" };
function useColor(command, opts) {
  const mode = opts["--color"] || "auto";
  if (!["auto", "always", "never"].includes(mode)) throw Error("color must be auto, always or never");
  if (mode !== "auto") return mode === "always";
  return process.env.NO_COLOR === undefined && process.env.TERM !== "dumb" && ["claude", "grok"].includes(command);
}
function displayWidth(opts) {
  if (opts["--width"] !== undefined) {
    const n = Number(opts["--width"]);
    if (!Number.isInteger(n) || n < 20 || n > 500) throw Error("width must be 20..500");
    return n;
  }
  const n = Number(process.env.COLUMNS);
  return Number.isInteger(n) && n > 0 ? Math.max(20, Math.min(n, 500)) : 140;
}
function paint(parts, width, colored) {
  let remaining = width;
  return parts.map(([value, tone, bold]) => {
    if (!remaining) return "";
    const valueText = (String(value).startsWith(" ") ? " " : "") + ascii(value) + (String(value).endsWith(" ") ? " " : "");
    const shown = valueText.length > remaining
      ? valueText.slice(0, Math.max(0, remaining - 3)) + ".".repeat(Math.min(3, remaining))
      : valueText;
    remaining -= shown.length;
    const style = [bold ? "1" : "", palette[tone] || ""].filter(Boolean).join(";");
    return colored && style && shown ? `\x1b[${style}m${shown}\x1b[0m` : shown;
  }).join("");
}
function compact(s, age, stale, width, colored, single) {
  const counts = Object.fromEntries(["failed", "unknown", "pending", "passed"].map(k => [k, s.checks.filter(x => x.result === k).length]));
  const skill = Object.fromEntries(["loaded", "applied", "pending"].map(k => [k, s.skills.filter(x => x.standing === k).length]));
  const important = ["failed", "unknown", "pending"].flatMap(k => s.checks.filter(x => x.result === k))[0];
  const issue = s.work.match(/\/([^/]+)\/issues\/(\d+)$/);
  const work = `${issue[1]}#${issue[2]}`;
  const flags = [stale ? "STALE" : "", counts.failed ? `FAILED ${counts.failed}` : "", s.human.status === "needed" ? "YOU NEEDED" : s.human.status === "unknown" ? "HUMAN UNKNOWN" : ""].filter(Boolean);
  const attention = flags.join(" | ") || "YOU: none";
  const tone = stale || counts.failed ? "red" : s.human.status !== "none" || counts.pending || counts.unknown ? "amber" : undefined;
  const detail = s.human.status !== "none" ? s.human.detail : important ? `${important.name} ${important.result}` : s.human.detail;
  if (single) {
    // Allocate phase and next action before optional counts, even at 80 columns.
    const prefix = `${flags.join("/") || "REPORTED"} | ${work} | `;
    const room = Math.max(4, Math.floor((width - ascii(prefix).length - 10) / 2));
    return [paint([
      [prefix, tone, true], [clip(s.phase, Math.min(room, 20)), "cyan", true],
      [" | next:", undefined, true], [clip(s.next, room)],
      [` | checks:${counts.failed}F/${counts.pending + counts.unknown}? refs-unverified skills:${skill.applied}/${s.skills.length} applied`, "detail"],
    ], width, colored)];
  }
  return [
    paint([[attention, tone, true], [` | ${detail}`, tone]], width, colored),
    paint([[`${work} | `, undefined, true], [s.phase, "cyan", true], [` | ${stale ? "STALE" : "reported"} ${Math.floor(age / 1000)}s`, "detail"]], width, colored),
    paint([["Next: ", undefined, true], [s.next]], width, colored),
    paint([["Checks (reported, unverified): ", undefined, true], [`${counts.failed} failed`, counts.failed ? "red" : undefined], [` / ${counts.pending} pending / ${counts.unknown} unknown`, counts.pending || counts.unknown ? "amber" : undefined], [` / ${counts.passed} passed`, counts.passed ? "green" : undefined], [s.checks.length ? (important ? ` | ${clip(important.name, 28)}` : "") : " (none recorded)"]], width, colored),
    paint([["Skills (agent): ", undefined, true], [`${skill.applied} applied / ${skill.loaded} loaded / ${skill.pending} pending`, skill.pending ? "amber" : undefined], [" | legacy/untracked; template then inspect", "detail"]], width, colored),
  ];
}
function stageLines(s, projection, width, colored, single) {
  const tone = status => status === "!" ? "red" : status === "ok" ? "green" : ["?", "E"].includes(status) ? "amber" : "detail";
  const first = projection.blocking;
  const violation = projection.stages.some(x => x.status === "!");
  const alert = projection.invalid ? projection.reason : violation ? "! VIOLATION" : s.human.status === "needed" ? "YOU NEEDED" : first ? "? PENDING" : "REPORTED";
  const detail = first ? `${first.id}: ${first.label} (${first.status})` : s.human.detail;
  if (single) {
    // At narrow widths retain an attention symbol, active stage, reported
    // assurance and inspection path. Longer rows add the next action.
    const issue = s.work.match(/\/([^/]+)\/issues\/(\d+)$/).slice(1).join("#");
    const activeName = projection.stages.find(x => x.id === projection.active).label;
    const attention = projection.invalid || violation ? "!" : s.human.status !== "none" ? "YOU" : first ? "?" : "+";
    const activity = width >= 60 ? ` ${activeName} ${issue}` : width >= 24 ? ` ${projection.active}` : attention === "YOU" ? "" : projection.active;
    const prefix = `${attention}${activity} reported`;
    const room = width - prefix.length - " inspect".length;
    const middle = room > 10 ? ` next:${clip(s.next, room - 6)}` : "";
    return [paint([[prefix, projection.invalid || violation ? "red" : first || s.human.status !== "none" ? "amber" : "cyan", true], [middle], [" inspect", "detail"]], width, colored)];
  }
  const names = width >= 80;
  const chain = projection.stages.flatMap((x, i) => [[`${i ? " > " : ""}${names ? x.label : x.id}[${x.status}]`, tone(x.status), true]]);
  const chainText = projection.stages.map(x => `${names ? x.label : x.id}[${x.status}]`).join(" > ");
  // Include 'inspect' before truncation even at the smallest supported width.
  const chainRow = chainText.length <= width ? paint(chain, width, colored) : paint([["inspect | ", "detail"], ...chain], width, colored);
  return [
    paint([[projection.invalid ? "!" : violation ? "!" : first ? "?" : "+", projection.invalid || violation ? "red" : "amber", true], [" reported | ", "detail"], [s.work.match(/\/([^/]+)\/issues\/(\d+)$/).slice(1).join("#"), "cyan"], [" | " + alert, projection.invalid || violation ? "red" : "amber", true]], width, colored),
    chainRow,
    paint([[detail, violation ? "red" : "amber"]], width, colored),
    paint([["Next: ", undefined, true], [s.next]], width, colored),
    paint([[s.human.status === "none" ? "Human: none" : `Human ${s.human.status}: ${s.human.detail}`, s.human.status === "none" ? "detail" : "amber"], [" | inspect", "detail"]], width, colored),
  ];
}
function inspectStages(s, projection) {
  console.log(ascii(`SDLC ${projection.reason}; reported assertions, not independently authenticated`));
  console.log(ascii(`Template: ${s.progress?.template || "none"}; source ${JSON.stringify(templates.source)}`));
  if (!projection.tracked) return;
  console.log(ascii(`Route: ${s.progress.route}; active: ${s.progress.active}; evidence revision: ${s.progress.evidenceRevision}; phase (informational): ${s.phase}`));
  for (const stage of projection.stages) {
    console.log(`${stage.id}[${stage.status}] ${stage.label}`);
    for (const c of stage.rows) {
      console.log(ascii(`  ${c.id} ${c.status}${c.violation ? " VIOLATION" : ""}: ${c.label}; ${c.assurance}; ${c.reason}`));
      console.log(ascii(`    actor=${c.actor || "unknown"} revision=${c.revision || "unknown"} evidence=${c.reference || "none"}; conditional=${!!c.conditional}; independent-required=${!!c.independent}`));
      if (c.source) console.log(ascii(`    declared source=${c.source} revision=${c.sourceRevision}`));
      if (c.assessment) console.log(ascii(`    assessment=${JSON.stringify(c.assessment)}`));
      if (c.authority) console.log(ascii(`    exception authority=${JSON.stringify(c.authority)}`));
    }
  }
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const opts = options(args);
  if (command === "template") {
    console.log(JSON.stringify(template(opts["--route"]), null, 2));
    return;
  }
  if (command === "new-session") {
    console.log(randomUUID());
    return;
  }
  if (!["write", "inspect", "text", ...clients].includes(command))
    throw Error(
      "usage: status.mjs template --route ROUTE OR write|inspect|text|claude|grok|codex|new-session [--client CLIENT] [--session ID] [--width N] [--max-age SECONDS] [--color auto|always|never]",
    );
  let payload;
  if (command === "write" || command === "claude" || command === "grok")
    payload = await input();
  const client = clients.includes(command) ? command : opts["--client"];
  const supplied = opts["--session"] || process.env.SDLC_STATUS_SESSION;
  if (
    ["claude", "grok"].includes(command) &&
    supplied &&
    payload?.session_id &&
    supplied !== payload.session_id
  )
    throw Error("conflicting session identities");
  const id = identity(
    client,
    ["claude", "grok"].includes(command)
      ? payload?.session_id || supplied
      : supplied,
  );
  const file = location(id);
  if (command === "write") {
    let previous;
    try {
      const prior = await readFile(file);
      if (prior.length > LIMIT) throw Error("previous state too large");
      previous = JSON.parse(prior);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    retainRequirements(payload, previous);
    validate(payload, true);
    const state = {
      version: payload.progress ? 2 : 1,
      ...id,
      updated_at: new Date().toISOString(),
      work: payload.work,
      phase: payload.phase,
      skills: payload.skills,
      checks: payload.checks,
      next: payload.next,
      human: payload.human,
      ...(payload.progress ? {progress: payload.progress} : {}),
    };
    const serialized = JSON.stringify(state) + "\n";
    if (Buffer.byteLength(serialized) > LIMIT) throw Error("state too large");
    await mkdir(join(file, ".."), { recursive: true, mode: 0o700 });
    const temporary = file + "." + randomUUID() + ".tmp";
    try {
      await writeFile(temporary, serialized, {
        flag: "wx",
        mode: 0o600,
      });
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch(() => {});
    }
    console.log(
      "SDLC projection updated; assertions and references are not independently verified.",
    );
    return;
  }
  const raw = await readFile(file);
  if (raw.length > LIMIT) throw Error("state too large");
  const s = JSON.parse(raw);
  validate(s);
  if (![1, 2].includes(s.version) || s.client !== id.client || s.session !== id.session)
    throw Error("wrong session or state version");
  const age = Date.now() - Date.parse(s.updated_at);
  if (!Number.isFinite(age) || age < -5000)
    throw Error("invalid state timestamp");
  const maxAge = Number(opts["--max-age"] || 900);
  if (!Number.isFinite(maxAge) || maxAge < 1 || maxAge > 86400)
    throw Error("max-age must be 1..86400 seconds");
  const width = displayWidth(opts);
  const colored = useColor(command, opts);
  const rendered = lines(s, Math.max(0, age), age > maxAge * 1000);
  const projection = project(s, { stale: age > maxAge * 1000, sourceRevision: opts["--source-revision"], evidenceRevision: opts["--evidence-revision"] });
  if (command === "inspect") {
    inspectStages(s, projection);
    console.log(rendered.map(ascii).join("\n"));
    console.log("Evidence references (not independently validated):");
    for (const x of s.skills)
      if (x.reference) console.log(ascii(`skill ${x.name}: ${x.reference}`));
    for (const x of s.checks)
      console.log(
        ascii(
          `${x.source}:${x.actor} / ${x.name} / ${x.result}: ${x.reference || "none"}`,
        ),
      );
  } else if (projection.tracked) console.log(stageLines(s, projection, width, colored, command === "grok").join("\n"));
  else if (s.progress) console.log(paint([["SDLC UNKNOWN", "red", true], [" | reported | " + projection.reason + " | inspect"]], width, colored));
  else console.log(compact(s, Math.max(0, age), age > maxAge * 1000, width, colored, command === "grok").join("\n"));
}
main().catch((error) => {
  let width = 140;
  let colored = false;
  try {
    const opts = options(process.argv.slice(3));
    width = displayWidth(opts);
    colored = process.argv[2] !== "inspect" && useColor(process.argv[2], opts);
  } catch { /* Invalid options still produce a plain, bounded UNKNOWN. */ }
  console.log(paint([["SDLC UNKNOWN", "red", true], [" | " + (error.code === "ENOENT" ? "no projection for this session" : error.message)]], width, colored));
  if (["write", "template"].includes(process.argv[2])) process.exitCode = 1;
});
