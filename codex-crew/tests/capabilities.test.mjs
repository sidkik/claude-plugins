// Regressions for native skill input and the network/write split.
//
// Part 1 is pure: skill discovery decisions. Part 2 applies the real
// turn-capabilities patch to a copy of the installed official companion and
// drives its real runAppServerTurn against a fake app-server socket, so the
// turn/start params under test are the ones the patched code really builds.
// It skips when the official plugin or the codex binary is absent. Neither part
// proves Codex honors the params; tests/live-capabilities.test.mjs does that.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { resolveSkills } from "../lib/skills-resolve.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PATCH = path.join(HERE, "..", "patches", "codex-plugin-turn-capabilities.patch");

const skill = (over = {}) => ({
  name: "orchestrator",
  path: "/w/.claude/skills/orchestrator/SKILL.md",
  enabled: true,
  scope: "repo",
  pluginId: null,
  description: "d",
  ...over
});
const resolve = (requested, skills, readFile = () => "---\nname: x\n---\n") =>
  resolveSkills({ requested, entries: [{ cwd: "/w", errors: [], skills }], cwd: "/w", readFile });

test("discovered enabled skill resolves to its discovered identity and path", () => {
  const r = resolve(["orchestrator"], [skill()]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.skills, [{ name: "orchestrator", path: "/w/.claude/skills/orchestrator/SKILL.md", requested: "orchestrator" }]);
});

test("a plugin-qualified name selects between same-named skills", () => {
  const r = resolve(
    ["sdlc-process:orchestrator"],
    [skill(), skill({ path: "/p/orchestrator/SKILL.md", pluginId: "sdlc-process@sidkik", scope: "user" })]
  );
  assert.equal(r.ok, true);
  assert.equal(r.skills[0].path, "/p/orchestrator/SKILL.md");
});

test("missing skill fails with the cwd and carries discovery errors", () => {
  const r = resolveSkills({
    requested: ["nope"],
    entries: [{ cwd: "/w", skills: [], errors: [{ path: "/w/.claude/skills/nope/SKILL.md", message: "bad yaml" }] }],
    cwd: "/w"
  });
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /"nope" is not discovered at \/w.*bad yaml/);
});

test("disabled skill fails and does not resolve", () => {
  const r = resolve(["orchestrator"], [skill({ enabled: false })]);
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /disabled/);
  assert.deepEqual(r.skills, []);
});

test("two enabled matches are ambiguous, never first-wins", () => {
  const r = resolve(["orchestrator"], [skill(), skill({ path: "/u/orchestrator/SKILL.md", scope: "user" })]);
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /ambiguous.*repo:\/w.*user:\/u/);
});

test("a user-only skill is handed back, not invoked by a delegate", () => {
  const r = resolve(["triage"], [skill({ name: "triage" })], () => "---\nname: triage\ndisable-model-invocation: true\n---\n");
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /user-only.*Hand the invocation to the user/);
});

test("every requested skill is judged; one failure does not hide another", () => {
  const r = resolve(["orchestrator", "ghost"], [skill()]);
  assert.equal(r.ok, false);
  assert.equal(r.problems.length, 1);
  assert.deepEqual(r.skills.map((s) => s.name), ["orchestrator"]);
});

test("a listing without the worker cwd is a failure", () => {
  const r = resolveSkills({ requested: ["a"], entries: [{ cwd: "/a" }, { cwd: "/b" }], cwd: "/w" });
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /no entry for cwd \/w/);
});

// ---- Part 2: the patched official companion --------------------------------

function officialRoot() {
  if (process.env.CREW_TEST_COMPANION_ROOT) return process.env.CREW_TEST_COMPANION_ROOT;
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, "plugins", "installed_plugins.json"), "utf8"));
    return data.plugins["codex@openai-codex"][0].installPath;
  } catch {
    return null;
  }
}

const root = officialRoot();
const haveCodex = spawnSync("codex", ["--version"]).status === 0;
const skipPatched = !root || !fs.existsSync(path.join(root, "scripts/lib/codex.mjs")) || !haveCodex
  ? "official codex plugin or codex binary not available"
  : false;

async function patchedCompanion(tmp) {
  const copy = path.join(tmp, "plugin");
  fs.cpSync(root, copy, { recursive: true });
  // Start from the stock file even when the installed copy carries our patch.
  const stock = path.join(copy, "scripts/lib/codex.mjs");
  spawnSync("patch", ["-R", "-p1", "-s", "-F3", "-d", copy, "-i", PATCH]);
  execFileSync("patch", ["-p1", "-s", "-F3", "-d", copy, "-i", PATCH]);
  assert.ok(fs.readFileSync(stock, "utf8").includes("CREW_CODEX_TURN_SPEC"));
  return import(`${pathToFileURL(stock).href}?${Date.now()}${Math.random()}`);
}

