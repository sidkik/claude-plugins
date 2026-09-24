import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const cli = new URL("../scripts/status.mjs", import.meta.url);
const invoke = (root, args, input = "") =>
  spawnSync(process.execPath, [cli.pathname, ...args], {
    input,
    encoding: "utf8",
    env: { ...process.env, SDLC_STATUS_DIR: root, SDLC_STATUS_SESSION: "" },
  });
const sample = () => ({
  work: "https://github.com/sidkik/core/issues/478",
  phase: "Implementation",
  skills: [{ name: "temporal", standing: "loaded" }],
  checks: [
    {
      name: "scenarios",
      result: "passed",
      source: "agent",
      actor: "primary",
      reference: "commit abc123",
    },
  ],
  next: "Independent review",
  human: { status: "none", detail: "Continuing" },
});
test("writer and renderer isolate sessions and label assertions", () => {
  const root = mkdtempSync(join(tmpdir(), "sdlc-status-"));
  try {
    assert.equal(
      invoke(
        root,
        ["write", "--client", "claude", "--session", "one"],
        JSON.stringify(sample()),
      ).status,
      0,
    );
    const shown = invoke(
      root,
      ["claude"],
      JSON.stringify({
        session_id: "one",
        workspace: { current_dir: "/repo" },
      }),
    );
    assert.equal(shown.status, 0);
    assert.match(shown.stdout, /Implementation/);
    assert.match(shown.stdout, /loaded/);
    assert.match(shown.stdout, /agent/);
    assert.match(shown.stdout, /unverified/);
    assert.match(
      invoke(root, ["claude"], JSON.stringify({ session_id: "two" })).stdout,
      /UNKNOWN/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const setup = (fn) => {
  const root = mkdtempSync(join(tmpdir(), "sdlc-status-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};
const write = (root, client = "grok", session = "one", s = sample()) =>
  invoke(
    root,
    ["write", "--client", client, "--session", session],
    JSON.stringify(s),
  );
const grok = (root, args = []) =>
  invoke(
    root,
    ["grok", ...args],
    JSON.stringify({
      schema_version: 1,
      session_id: "one",
      cwd: "/repo",
      workspace: { current_dir: "/repo" },
    }),
  );
test("native Grok identity and Codex explicit fallback remain separate", () =>
  setup((root) => {
    assert.equal(write(root).status, 0);
    assert.match(grok(root).stdout, /core#478/);
    assert.equal(grok(root).stdout.trim().split("\n").length, 1);
    assert.match(invoke(root, ["codex", "--session", "one"]).stdout, /UNKNOWN/);
    assert.equal(write(root, "codex").status, 0);
    assert.match(
      invoke(root, ["codex", "--session", "one"]).stdout,
      /Implementation/,
    );
    assert.match(
      grok(root, ["--session", "different"]).stdout,
      /UNKNOWN.*conflicting/,
    );
    assert.match(
      invoke(root, ["grok"], JSON.stringify({ cwd: "/repo" })).stdout,
      /UNKNOWN/,
    );
    assert.match(
      invoke(
        root,
        ["grok", "--session", "one"],
        JSON.stringify({ cwd: "/repo" }),
      ).stdout,
      /core#478/,
    );
  }));
test("stale, malformed, wrong-session and future state never appear fresh", () =>
  setup((root) => {
    write(root);
    const file = join(root, readdirSync(root)[0]);
    const state = JSON.parse(readFileSync(file));
    writeFileSync(
      file,
      JSON.stringify({ ...state, updated_at: "2020-01-01T00:00:00Z" }),
    );
    assert.match(grok(root).stdout, /STALE/);
    writeFileSync(file, "{oops");
    assert.match(grok(root).stdout, /UNKNOWN/);
    writeFileSync(file, JSON.stringify({ ...state, session: "someone-else" }));
    assert.match(grok(root).stdout, /UNKNOWN/);
    writeFileSync(
      file,
      JSON.stringify({ ...state, updated_at: "2099-01-01T00:00:00Z" }),
    );
    assert.match(grok(root).stdout, /UNKNOWN/);
  }));
test("invalid updates preserve prior projection and skill application requires a reference", () =>
  setup((root) => {
    write(root);
    const bad = sample();
    bad.skills[0].standing = "applied";
    assert.equal(write(root, "grok", "one", bad).status, 1);
    assert.match(grok(root).stdout, /core#478/);
    bad.skills[0].reference = "review result at abc";
    bad.checks[0].source = "reviewer";
    assert.equal(write(root, "grok", "one", bad).status, 0);
    const inspection = invoke(root, [
      "inspect",
      "--client",
      "grok",
      "--session",
      "one",
    ]).stdout;
    assert.match(inspection, /reviewer:primary assertion/);
    assert.match(inspection, /not independently validated/);
    assert.match(inspection, /commit abc123/);
  }));
test("terminal escape sequences and Unicode controls cannot escape rendering; width is bounded", () =>
  setup((root) => {
    const s = sample();
    s.phase = "Impl\x1b[31m\n\u202e";
    s.next = "$(touch /tmp/must-not-exist)";
    s.checks[0].reference = "\x1b]8;;https://evil\x07label\x1b]8;;\x07\nref";
    assert.equal(write(root, "grok", "one", s).status, 0);
    const detail = invoke(root, [
      "inspect",
      "--client",
      "grok",
      "--session",
      "one",
    ]).stdout;
    assert.doesNotMatch(detail, /[\x1b\u202e]/);
    assert.match(detail, /\$\(touch/);
    assert.doesNotMatch(detail, /https:\/\/evil/);
    assert.ok(grok(root, ["--width", "30"]).stdout.trimEnd().length <= 30);
  }));
test("missing IDs, malformed payloads and path-shaped IDs are visibly unknown", () =>
  setup((root) => {
    for (const input of ["{}", "{", "null"])
      assert.match(invoke(root, ["claude"], input).stdout, /UNKNOWN/);
    assert.equal(
      invoke(
        root,
        ["write", "--client", "codex", "--session", "../other"],
        JSON.stringify(sample()),
      ).status,
      1,
    );
    assert.match(invoke(root, ["new-session"]).stdout, /^[a-f0-9-]{36}\n$/);
  }));
test("compact row reserves space for next action and aggregates failures before detail", () =>
  setup((root) => {
    const s = sample();
    s.skills = Array.from({ length: 20 }, (_, i) => ({
      name: "skill" + i,
      standing: "loaded",
    }));
    s.checks.push({
      name: "policy",
      result: "failed",
      source: "reviewer",
      actor: "review",
      reference: "GitHub receipt",
    });
    write(root, "grok", "one", s);
    const row = grok(root).stdout;
    assert.match(row, /next:/);
    assert.match(row, /1F/);
    assert.match(row, /unverified/);
    assert.match(row, /skills:/);
    write(root, "claude", "one", s);
    assert.match(
      invoke(
        root,
        ["claude", "--width", "100"],
        JSON.stringify({ session_id: "one" }),
      ).stdout,
      /policy failed/,
    );
  }));
test("metadata growth beyond state limit rejects update and preserves previous projection", () =>
  setup((root) => {
    assert.equal(write(root).status, 0);
    const file = join(root, readdirSync(root)[0]);
    const previous = readFileSync(file);
    const large = sample();
    large.checks = Array.from({ length: 20 }, () => ({
      name: "n".repeat(1500),
      result: "passed",
      source: "agent",
      actor: "a".repeat(100),
      reference: "r".repeat(1500),
    }));
    large.next = "x";
    const padding = 65520 - Buffer.byteLength(JSON.stringify(large));
    assert.ok(padding >= 0 && padding < 2000);
    large.next += "x".repeat(padding);
    const input = JSON.stringify(large);
    assert.equal(Buffer.byteLength(input), 65520);
    const rejected = invoke(
      root,
      ["write", "--client", "grok", "--session", "one"],
      input,
    );
    assert.equal(rejected.status, 1);
    assert.match(rejected.stdout, /state too large/);
    assert.deepEqual(readFileSync(file), previous);
    assert.equal(readdirSync(root).length, 1);
    assert.match(grok(root).stdout, /core#478/);
  }));
