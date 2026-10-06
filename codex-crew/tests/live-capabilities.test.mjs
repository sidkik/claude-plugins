// Opt-in LIVE check of native skill input and the network/write split against a
// real Codex app-server. Skipped unless enabled; never part of the default run.
//
//   CREW_LIVE=1        no-model stage: isolated patched plugin copy, real skills/list
//                      discovery, explicit failures before any job. Spends nothing.
//   CREW_LIVE_TURNS=1  also runs real Codex turns (spends tokens, reads a GitHub
//                      repo with the host's own gh auth, writes only inside a
//                      disposable checkout). Optional CREW_LIVE_MODEL, CREW_LIVE_REPO
//                      (default sidkik/claude-plugins; must be readable by gh).
//
// Production code is never touched: the official plugin is COPIED into a
// throwaway CLAUDE_CONFIG_DIR and patched there; the real ~/.claude is only read.
// Run:  CREW_LIVE=1 [CREW_LIVE_TURNS=1] node --test codex-crew/tests/live-capabilities.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CREW = path.join(HERE, "..", "bin", "crew-codex");
const LIVE = process.env.CREW_LIVE === "1";
const TURNS = LIVE && process.env.CREW_LIVE_TURNS === "1";
const REPO = process.env.CREW_LIVE_REPO || "sidkik/claude-plugins";
const skip = LIVE ? false : "set CREW_LIVE=1 to run";

const realConfig = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
function installPath() {
  const data = JSON.parse(fs.readFileSync(path.join(realConfig, "plugins/installed_plugins.json"), "utf8"));
  return data.plugins["codex@openai-codex"][0].installPath;
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "crew-live-"));
const config = path.join(work, "config");
const nonce = crypto.randomBytes(6).toString("hex");
process.on("exit", () => {
  fs.rmSync(work, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});
const outside = path.join(os.homedir(), `.crew-live-outside-${nonce}`);
let env;
let repo;

function crew(args, cwd, extra = {}) {
  return spawnSync("bash", [CREW, ...args], { cwd, env: { ...env, ...extra }, encoding: "utf8", timeout: 600000 });
}

function runJob(args, cwd) {
  const launched = crew(["task", "--background", ...args], cwd);
  assert.equal(launched.status, 0, launched.stdout + launched.stderr);
  const id = /\btask-[a-z0-9]+-[a-z0-9]+\b/.exec(launched.stdout)[0];
  for (;;) {
    const w = crew(["await", id, "--for", "540"], cwd);
    if (w.status !== 10) {
      assert.ok([0, 1].includes(w.status), `await ${id}: ${w.stdout}${w.stderr}`);
      break;
    }
  }
  return { id, result: crew(["result", id], cwd).stdout };
}

test("setup: isolated patched copy of the official plugin and a disposable checkout", { skip }, () => {
  const copy = path.join(config, "plugins/cache/codex");
  fs.mkdirSync(path.dirname(copy), { recursive: true });
  fs.cpSync(installPath(), copy, { recursive: true });
  fs.writeFileSync(
    path.join(config, "plugins/installed_plugins.json"),
    JSON.stringify({ version: 2, plugins: { "codex@openai-codex": [{ installPath: copy }] } })
  );
  env = {
    ...process.env,
    CLAUDE_CONFIG_DIR: config,
    CLAUDE_PLUGIN_DATA: path.join(config, "plugins/data/codex-openai-codex"),
    CREW_CODEX_ARCHIVE_DIR: path.join(config, "archive"),
    CREW_CODEX_NO_AUTO_PATCH: "1"
  };
  // The harness may itself run inside a crew worker; its turn spec and session
  // belong to that worker, not to these jobs.
  delete env.CREW_CODEX_TURN_SPEC;
  delete env.CODEX_COMPANION_SESSION_ID;
  const applied = crew(["patch", "--apply"], work);
  assert.equal(applied.status, 0, applied.stdout + applied.stderr);
  assert.match(crew(["patch", "--status"], work).stdout, /^PATCHED/);

  repo = path.join(work, "checkout");
  fs.mkdirSync(path.join(repo, ".agents/skills/crew-probe"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".agents/skills/crew-probe/SKILL.md"),
    `---\nname: crew-probe\ndescription: Crew integration probe. Use only when invoked by name.\n---\n\n` +
      `When this skill is invoked, begin your final answer with the exact token CREWPROBE-${nonce}.\n`
  );
  // A second skill with a different token: continuation must keep the REQUIRED
  // skill, not merely some skill, so the decoy must never appear.
  fs.mkdirSync(path.join(repo, ".agents/skills/crew-decoy"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".agents/skills/crew-decoy/SKILL.md"),
    `---\nname: crew-decoy\ndescription: Crew integration decoy. Use only when invoked by name.\n---\n\n` +
      `When this skill is invoked, begin your final answer with the exact token CREWDECOY-${nonce}.\n`
  );
  spawnSync("git", ["init", "-q", "."], { cwd: repo });
  spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init"], { cwd: repo });
});

test("a missing skill fails before any job exists", { skip }, () => {
  const r = crew(["task", "--background", "--skill", "no-such-skill", "hello"], repo);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /no-such-skill" is not discovered/);
  assert.match(r.stderr, /no job was started/);
  assert.doesNotMatch(r.stdout, /task-[a-z0-9]+-/);
});

test("native review refuses --skill instead of running without it", { skip }, () => {
  const r = crew(["review", "--background", "--skill", "crew-probe"], repo);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /accepts no skill input/);
});

