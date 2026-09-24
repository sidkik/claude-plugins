#!/usr/bin/env node
// Local display projection only. All assertions remain attributable, not authenticated.
import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
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
function validate(s) {
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
      !["--session", "--client", "--width", "--max-age"].includes(k) ||
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
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const opts = options(args);
  if (command === "new-session") {
    console.log(randomUUID());
    return;
  }
  if (!["write", "inspect", "text", ...clients].includes(command))
    throw Error(
      "usage: status.mjs write|inspect|text|claude|grok|codex|new-session [--client CLIENT] [--session ID] [--width N] [--max-age SECONDS]",
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
    validate(payload);
    const state = {
      version: 1,
      ...id,
      updated_at: new Date().toISOString(),
      work: payload.work,
      phase: payload.phase,
      skills: payload.skills,
      checks: payload.checks,
      next: payload.next,
      human: payload.human,
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
  if (s.version !== 1 || s.client !== id.client || s.session !== id.session)
    throw Error("wrong session or state version");
  const age = Date.now() - Date.parse(s.updated_at);
  if (!Number.isFinite(age) || age < -5000)
    throw Error("invalid state timestamp");
  const maxAge = Number(opts["--max-age"] || 900);
  if (!Number.isFinite(maxAge) || maxAge < 1 || maxAge > 86400)
    throw Error("max-age must be 1..86400 seconds");
  const width = Number(opts["--width"] || process.env.COLUMNS || 140);
  if (!Number.isInteger(width) || width < 20 || width > 500)
    throw Error("width must be 20..500");
  const rendered = lines(s, Math.max(0, age), age > maxAge * 1000);
  if (command === "inspect") {
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
  } else if (command === "grok") {
    // Safety state comes first so narrow rows cannot hide stale/decision-needed flags.
    const alert = age > maxAge * 1000 ? "STALE" : "REPORTED";
    const issue = s.work.match(/\/([^/]+\/[^/]+)\/issues\/(\d+)$/);
    const failed = s.checks.filter((x) => x.result === "failed").length;
    const unresolved = s.checks.filter((x) =>
      ["pending", "unknown"].includes(x.result),
    ).length;
    const applied = s.skills.filter((x) => x.standing === "applied").length;
    const heading = `SDLC ${alert} ${Math.floor(age / 1000)}s H:${s.human.status} | ${issue[1]}#${issue[2]}`;
    const summary = `checks:${failed}F/${unresolved}? refs-unverified skills:${applied}/${s.skills.length} applied`;
    const room = Math.max(
      4,
      Math.floor((width - heading.length - summary.length - 22) / 2),
    );
    console.log(
      clip(
        `${heading} | ${clip(s.phase, Math.max(4, Math.min(room, 20)))} | next:${clip(s.next, Math.max(4, room))} | ${summary}`,
        width,
      ),
    );
  } else console.log(rendered.map((x) => clip(x, width)).join("\n"));
}
main().catch((error) => {
  console.log(
    "SDLC UNKNOWN | " +
      ascii(
        error.code === "ENOENT"
          ? "no projection for this session"
          : error.message,
      ),
  );
  if (process.argv[2] === "write") process.exitCode = 1;
});