// A fake app-server broker: records every request, completes the turn.
function fakeServer(sock, requests) {
  const server = net.createServer((conn) => {
    let buf = "";
    conn.setEncoding("utf8");
    conn.on("data", (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf("\n")) !== -1) {
        const msg = JSON.parse(buf.slice(0, i));
        buf = buf.slice(i + 1);
        if (msg.id === undefined) continue;
        requests.push(msg);
        const reply = (result) => conn.write(`${JSON.stringify({ id: msg.id, result })}\n`);
        if (msg.method === "thread/start" || msg.method === "thread/resume") {
          reply({ thread: { id: "thread-1" } });
        } else if (msg.method === "turn/start") {
          reply({ turn: { id: "turn-1", status: "inProgress" } });
          const note = (method, params) => conn.write(`${JSON.stringify({ method, params })}\n`);
          note("turn/started", { threadId: "thread-1", turn: { id: "turn-1" } });
          note("turn/completed", { threadId: "thread-1", turn: { id: "turn-1", status: "completed" } });
        } else {
          reply({});
        }
      }
    });
  });
  return new Promise((resolve) => server.listen(sock, () => resolve(server)));
}

async function runTurn(spec, options) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "crew-cap-"));
  const requests = [];
  const sock = path.join(tmp, "b.sock");
  const server = await fakeServer(sock, requests);
  const saved = { ...process.env };
  try {
    const companion = await patchedCompanion(tmp);
    process.env.CODEX_COMPANION_APP_SERVER_ENDPOINT = `unix:${sock}`;
    delete process.env.CREW_CODEX_TURN_SPEC;
    if (spec !== undefined) {
      const specFile = path.join(tmp, "spec.json");
      fs.writeFileSync(specFile, typeof spec === "string" ? spec : JSON.stringify(spec));
      process.env.CREW_CODEX_TURN_SPEC = specFile;
    }
    let error = null;
    try {
      await companion.runAppServerTurn(tmp, { prompt: "review it", ...options });
    } catch (e) {
      error = e;
    }
    return { requests, error, thread: requests.find((r) => r.method.startsWith("thread/")), turn: requests.find((r) => r.method === "turn/start") };
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const SPEC = { skills: [{ name: "orchestrator", path: "/w/.claude/skills/orchestrator/SKILL.md" }], network: false };

test("patched turn/start carries native skill items and $mentions", { skip: skipPatched }, async () => {
  const { turn, error } = await runTurn(SPEC, { sandbox: "read-only" });
  assert.equal(error, null);
  assert.deepEqual(turn.params.input, [
    { type: "text", text: "$orchestrator\n\nreview it", text_elements: [] },
    { type: "skill", name: "orchestrator", path: "/w/.claude/skills/orchestrator/SKILL.md" }
  ]);
});

test("skills alone leave the sandbox exactly as launched", { skip: skipPatched }, async () => {
  const { turn, thread } = await runTurn(SPEC, { sandbox: "read-only" });
  assert.equal("sandboxPolicy" in turn.params, false);
  assert.equal(thread.params.sandbox, "read-only");
});

test("network on a read-only task is readOnly+networkAccess, never a write grant", { skip: skipPatched }, async () => {
  const { turn, thread } = await runTurn({ skills: [], network: true }, { sandbox: "read-only" });
  assert.deepEqual(turn.params.sandboxPolicy, { type: "readOnly", networkAccess: true });
  assert.equal(thread.params.sandbox, "read-only");
  assert.equal(thread.params.approvalPolicy, "never");
});

test("network on a --write task is workspaceWrite+networkAccess with no extra roots", { skip: skipPatched }, async () => {
  const { turn, thread } = await runTurn({ skills: [], network: true }, { sandbox: "workspace-write" });
  assert.deepEqual(turn.params.sandboxPolicy, { type: "workspaceWrite", networkAccess: true });
  assert.equal("writableRoots" in turn.params.sandboxPolicy, false);
  assert.equal(thread.params.sandbox, "workspace-write");
});

test("write without network never invents a network grant", { skip: skipPatched }, async () => {
  const { turn } = await runTurn({ skills: [], network: false }, { sandbox: "workspace-write" });
  assert.equal("sandboxPolicy" in turn.params, false);
});

test("no spec means stock text-only input", { skip: skipPatched }, async () => {
  const { turn } = await runTurn(undefined, { sandbox: "read-only" });
  assert.deepEqual(turn.params.input, [{ type: "text", text: "review it", text_elements: [] }]);
  assert.equal("sandboxPolicy" in turn.params, false);
});

test("a resumed thread gets the same skill input and capability", { skip: skipPatched }, async () => {
  const { requests, turn } = await runTurn(
    { ...SPEC, network: true },
    { sandbox: "read-only", resumeThreadId: "thread-0" }
  );
  assert.ok(requests.some((r) => r.method === "thread/resume"));
  assert.equal(turn.params.input[1].type, "skill");
  assert.deepEqual(turn.params.sandboxPolicy, { type: "readOnly", networkAccess: true });
});

test("an unusable spec fails the turn instead of running without its requirements", { skip: skipPatched }, async () => {
  for (const bad of ["{not json", { skills: [{ name: "x" }] }]) {
    const { error, turn } = await runTurn(bad, { sandbox: "read-only" });
    assert.match(String(error?.message), /crew-codex turn spec/);
    assert.equal(turn, undefined);
  }
});