const turn = { skip: TURNS ? false : "set CREW_LIVE_TURNS=1 (spends tokens)" };
const model = process.env.CREW_LIVE_MODEL ? ["--model", process.env.CREW_LIVE_MODEL] : [];

test("native skill input injects the skill (token is only in SKILL.md)", turn, () => {
  const { result } = runJob(
    [...model, "--effort", "low", "--skill", "crew-probe", "Do not open any files. Reply with one short sentence."],
    repo
  );
  assert.match(result, new RegExp(`CREWPROBE-${nonce}`), result);
});

test("control: the same prompt without --skill does not produce the token", turn, () => {
  const { result } = runJob([...model, "--effort", "low", "Do not open any files. Reply with one short sentence."], repo);
  assert.doesNotMatch(result, new RegExp(`CREWPROBE-${nonce}`));
});

test("--network reads the authenticated GitHub repo while staying read-only", turn, () => {
  const host = spawnSync("gh", ["api", `repos/${REPO}`, "--jq", ".node_id"], { encoding: "utf8" });
  assert.equal(host.status, 0, `host gh cannot read ${REPO}: ${host.stderr}`);
  const nodeId = host.stdout.trim();
  const prompt =
    `Run exactly: gh api repos/${REPO} --jq .node_id   and reply with its output only. ` +
    `If the command fails, reply with the word FAILED and its error. Do not write any files.`;
  const withNet = runJob([...model, "--effort", "low", "--network", prompt], repo);
  assert.ok(withNet.result.includes(nodeId), `authenticated read failed under --network:\n${withNet.result}`);
  const control = runJob([...model, "--effort", "low", prompt], repo);
  assert.ok(!control.result.includes(nodeId), "control without --network reached GitHub; network was never restricted");
});

// What Codex itself recorded for a thread: the accepted turn input and the
// commands that ran. This is the measurement; the model's reply text only shows
// whether it chose to follow the skill's wording.
async function threadTurns(threadId) {
  const client = path.join(config, "plugins/cache/codex/scripts/lib/app-server.mjs");
  const { CodexAppServerClient } = await import(client);
  const c = await CodexAppServerClient.connect(repo, { disableBroker: true });
  try {
    const r = await c.request("thread/read", { threadId, includeTurns: true });
    return r.thread.turns.map((t) => ({
      input: t.items.find((i) => i.type === "userMessage")?.content ?? [],
      commands: t.items.filter((i) => i.type === "commandExecution"),
      answer: t.items.filter((i) => i.type === "agentMessage").map((i) => i.text).join("\n")
    }));
  } finally {
    await c.close().catch(() => {});
  }
}
const sessionOf = (result) => /Codex session ID: (\S+)/.exec(result)?.[1];

