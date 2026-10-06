// Focused Spec-review proof against the unchanged crew wrapper. Uses the same
// fake companion/skills-list seam as run.sh; no model or production writes.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const crewRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const crew = path.join(crewRoot, "bin/crew-codex");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spec-lifecycle-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const plugin = path.join(root, "plugin");
  const scripts = path.join(plugin, "scripts");
  const archive = path.join(root, "archive");
  const jobs = path.join(root, "data/state/lab/jobs");
  for (const dir of [scripts, archive, jobs, path.join(root, "plugins")]) fs.mkdirSync(dir, { recursive: true });

  // Reconstruct the pre-image, exactly as run.sh's build_fixture does, then
  // apply the shipped patch so the real wrapper's readiness check runs.
  const patch = path.join(crewRoot, "patches/codex-plugin-turn-capabilities.patch");
  const old = [];
  let hunk = false;
  for (const line of fs.readFileSync(patch, "utf8").split("\n")) {
    if (line.startsWith("@@")) { hunk = true; old.push("// unrelated code between hunks"); }
    else if (hunk && (line.startsWith(" ") || line.startsWith("-"))) old.push(line.slice(1));
  }
  fs.mkdirSync(path.join(scripts, "lib"));
  fs.writeFileSync(path.join(scripts, "lib/codex.mjs"), old.join("\n") + "\n");
  const applied = spawnSync("patch", ["-p1", "-s", "-F3", "-d", plugin, "-i", patch], { encoding: "utf8" });
  assert.equal(applied.status, 0, applied.stdout + applied.stderr);
  fs.writeFileSync(path.join(root, "plugins/installed_plugins.json"), JSON.stringify({ plugins: { "codex@openai-codex": [{ installPath: plugin }] } }));
  fs.writeFileSync(path.join(scripts, "lib/app-server.mjs"), `
    import fs from "node:fs";
    export class CodexAppServerClient {
      static async connect() {
        return { request: async () => JSON.parse(fs.readFileSync(process.env.SPEC_LIST, "utf8")), close: async () => {} };
      }
    }
  `);
  fs.writeFileSync(path.join(scripts, "codex-companion.mjs"), `
    import fs from "node:fs";
    const args = process.argv.slice(2);
    const spec = process.env.CREW_CODEX_TURN_SPEC ? JSON.parse(fs.readFileSync(process.env.CREW_CODEX_TURN_SPEC, "utf8")) : null;
    if (args[0] === "task-resume-candidate") {
      // Same rule as the official companion: newest job (by updatedAt) that is
      // a finished task with a thread, within the session when one is set.
      const dir = process.env.CLAUDE_PLUGIN_DATA + "/state/lab/jobs";
      const session = process.env.CODEX_COMPANION_SESSION_ID || null;
      const jobs = fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(dir + "/" + f, "utf8")))
        .filter((j) => !session || j.sessionId === session)
        .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
      const c = jobs.find((j) => j.jobClass === "task" && j.threadId && j.status !== "queued" && j.status !== "running");
      console.log(JSON.stringify({ available: Boolean(c), candidate: c ? { id: c.id, threadId: c.threadId } : null }));
    } else {
    fs.appendFileSync(process.env.SPEC_LOG, JSON.stringify({args, spec}) + "\\n");
    if (args[0] === "task") console.log("Codex Task started in the background as task-new1-aaa1.");
    else console.log("Cancelled " + args[1]);
    }
  `);
  const skill = (name, id, enabled = true) => {
    const skillPath = path.join(root, id, "SKILL.md");
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, `---\nname: ${name}\ndescription: x\n---\nbody\n`);
    return { name, pluginId: id === "repo" ? null : `${id}@test`, path: skillPath, enabled, scope: "user" };
  };
  const repositorySkill = skill("orch", "repo");
  const pluginSkill = skill("orch", "sdlc-process");
  const env = {
    ...process.env,
    CLAUDE_CONFIG_DIR: root,
    CLAUDE_PLUGIN_DATA: path.join(root, "data"),
    CREW_CODEX_ARCHIVE_DIR: archive,
    CREW_CODEX_NO_JOB_BROKER: "1",
    SPEC_LIST: path.join(root, "skills.json"),
    SPEC_LOG: path.join(root, "calls.jsonl")
  };
  delete env.CREW_CODEX_TURN_SPEC;
  fs.writeFileSync(env.SPEC_LOG, "");
  const list = (skills) => fs.writeFileSync(env.SPEC_LIST, JSON.stringify({ data: [{ cwd: root, errors: [], skills }] }));
  list([repositorySkill, pluginSkill]);
  const run = (...args) => spawnSync("bash", [crew, ...args], { cwd: root, env, encoding: "utf8" });
  const records = () => fs.readFileSync(env.SPEC_LOG, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
  const job = (id, date, threadId = "thread-1") => fs.writeFileSync(path.join(jobs, `${id}.json`), JSON.stringify({
    id, createdAt: date, updatedAt: date, status: threadId ? "completed" : "failed", threadId, jobClass: "task", request: { cwd: root, write: false }
  }));
  const launch = run("task", "--background", "--skill", "sdlc-process:orch", "--network", "review");
  assert.equal(launch.status, 0, launch.stderr);
  assert.equal(records()[0].spec.skills[0].path, pluginSkill.path);
  job("task-new1-aaa1", "2026-01-01T00:00:00Z");
  fs.writeFileSync(env.SPEC_LOG, "");
  return { root, archive, env, run, records, list, job, repositorySkill, pluginSkill };
}

