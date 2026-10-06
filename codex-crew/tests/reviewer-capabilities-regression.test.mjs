// Reviewer-owned proof against the real candidate launcher and patched official
// companion. Only the app-server transport is faked; no model tokens are spent.
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CREW = path.join(HERE, "../bin/crew-codex");
const PATCH = path.join(HERE, "../patches/codex-plugin-turn-capabilities.patch");
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const installed = JSON.parse(fs.readFileSync(path.join(configDir, "plugins/installed_plugins.json"), "utf8"));
const official = process.env.CREW_TEST_COMPANION_ROOT || installed.plugins["codex@openai-codex"][0].installPath;

async function fixture(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "crew-cap-"));
  const plugin = path.join(tmp, "plugin");
  const config = path.join(tmp, "config");
  const repo = path.join(tmp, "repo");
  const archive = path.join(tmp, "archive");
  fs.cpSync(official, plugin, { recursive: true });
  const applied = spawnSync("patch", ["-R", "--dry-run", "-p1", "-s", "-F3", "-d", plugin, "-i", PATCH]);
  if (applied.status !== 0) execFileSync("patch", ["-p1", "-s", "-F3", "-d", plugin, "-i", PATCH]);
  // Mock skills/list at the same client dependency seam as tests/run.sh. The
  // reviewer sandbox cannot initialize the real app-server's /root/.codex DB.
  // All turn execution, CLI parsing and job/thread selection remain real.
  const appClient = path.join(plugin, "scripts/lib/app-server.mjs");
  fs.renameSync(appClient, path.join(plugin, "scripts/lib/app-server-real.mjs"));
  fs.writeFileSync(appClient, `
import fs from "node:fs";
import path from "node:path";
import { CodexAppServerClient as OfficialClient } from "./app-server-real.mjs";
export { BROKER_BUSY_RPC_CODE, BROKER_ENDPOINT_ENV } from "./app-server-real.mjs";
export class CodexAppServerClient extends OfficialClient {
  static async connect(cwd, options = {}) {
    if (!options.disableBroker) return OfficialClient.connect(cwd, options);
    return {
      async request(method, params) {
        if (method !== "skills/list") throw new Error("unexpected discovery request " + method);
        // An overlapping real task can finish while native discovery is in flight.
        const gate = process.env.CREW_TEST_DISCOVERY_GATE;
        if (gate) {
          fs.writeFileSync(gate + ".entered", "ready");
          const deadline = Date.now() + 10000;
          while (!fs.existsSync(gate + ".release")) {
            if (Date.now() > deadline) throw new Error("discovery gate was not released");
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
        return { data: params.cwds.map((cwd) => ({ cwd, errors: [], skills:
          ["crew-regression-alpha", "crew-regression-beta"].map((name) => ({
            name, path: path.join(cwd, ".agents/skills", name, "SKILL.md"),
            enabled: true, scope: "repo"
          }))
        })) };
      },
      async close() {}
    };
  }
}
`);
  fs.mkdirSync(path.join(config, "plugins"), { recursive: true });
  fs.writeFileSync(path.join(config, "plugins/installed_plugins.json"), JSON.stringify({
    plugins: { "codex@openai-codex": [{ installPath: plugin }] }
  }));
  fs.mkdirSync(repo);
  execFileSync("git", ["init", "-q", repo]);
  for (const name of ["crew-regression-alpha", "crew-regression-beta"]) {
    const dir = path.join(repo, ".agents/skills", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: Isolated regression fixture.\n---\nReturn a short review.\n`);
  }
  const requests = [];
  const sockets = new Set();
  let threadCount = 0;
  const hooks = { onTurnStart: null };
  const socketPath = path.join(tmp, "b.sock");
  const server = net.createServer((conn) => {
    sockets.add(conn);
    conn.on("close", () => sockets.delete(conn));
    conn.setEncoding("utf8");
    let buf = "";
    conn.on("data", (chunk) => {
      buf += chunk;
      let index;
      while ((index = buf.indexOf("\n")) !== -1) {
        const msg = JSON.parse(buf.slice(0, index));
        buf = buf.slice(index + 1);
        if (msg.id === undefined) continue;
        requests.push(msg);
        const reply = (result) => conn.write(`${JSON.stringify({ id: msg.id, result })}\n`);
        const note = (method, params) => conn.write(`${JSON.stringify({ method, params })}\n`);
        if (msg.method === "thread/start") {
          reply({ thread: { id: `thread-${++threadCount}` } });
        } else if (msg.method === "thread/resume") {
          reply({ thread: { id: msg.params.threadId } });
        } else if (msg.method === "turn/start") {
          const threadId = msg.params.threadId;
          hooks.onTurnStart?.(threadId);
          reply({ turn: { id: "turn-1", status: "inProgress" } });
          note("turn/started", { threadId, turn: { id: "turn-1" } });
          if (hooks.failTurn) {
            note("turn/completed", { threadId, turn: {
              id: "turn-1", status: hooks.failTurn === "interrupted" ? "interrupted" : "failed", error: { message: "Transient model failure" }
            } });
            continue;
          }
          note("item/completed", { threadId, turnId: "turn-1", item: {
            id: "answer-1", type: "agentMessage", phase: "final_answer", text: "Review complete."
          } });
          note("turn/completed", { threadId, turn: { id: "turn-1", status: "completed" } });
        } else {
          reply({});
        }
      }
    });
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  const env = {
    ...process.env,
    CLAUDE_CONFIG_DIR: config,
    CLAUDE_PLUGIN_DATA: path.join(tmp, "data"),
    CREW_CODEX_ARCHIVE_DIR: archive,
    CREW_CODEX_NO_JOB_BROKER: "1",
    CODEX_COMPANION_APP_SERVER_ENDPOINT: `unix:${socketPath}`
  };
  delete env.CREW_CODEX_TURN_SPEC;
  delete env.CODEX_COMPANION_SESSION_ID;

  async function crew(args, extra = {}) {
    const start = requests.length;
    const child = spawn("bash", [CREW, ...args], { cwd: repo, env: { ...env, ...extra }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    const status = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    return { status, stdout, stderr, requests: requests.slice(start) };
  }
  async function backgroundTask(args, extra = {}) {
    const start = requests.length;
    const launched = await crew(["task", "--background", ...args], extra);
    assert.equal(launched.status, 0, launched.stdout + launched.stderr);
    const id = /\btask-[a-z0-9]+-[a-z0-9]+\b/.exec(launched.stdout)?.[0];
    assert.ok(id, launched.stdout);
    const waited = await crew(["await", id, "--for", "5"], extra);
    assert.equal(waited.status, 0, waited.stdout + waited.stderr);
    return { ...launched, requests: requests.slice(start) };
  }
  return { crew, backgroundTask, archive, hooks, tmp, data: path.join(tmp, "data"), repo };
}

function turn(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const request = result.requests.find((r) => r.method === "turn/start");
  assert.ok(request, "the real companion must have sent turn/start");
  return request.params;
}

test("the companion's -- boundary preserves a flag-shaped prompt without granting network", async (t) => {
  const { crew } = await fixture(t);
  const params = turn(await crew(["task", "--", "--network", "plain prompt"]));
  t.diagnostic(JSON.stringify(params));
  assert.equal("sandboxPolicy" in params, false, "prompt text must not become a network grant");
  assert.equal(params.input[0].text, "--network plain prompt");
});

test("resume inherits requirements from the same session-selected thread as the companion", async (t) => {
  const { backgroundTask } = await fixture(t);
  const alpha = turn(await backgroundTask(
    ["--skill", "crew-regression-alpha", "--network", "alpha review"],
    { CODEX_COMPANION_SESSION_ID: "session-alpha" }
  ));
  turn(await backgroundTask(
    ["--skill", "crew-regression-beta", "beta review"],
    { CODEX_COMPANION_SESSION_ID: "session-beta" }
  ));
  const resumed = await backgroundTask(["--resume-last", "continue"], { CODEX_COMPANION_SESSION_ID: "session-alpha" });
  const params = turn(resumed);
  t.diagnostic(resumed.stderr + JSON.stringify(params));
  assert.equal(params.threadId, alpha.threadId, "control: the real companion resumed alpha's thread");
  assert.equal(params.input.find((i) => i.type === "skill")?.name, "crew-regression-alpha");
  assert.deepEqual(params.sandboxPolicy, { type: "readOnly", networkAccess: true });
});

test("--no-requirements clears an inherited parent turn spec before resuming", async (t) => {
  const { backgroundTask, archive } = await fixture(t);
  const first = await backgroundTask(["--skill", "crew-regression-alpha", "--network", "alpha review"]);
  turn(first);
  const id = /\btask-[a-z0-9]+-[a-z0-9]+\b/.exec(first.stdout)?.[0];
  assert.ok(id, first.stdout);
  const spec = fs.readFileSync(path.join(archive, `${id}.turn`), "utf8").trim();
  const params = turn(await backgroundTask(["--resume-last", "--no-requirements", "continue"], { CREW_CODEX_TURN_SPEC: spec }));
  t.diagnostic(JSON.stringify(params));
  assert.deepEqual(params.input, [{ type: "text", text: "continue", text_elements: [] }]);
  assert.equal("sandboxPolicy" in params, false, "dropping requirements must drop the parent network grant");
});

test("foreground tasks preserve their requirements for a later resume", async (t) => {
  const { crew } = await fixture(t);
  const first = await crew(["task", "--skill", "crew-regression-alpha", "--network", "alpha review"]);
  const alpha = turn(first);
  assert.equal(first.stdout.trim(), "Review complete.", "control: ordinary foreground output has no job id");
  const resumed = turn(await crew(["task", "--resume-last", "continue"]));
  t.diagnostic(JSON.stringify(resumed));
  assert.equal(resumed.threadId, alpha.threadId);
  assert.equal(resumed.input.find((i) => i.type === "skill")?.name, "crew-regression-alpha");
  assert.deepEqual(resumed.sandboxPolicy, { type: "readOnly", networkAccess: true });
});

test("a foreground task keeps its requirements when another task job appears during its run", async (t) => {
  const { crew, hooks, data, repo } = await fixture(t);
  // Another launch in the same cwd records its own job while this turn runs.
  // The owner of the requirements is the job on this run's thread, not "the new job".
  hooks.onTurnStart = (threadId) => {
    const dir = fs.readdirSync(path.join(data, "state")).map((d) => path.join(data, "state", d, "jobs")).find((d) => fs.existsSync(d));
    const when = new Date(Date.now() + 60000).toISOString();
    fs.writeFileSync(path.join(dir, "task-other1-zzz1.json"), JSON.stringify({
      id: "task-other1-zzz1", jobClass: "task", status: "running", threadId: "unrelated-thread",
      createdAt: when, updatedAt: when, workspaceRoot: repo, request: { cwd: repo }
    }));
  };
  const first = await crew(["task", "--skill", "crew-regression-alpha", "--network", "alpha review"]);
  const alpha = turn(first);
  assert.doesNotMatch(first.stderr, /could not match/, first.stderr);
  hooks.onTurnStart = null;
  const resumed = turn(await crew(["task", "--resume-last", "continue"]));
  t.diagnostic(JSON.stringify(resumed));
  assert.equal(resumed.threadId, alpha.threadId);
  assert.equal(resumed.input.find((i) => i.type === "skill")?.name, "crew-regression-alpha");
  assert.deepEqual(resumed.sandboxPolicy, { type: "readOnly", networkAccess: true });
});

test("an accepted foreground turn that fails preserves requirements when its thread resumes", async (t) => {
  const { crew, hooks, data } = await fixture(t);
  hooks.failTurn = true;
  const first = await crew(["task", "--skill", "crew-regression-alpha", "--network", "alpha review"]);
  assert.equal(first.status, 1, first.stdout + first.stderr);
  const accepted = first.requests.find((r) => r.method === "turn/start")?.params;
  assert.ok(accepted, "control: the first turn was accepted, not a failed admission");
  assert.equal(accepted.input.find((i) => i.type === "skill")?.name, "crew-regression-alpha");
  assert.deepEqual(accepted.sandboxPolicy, { type: "readOnly", networkAccess: true });
  const jobsDir = path.join(data, "state", fs.readdirSync(path.join(data, "state"))[0], "jobs");
  const jobs = fs.readdirSync(jobsDir).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(jobsDir, f), "utf8")));
  assert.ok(jobs.some((j) => j.status === "failed" && j.threadId === accepted.threadId),
    "control: the real companion retained the failed job's resumable thread");
  hooks.failTurn = false;
  const resumed = turn(await crew(["task", "--resume-last", "continue"]));
  assert.equal(resumed.threadId, accepted.threadId, "control: resume continued the failed thread");
  t.diagnostic(JSON.stringify({ firstStatus: first.status, accepted, resumed }));
  assert.equal(resumed.input.find((i) => i.type === "skill")?.name, "crew-regression-alpha");
  assert.deepEqual(resumed.sandboxPolicy, { type: "readOnly", networkAccess: true });
});

test("an interrupted foreground turn preserves requirements when its thread resumes", async (t) => {
  const { crew, hooks } = await fixture(t);
  hooks.failTurn = "interrupted";
  const first = await crew(["task", "--skill", "crew-regression-alpha", "--network", "alpha review"]);
  const accepted = first.requests.find((r) => r.method === "turn/start")?.params;
  assert.ok(accepted, "control: the turn was accepted");
  hooks.failTurn = false;
  const resumed = turn(await crew(["task", "--resume-last", "continue"]));
  assert.equal(resumed.threadId, accepted.threadId, "control: resume continued the interrupted thread");
  assert.equal(resumed.input.find((i) => i.type === "skill")?.name, "crew-regression-alpha");
  assert.deepEqual(resumed.sandboxPolicy, { type: "readOnly", networkAccess: true });
});

test("a task completing during resume discovery cannot change the thread under the inherited requirements", async (t) => {
  const { crew, backgroundTask, tmp } = await fixture(t);
  const alpha = turn(await backgroundTask(["--skill", "crew-regression-alpha", "--network", "alpha review"]));
  const gate = path.join(tmp, "discovery-gate");
  const pending = crew(["task", "--resume-last", "continue"], { CREW_TEST_DISCOVERY_GATE: gate });
  t.after(() => { if (fs.existsSync(tmp)) fs.writeFileSync(gate + ".release", "release"); });
  const deadline = Date.now() + 5000;
  while (!fs.existsSync(gate + ".entered") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(fs.existsSync(gate + ".entered"), "resume must reach discovery after selecting alpha");
  const beta = turn(await backgroundTask(["--skill", "crew-regression-beta", "beta review"]));
  fs.writeFileSync(gate + ".release", "release");
  const result = await pending;
  const params = result.requests.find((r) => r.method === "turn/start" &&
    r.params.input.some((i) => i.type === "text" && i.text.endsWith("continue")))?.params;
  t.diagnostic(JSON.stringify({ status: result.status, stderr: result.stderr, alpha: alpha.threadId, beta: beta.threadId, params }));
  // Holding before action, or actually resuming the selected alpha thread, is safe.
  if (result.status !== 0) {
    assert.equal(params, undefined, "a rejected continuation must fail before a turn starts");
    return;
  }
  assert.ok(params, "a successful continuation must have started a turn");
  const expected = params.threadId === alpha.threadId ? "crew-regression-alpha" : "crew-regression-beta";
  assert.equal(params.input.find((i) => i.type === "skill")?.name, expected, "the actual resumed thread must receive its own requirements");
  if (params.threadId === beta.threadId) assert.equal("sandboxPolicy" in params, false, "beta must not inherit alpha's network grant");
});