test("--resume-last keeps the required skill and the authenticated read, and --no-requirements drops them", turn, async () => {
  const host = spawnSync("gh", ["api", `repos/${REPO}`, "--jq", ".node_id"], { encoding: "utf8" });
  assert.equal(host.status, 0, `host gh cannot read ${REPO}: ${host.stderr}`);
  const nodeId = host.stdout.trim();
  const ghCommand = `gh api repos/${REPO} --jq .node_id`;
  // The prompts leave the skill's own reply rule (begin with the marker) intact.
  const first = runJob([...model, "--effort", "low", "--skill", "crew-probe", "--network", "Do not open any files. Reply with one short sentence."], repo);
  const kept = runJob([...model, "--effort", "low", "--resume-last", `Run exactly: ${ghCommand} . Then reply with one short sentence that includes its output.`], repo);
  const dropped = runJob(
    [...model, "--effort", "low", "--resume-last", "--no-requirements",
      `Run exactly: ${ghCommand} again now. Earlier output does not count: report only what THIS run printed, or its error.`],
    repo
  );
  const thread = sessionOf(first.result);
  assert.ok(thread, first.result);
  assert.equal(sessionOf(kept.result), thread, "resume left the thread");
  const turns = await threadTurns(thread);
  assert.equal(turns.length, 3, JSON.stringify(turns.map((t) => t.answer)));
  const ran = (t) => t.commands.filter((c) => String(c.command).includes(ghCommand));

  // Resume without restated flags: Codex accepted the same skill again (not the decoy)...
  const skillItems = (t) => t.input.filter((i) => i.type === "skill");
  assert.deepEqual(skillItems(turns[1]).map((i) => i.name), ["crew-probe"], JSON.stringify(turns[1].input));
  assert.ok(skillItems(turns[1])[0].path.endsWith("/.agents/skills/crew-probe/SKILL.md"));
  assert.doesNotMatch(JSON.stringify(turns[1].input), /crew-decoy/);
  // ...and the command it ran reached GitHub.
  assert.ok(ran(turns[1]).some((c) => String(c.aggregatedOutput).includes(nodeId)), `no authenticated read on resume:\n${JSON.stringify(turns[1].commands)}`);
  assert.match(kept.result, new RegExp(`CREWPROBE-${nonce}`), `skill instruction not followed:\n${kept.result}`);
  assert.doesNotMatch(kept.result, new RegExp(`CREWDECOY-${nonce}`));

  // --no-requirements: no skill input is sent and the command itself cannot reach
  // GitHub. The reply may still recall the earlier node ID or marker: dropping
  // re-invocation does not erase the earlier conversation, so only the turn's
  // accepted input and command result count.
  assert.deepEqual(skillItems(turns[2]), [], JSON.stringify(turns[2].input));
  assert.ok(ran(turns[2]).length > 0, `the dropped-requirements turn never ran the command; inconclusive:\n${turns[2].answer}`);
  assert.ok(!ran(turns[2]).some((c) => String(c.aggregatedOutput).includes(nodeId)), `--no-requirements still reached GitHub:\n${JSON.stringify(turns[2].commands)}`);
});

test("a flag-shaped word after -- stays prompt text and grants no network", turn, () => {
  const host = spawnSync("gh", ["api", `repos/${REPO}`, "--jq", ".node_id"], { encoding: "utf8" });
  assert.equal(host.status, 0, `host gh cannot read ${REPO}: ${host.stderr}`);
  const nodeId = host.stdout.trim();
  const { result } = runJob(
    [...model, "--effort", "low", "--", `--network Run exactly: gh api repos/${REPO} --jq .node_id and reply with its output only. If it fails reply FAILED.`],
    repo
  );
  assert.ok(!result.includes(nodeId), `literal --network in the prompt granted network:\n${result}`);
});

test("read-only network task cannot write; --write --network writes only in its checkout", turn, () => {
  const ro = runJob(
    [...model, "--effort", "low", "--network", "Create a file named ro-probe.txt containing hi, then report whether it worked."],
    repo
  );
  assert.ok(!fs.existsSync(path.join(repo, "ro-probe.txt")), `read-only task wrote a file:\n${ro.result}`);

  runJob(
    [
      ...model, "--effort", "low", "--write", "--network",
      `Create rw-probe.txt in the current directory containing ok. Then try to create ${outside} containing x ` +
        `and report each outcome. Do not retry with other methods.`
    ],
    repo
  );
  assert.ok(fs.existsSync(path.join(repo, "rw-probe.txt")), "authorized checkout write did not happen");
  assert.ok(!fs.existsSync(outside), "workspace-write+network wrote outside the checkout");
});

test("cleanup", { skip }, () => {
  fs.rmSync(outside, { recursive: true, force: true });
  fs.rmSync(work, { recursive: true, force: true });
});