test("resume preserves the qualified skill when both enabled matches remain", (t) => {
  const f = fixture(t);
  const r = f.run("task", "--background", "--resume-last", "continue");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(f.records()[0].spec.skills[0].path, f.pluginSkill.path);
});

test("resume refuses a disabled required plugin instead of substituting the repo skill", (t) => {
  const f = fixture(t);
  f.list([f.repositorySkill, { ...f.pluginSkill, enabled: false }]);
  const r = f.run("task", "--background", "--resume-last", "continue");
  assert.notEqual(r.status, 0, `unexpected launch: ${JSON.stringify(f.records())}`);
  assert.equal(f.records().length, 0);
});

test("redirect preserves the qualified skill when both enabled matches remain", (t) => {
  const f = fixture(t);
  const r = f.run("redirect", "task-new1-aaa1", "change course");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(f.records().at(-1).spec.skills[0].path, f.pluginSkill.path);
});

test("a fresh launch does not inherit the calling worker's turn spec", (t) => {
  const f = fixture(t);
  f.env.CREW_CODEX_TURN_SPEC = fs.readFileSync(path.join(f.archive, "task-new1-aaa1.turn"), "utf8").trim();
  const r = f.run("task", "--background", "fresh unrelated work");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(f.records()[0].spec, null);
});

test("--no-requirements clears an inherited calling worker's turn spec", (t) => {
  const f = fixture(t);
  f.env.CREW_CODEX_TURN_SPEC = fs.readFileSync(path.join(f.archive, "task-new1-aaa1.turn"), "utf8").trim();
  const r = f.run("task", "--background", "--resume-last", "--no-requirements", "continue");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(f.records()[0].spec, null);
});

test("resume inherits the resumable thread's requirements after a pre-thread failure", (t) => {
  const f = fixture(t);
  // executeTaskRun's resolveLatestTrackedTaskThread skips a failed job with no
  // threadId and resumes the preceding completed task. The wrapper must pick
  // requirements from that same job, rather than the failed newest admission.
  f.job("task-fail1-bbb1", "2026-02-01T00:00:00Z", null);
  f.list([f.pluginSkill]);
  const r = f.run("task", "--background", "--resume-last", "continue");
  assert.equal(r.status, 0, r.stderr);
  assert.notEqual(f.records()[0].spec, null, "resuming an existing required-skill thread sent no requirements");
  assert.equal(f.records()[0].spec.skills[0].path, f.pluginSkill.path);
  assert.equal(f.records()[0].spec.network, true);
});

// Added with the repair: a recorded requirement that cannot be read must stop
// the continuation, not quietly become "no requirements".
for (const [label, damage] of [
  ["corrupt", (spec) => fs.writeFileSync(spec, "{not json")],
  ["missing", (spec) => fs.rmSync(spec)]
]) {
  test(`resume and redirect refuse a ${label} recorded spec before launching or cancelling`, (t) => {
    const f = fixture(t);
    damage(fs.readFileSync(path.join(f.archive, "task-new1-aaa1.turn"), "utf8").trim());
    for (const args of [["task", "--background", "--resume-last", "continue"], ["redirect", "task-new1-aaa1", "change course"]]) {
      const r = f.run(...args);
      assert.notEqual(r.status, 0, `${args[0]} proceeded: ${r.stdout}${r.stderr}`);
      assert.match(r.stderr, /missing or unreadable|unreadable/);
    }
    assert.equal(f.records().length, 0, "nothing may reach the companion");
  });
}
