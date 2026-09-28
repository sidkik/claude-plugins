import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const cli = new URL("../scripts/status.mjs", import.meta.url);
const invoke = (root, args, input = "", env = {}) =>
  spawnSync(process.execPath, [cli.pathname, ...args], {
    input,
    encoding: "utf8",
    env: { ...process.env, SDLC_STATUS_DIR: root, SDLC_STATUS_SESSION: "", NO_COLOR: "1", ...env },
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

const stripSGR = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const dense = () => ({
  ...sample(), work: "https://github.com/sidkik/core/issues/456",
  phase: "Triage - verification done, writing triage record",
  skills: ["sdlc-process", "triage (source read, not native invocation)", "sdlc-status", "work-artifacts", "sdlc-policy-review"].map((name, i) => ({name, standing: i < 3 ? "loaded" : "pending"})),
  checks: [
    {name: "claim verification (code read at core f3c43c349; no live run)", result: "unknown", source: "agent", actor: "primary"},
    {name: "policy assessment before label/comment", result: "pending", source: "agent", actor: "primary"},
  ],
  next: "Write draft triage record in planning; put open questions to Chad",
  human: {status: "needed", detail: "Category/state recommendation and retry time window are unanswered"},
});
test("dense footer prioritizes the human, phase and next; full facts remain inspectable", () => setup(root => {
  write(root, "claude", "one", dense());
  const out = invoke(root, ["claude", "--width", "100"], '{"session_id":"one"}').stdout;
  const rows = out.trimEnd().split("\n");
  assert.equal(rows.length, 5);
  assert.match(rows[0], /^YOU NEEDED.*Category/);
  assert.match(rows[1], /^core#456.*Triage/);
  assert.match(rows[2], /^Next: Write draft/);
  assert.match(rows[3], /reported, unverified.*1 pending.*1 unknown/);
  assert.match(rows[4], /0 applied \/ 3 loaded \/ 2 pending/);
  assert.ok(rows.every(x => x.length <= 100));
  assert.doesNotMatch(out, /https:|source read/);
  const full = invoke(root, ["inspect", "--client", "claude", "--session", "one"]).stdout;
  assert.match(full, /source read, not native invocation/);
  assert.match(full, /f3c43c349; no live run/);
}));
test("failed checks and stale state stay ahead of long human prose", () => setup(root => {
  const s = dense();
  s.checks.push({name:"architecture review", result:"failed", source:"reviewer", actor:"review", reference:"abc123"});
  for (const client of ["claude", "grok"]) {
    write(root, client, "one", s);
    const args = [client, "--width", "80"];
    const out = invoke(root, args, '{"session_id":"one"}').stdout;
    assert.match(out.split("\n")[0], /FAILED 1.*YOU NEEDED/);
    if (client === "grok") assert.match(out, /next:/);
  }
  for (const file of readdirSync(root)) {
    const path = join(root,file), s = JSON.parse(readFileSync(path));
    writeFileSync(path, JSON.stringify({...s, updated_at:"2020-01-01T00:00:00Z"}));
  }
  for (const width of [20, 30, 80, 100]) {
    const out = grok(root, ["--width", String(width)]).stdout.trimEnd();
    assert.match(out, /^STALE/);
    assert.ok(out.length <= width);
    const missing = invoke(root, ["claude", "--width", String(width)], '{"session_id":"missing"}').stdout.trimEnd();
    assert.match(missing, /^SDLC UNKNOWN/);
    assert.ok(missing.length <= width);
  }
}));
test("color is semantic, optional, piped-safe and visibly width bounded", () => setup(root => {
  write(root, "claude");
  const render = (args=[], env={}) => invoke(root, ["claude", ...args], '{"session_id":"one"}', env).stdout;
  const plain = render(["--color", "never"]);
  const color = render(["--color", "always"]);
  assert.equal(stripSGR(color), plain);
  assert.match(color, /\x1b\[1;36mImplementation\x1b\[0m/);
  assert.match(color, /\x1b\[32m \/ 1 passed\x1b\[0m/);
  assert.doesNotMatch(render([], {NO_COLOR:"", TERM:"xterm"}), /\x1b/);
  assert.doesNotMatch(render([], {NO_COLOR:undefined, TERM:"dumb"}), /\x1b/);
  assert.match(render([], {NO_COLOR:undefined, TERM:"xterm"}), /\x1b/);
  for (const width of [20, 80, 100]) assert.ok(stripSGR(render(["--color","always","--width",String(width)])).trimEnd().split("\n").every(x=>x.length<=width));
  for (const columns of ["10", "900", "bad"]) assert.doesNotMatch(render([], {COLUMNS:columns}), /^SDLC UNKNOWN/);
  write(root, "codex");
  assert.doesNotMatch(invoke(root, ["text", "--client", "codex", "--session", "one"], "", {NO_COLOR:undefined, TERM:"xterm"}).stdout, /\x1b/);
}));
test("only renderer SGR survives hostile content, and inspect stays plain", () => setup(root => {
  const s = dense();
  s.phase = "Triage\x1b[2J\x1b[31m\u202e";
  s.human.detail = "Decide\x1b]8;;https://evil\x07link\x1b]8;;\x07\nnow";
  s.next = "Review\x1b[0m\rnext";
  write(root,"claude","one",s);
  const colored = invoke(root,["claude","--color","always"],'{"session_id":"one"}').stdout;
  assert.doesNotMatch(stripSGR(colored), /[\x1b\u202e\r]|https:\/\/evil/);
  assert.match(colored, /\x1b\[1;33mYOU NEEDED\x1b\[0m/);
  const inspected = invoke(root,["inspect","--client","claude","--session","one","--color","always"]).stdout;
  assert.doesNotMatch(inspected, /\x1b/);
}));

test("inspect errors stay plain even when color is explicitly requested", () => setup(root => {
  const args = ["inspect", "--client", "claude", "--session", "missing", "--color", "always"];
  const missing = invoke(root, args).stdout;
  assert.match(missing, /^SDLC UNKNOWN/);
  assert.doesNotMatch(missing, /\x1b/);
  write(root, "claude", "missing");
  writeFileSync(join(root, readdirSync(root)[0]), "{broken");
  const malformed = invoke(root, args).stdout;
  assert.match(malformed, /^SDLC UNKNOWN/);
  assert.doesNotMatch(malformed, /\x1b/);
}));

const stageSample = (root, route = "triage") => {
  const result = invoke(root, ["template", "--route", route]);
  assert.equal(result.status, 0, result.stdout);
  const s = JSON.parse(result.stdout);
  s.work = "https://github.com/sidkik/core/issues/456";
  s.progress.evidenceRevision = "candidate-abc";
  return s;
};
const mark = (s, id, status = "passed") => {
  s.progress.results[id] = {status, actor:"primary", reference:"https://github.com/sidkik/core/issues/456#issuecomment-1", revision:s.progress.evidenceRevision};
};
const passAll = s => {
  for (const id of Object.keys(s.progress.results)) {
    mark(s,id);
    s.progress.results[id].assessment = {result:"passed", actor:"independent-reviewer", reference:"review receipt at candidate-abc", revision:s.progress.evidenceRevision};
  }
};
const stageRender = (root, args=[], env={}) => invoke(root,["claude",...args],'{"session_id":"one"}',env).stdout;
test("route skeleton is exhaustive and missing orchestrator stays visible before and after attempted delegation", () => setup(root => {
  const s = stageSample(root);
  assert.ok(s.progress.results["SK-orchestrator-load"]);
  delete s.progress.results["SK-orchestrator-load"];
  assert.equal(write(root,"claude","one",s).status,0);
  let out=stageRender(root);
  assert.match(out,/Intake\[\?\].*Verify\[\.\]/);
  assert.match(out,/orchestrator loaded \(unknown\)/);
  s.progress.activities=["delegation"];
  assert.equal(write(root,"claude","one",s).status,0);
  out=stageRender(root);
  assert.match(out,/VIOLATION/);
  assert.match(out,/Intake\[!\]/);
  assert.match(out,/SK-orchestrator-load/);
}));
test("claiming verification complete cannot hide missing evidence or replace template denominator", () => setup(root => {
  const s=stageSample(root);
  passAll(s);
  s.phase="verification done";
  s.progress.active="VE";
  delete s.progress.results["VE-2"];
  write(root,"claude","one",s);
  assert.match(stageRender(root),/Verify\[\?\]/);
  s.progress.claimedComplete=["VE"];
  write(root,"claude","one",s);
  assert.match(stageRender(root),/Verify\[!\]/);
  assert.match(stageRender(root),/VE-2/);
  s.progress.required=[];
  assert.equal(write(root,"claude","one",s).status,1);
  delete s.progress.required;
  s.progress.results["FORGED-1"]={status:"passed"};
  assert.equal(write(root,"claude","one",s).status,1);
  delete s.progress.results;
  assert.equal(write(root,"claude","one",s).status,0);
  assert.doesNotMatch(stageRender(root),/\[ok\]/);
}));
test("passing requires evidence revision, independent assessments and non-self attribution", () => setup(root => {
  const s=stageSample(root);
  passAll(s); s.progress.active="RV";
  delete s.progress.results["RV-1"].assessment;
  write(root,"claude","one",s);
  assert.match(stageRender(root),/Review\[\?\]/);
  const inspect=invoke(root,["inspect","--client","claude","--session","one"]).stdout;
  assert.match(inspect,/RV-1 unknown.*independent assessment missing/);
  s.progress.results["RV-1"].assessment={result:"passed",actor:"primary",reference:"self",revision:"candidate-abc"};
  write(root,"claude","one",s);
  assert.match(stageRender(root),/Review\[\?\]/);
  passAll(s);
  write(root,"claude","one",s);
  assert.match(stageRender(root),/Review\[ok\]/);
  s.progress.results["VE-2"].revision="older";
  write(root,"claude","one",s);
  assert.match(stageRender(root),/Verify\[!\]/);
}));
test("conditional N/A needs a reason, human exceptions remain E and failures remain red", () => setup(root => {
  const s=stageSample(root); passAll(s); s.progress.active="RF";
  s.progress.results["IN-1"]={status:"na",reason:"unwanted"};
  assert.equal(write(root,"claude","one",s).status,1);
  mark(s,"IN-1");
  s.progress.results["RF-1"]={status:"na"};
  assert.equal(write(root,"claude","one",s).status,1);
  s.progress.results["RF-1"]={status:"na",reason:"Already-fixed disposition has no refinement choice"};
  assert.equal(write(root,"claude","one",s).status,0);
  mark(s,"VE-2","exception");
  assert.equal(write(root,"claude","one",s).status,1);
  Object.assign(s.progress.results["VE-2"],{reason:"Scoped alternate evidence",authority:{kind:"human",actor:"Chad",reference:"actual decision receipt",revision:"candidate-abc"}});
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[E\]/);
  mark(s,"VE-2","failed"); write(root,"claude","one",s);
  assert.match(stageRender(root,["--color","always"]),/\x1b\[1;31m > Verify\[!\]\x1b\[0m/);
}));
test("stale, changed source/evidence and unknown template withdraw all stage green", () => setup(root => {
  const s=stageSample(root); passAll(s); write(root,"claude","one",s);
  for(const args of [["--source-revision","changed"],["--evidence-revision","new-work"]]){
    const out=stageRender(root,args); assert.match(out,/SOURCE CHANGED/); assert.doesNotMatch(out,/\[ok\]/);
  }
  const path=join(root,readdirSync(root)[0]), stored=JSON.parse(readFileSync(path));
  writeFileSync(path,JSON.stringify({...stored,updated_at:"2020-01-01T00:00:00Z"}));
  assert.match(stageRender(root),/STALE/); assert.doesNotMatch(stageRender(root),/\[ok\]/);
  stored.progress.template="sidkik-sdlc@unknown";
  writeFileSync(path,JSON.stringify(stored));
  assert.match(stageRender(root),/UNKNOWN.*unknown template/); assert.doesNotMatch(stageRender(root),/\[ok\]/);
}));
test("stage rendering is bounded, injection safe, plain equivalent and inspect retains every criterion", () => setup(root => {
  const s=stageSample(root); passAll(s);
  s.progress.active="VE"; s.next="Review\x1b[2J\u202ehistory";
  s.progress.results["VE-2"]={status:"pending",reason:"bad\x1b]8;;https://evil\x07link\x1b]8;;\x07"};
  write(root,"claude","one",s); write(root,"grok","one",s);
  for(const width of [20,30,80,140]){
    const plain=stageRender(root,["--width",String(width),"--color","never"]);
    const color=stageRender(root,["--width",String(width),"--color","always"]);
    assert.equal(stripSGR(color),plain);
    assert.ok(plain.trimEnd().split("\n").every(x=>x.length<=width));
    assert.match(plain,/reported/); assert.match(plain,/inspect/);
    assert.doesNotMatch(stripSGR(color),/[\x1b\u202e]|https:\/\/evil/);
    const row=grok(root,["--width",String(width)]).stdout.trimEnd();
    assert.ok(row.length<=width); assert.equal(row.split("\n").length,1);
    assert.match(row,/reported/); assert.match(row,/inspect/);
  }
  const detail=invoke(root,["inspect","--client","claude","--session","one"]).stdout;
  for(const id of Object.keys(s.progress.results)) assert.ok(detail.includes(id),id);
  assert.match(detail,/actor=primary revision=candidate-abc/);
  assert.doesNotMatch(detail,/[\x1b\u202e]|https:\/\/evil/);
}));
test("legacy state remains readable as untracked and every supported route initializes", () => setup(root => {
  write(root,"claude");
  assert.match(stageRender(root),/legacy\/untracked/);
  assert.doesNotMatch(stageRender(root),/Intake\[ok\]/);
  for (const route of ["triage","feature","delivery","research"]) {
    const s=stageSample(root,route);
    assert.equal(write(root,"claude",route,s).status,0);
    assert.match(invoke(root,["claude"],JSON.stringify({session_id:route})).stdout,/Intake\[\?\]/);
  }
  assert.equal(invoke(root,["template","--route","invented"]).status,1);
}));

test("declared specialist criteria survive omission, cannot replace base and require reviewed route reset", () => setup(root => {
  const s=stageSample(root); passAll(s); s.progress.active="VE";
  const extra={id:"X-temporal-workflow-writer-load",label:"temporal-workflow-writer loaded",stage:"VE",source:".claude/skills/temporal-workflow-writer/SKILL.md",sourceRevision:"skill-sha256"};
  s.progress.additions=[extra];
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[\?\]/);
  assert.match(stageRender(root),/X-temporal-workflow-writer-load/);
  delete s.progress.additions;
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/X-temporal-workflow-writer-load/);
  s.progress.additions=[{...extra,label:"renamed to hide requirement"}];
  assert.equal(write(root,"claude","one",s).status,1);
  s.progress.additions=[{...extra,id:"VE-2"}];
  assert.equal(write(root,"claude","one",s).status,1);
  delete s.progress.additions;
  mark(s,extra.id); assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[ok\]/);
  const reset=stageSample(root,"research");
  assert.equal(write(root,"claude","one",reset).status,1);
  reset.progress.routeChange={actor:"primary",reference:"scoped route decision",revision:"candidate-abc",assessment:{result:"passed",actor:"reviewer",reference:"reviewed route change",revision:"candidate-abc"}};
  assert.equal(write(root,"claude","one",reset).status,0);
  const legacy={...reset};delete legacy.progress;
  assert.equal(write(root,"claude","one",legacy).status,1);
}));
test("failed assessment wins and result fields cannot disguise template requirements", () => setup(root => {
  const s=stageSample(root);passAll(s);s.progress.active="VE";
  s.progress.results["VE-2"].assessment.result="failed";
  write(root,"claude","one",s);
  assert.match(stageRender(root),/Verify\[!\]/);
  s.progress.results["VE-2"]={status:"unknown",id:"FAKE",label:"everything done",independent:true,conditional:true};
  write(root,"claude","one",s);
  const out=invoke(root,["inspect","--client","claude","--session","one"]).stdout;
  assert.match(out,/VE-2 unknown/);
  assert.doesNotMatch(out,/FAKE|everything done/);
  assert.match(out,/conditional=false; independent-required=false/);
}));
test("Grok keeps human-needed and stage assurance visible, adding work and next when room permits", () => setup(root => {
  const s=stageSample(root);passAll(s);s.human={status:"needed",detail:"Choose architecture"};
  write(root,"grok","one",s);
  assert.match(grok(root,["--color","always"]).stdout,/\x1b\[1;33mYOU/);
  for(const width of [20,30,80,140]) {
    const row=grok(root,["--width",String(width)]).stdout.trimEnd();
    assert.match(row,/YOU/);assert.match(row,/reported/);assert.match(row,/inspect/);
    assert.ok(row.length<=width);
    if(width>=80){assert.match(row,/core#456/);assert.match(row,/next:/);}
  }
}));


test("same-route template upgrade preserves declarations without an extra review checkpoint", () => setup(root => {
  const s=stageSample(root);
  s.progress.additions=[{id:"X-required-load",label:"required specialist loaded",stage:"IN",source:"skill path",sourceRevision:"skill-hash"}];
  assert.equal(write(root,"claude","one",s).status,0);
  const file=join(root,readdirSync(root)[0]), old=JSON.parse(readFileSync(file));
  old.progress.template="sidkik-sdlc@previous";
  writeFileSync(file,JSON.stringify(old));
  assert.match(stageRender(root),/unknown template/);
  const upgraded=stageSample(root);
  assert.equal(write(root,"claude","one",upgraded).status,0);
  const restored=JSON.parse(readFileSync(file));
  assert.equal(restored.progress.template,upgraded.progress.template);
  assert.deepEqual(restored.progress.additions,s.progress.additions);
  assert.equal(restored.progress.routeChange,undefined);
  assert.match(invoke(root,["inspect","--client","claude","--session","one"]).stdout,/X-required-load unknown/);
  upgraded.progress.template="sidkik-sdlc@unsupported";
  assert.equal(write(root,"claude","one",upgraded).status,1);
}));

test("reproduced routine bug completes Verify with justified diagnosis N/A, without declaring repair ready", () => setup(root => {
  const s=stageSample(root); passAll(s); s.progress.active="VE";
  for (const id of ["SK-diagnosing-bugs-load", "SK-diagnosing-bugs-apply"]) {
    s.progress.results[id]={status:"na",reason:"VE-BUG1–3 passed; diagnosis not needed, no unresolved diagnostic gap"};
  }
  s.progress.results["RS-BUG1"]={status:"unknown"};
  s.progress.claimedComplete=["VE"];
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[ok\]/);
  assert.doesNotMatch(stageRender(root),/VIOLATION|Review\[ok\]/);
  const detail=invoke(root,["inspect","--client","claude","--session","one"]).stdout;
  assert.match(detail,/SK-diagnosing-bugs-apply na/);
  assert.match(detail,/RS-BUG1 unknown/);
  // Claiming readiness/disposition remains held until its separate authority
  // and applicable readiness controls have evidence.
  s.progress.claimedComplete.push("RV");
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Review\[!\]/);
  assert.match(stageRender(root),/RS-BUG1/);
}));

test("bug reproduction cannot complete with omitted, unsupported or mismatched criterion evidence", () => setup(root => {
  for(const id of ["VE-BUG1","VE-BUG2","VE-BUG3"]) {
    for(const omission of ["result","reference","revision"]) {
      const s=stageSample(root); passAll(s);s.progress.active="VE";s.progress.claimedComplete=["VE"];
      if(omission==="result") delete s.progress.results[id];
      else if(omission==="reference") delete s.progress.results[id].reference;
      else s.progress.results[id].revision="different-candidate";
      assert.equal(write(root,"claude","one",s).status,0);
      assert.match(stageRender(root),/Verify\[!\]/);
      assert.ok(stageRender(root).includes(id));
    }
  }
}));

test("reported unrelated red remains failed while conditional diagnosis requires an applicability reason", () => setup(root => {
  const s=stageSample(root);passAll(s);s.progress.active="VE";
  // This fixture supplies the assessment; the renderer cannot determine the
  // cause of a test failure by reading a reference or free-text description.
  mark(s,"VE-BUG2","failed");
  s.progress.results["VE-BUG2"].reason="Only setup failed; reported symptom has not been reproduced";
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[!\]/);
  assert.match(stageRender(root),/VE-BUG2/);
  mark(s,"VE-BUG2");
  s.progress.results["SK-diagnosing-bugs-apply"]={status:"unknown"};
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[\?\]/);
  s.progress.results["SK-diagnosing-bugs-apply"]={status:"na"};
  assert.equal(write(root,"claude","one",s).status,1);
  s.progress.results["SK-diagnosing-bugs-apply"].reason="Reproduction complete; diagnosis not needed, no diagnostic gap remains";
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[ok\]/);
}));

test("already-fixed disposition can exclude reproduction with a reason and delivery retains repair readiness", () => setup(root => {
  const s=stageSample(root);passAll(s);s.progress.active="RV";
  for(const id of ["VE-BUG1","VE-BUG2","VE-BUG3","RS-BUG1"])
    s.progress.results[id]={status:"na",reason:"Integrated fix verified; closeout disposition, no new repair"};
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[ok\]/);
  assert.match(stageRender(root),/Review\[ok\]/);
  const delivery=stageSample(root,"delivery");
  assert.deepEqual(delivery.progress.results["RS-BUG1"],{status:"unknown"});
}));

test("requested handoff can disposition repair readiness N/A without concealing unfinished reproduction", () => setup(root => {
  const s=stageSample(root);passAll(s);s.progress.active="VE";
  s.progress.results["VE-BUG2"]={status:"unknown"};
  s.progress.results["RS-BUG1"]={status:"na",reason:"User requested stop/handoff; no ready/start proposal"};
  s.next="Preserve current evidence and unresolved reproduction in handoff";
  assert.equal(write(root,"claude","one",s).status,0);
  assert.match(stageRender(root),/Verify\[\?\]/);
  const detail=invoke(root,["inspect","--client","claude","--session","one"]).stdout;
  assert.match(detail,/VE-BUG2 unknown/);
  assert.match(detail,/RS-BUG1 na/);
}));

test("every route exposes missing orchestrator load at Intake before any delegation", () => setup(root => {
  for(const route of ["triage","feature","delivery","research"]) {
    const s=stageSample(root,route);passAll(s);
    delete s.progress.results["SK-orchestrator-load"];
    assert.deepEqual(s.progress.activities,[]);
    assert.equal(write(root,"claude",route,s).status,0);
    const render=()=>invoke(root,["claude"],JSON.stringify({session_id:route})).stdout;
    assert.match(render(),/Intake\[\?\]/);
    assert.match(render(),/SK-orchestrator-load/);
    s.progress.claimedComplete=["IN"];
    assert.equal(write(root,"claude",route,s).status,0);
    assert.match(render(),/Intake\[!\]/);
    mark(s,"SK-orchestrator-load");
    assert.equal(write(root,"claude",route,s).status,0);
    assert.match(render(),/Intake\[ok\]/);
    assert.doesNotMatch(render(),/VIOLATION/);
  }
}));

test("failed substantive update preserves previous state and verified recovery exposes new fields only in its session", () => setup(root => {
  const s=stageSample(root);s.next="Await the architecture decision";
  s.human={status:"needed",detail:"Approve architecture proposal"};
  assert.equal(write(root,"claude","one",s).status,0);
  const file=join(root,readdirSync(root)[0]), before=readFileSync(file);
  s.phase="Decision accepted; investigating";s.next="Investigate the accepted design";
  s.human={status:"none",detail:"Decision receipt recorded"};
  mark(s,"IN-3");
  s.progress.results["UNKNOWN-CRITERION"]={status:"passed"};
  const rejected=write(root,"claude","one",s);
  assert.equal(rejected.status,1);
  assert.match(rejected.stdout,/unknown criterion/);
  assert.deepEqual(readFileSync(file),before);
  const inspect=()=>invoke(root,["inspect","--client","claude","--session","one"]);
  assert.match(inspect().stdout,/Await the architecture decision/);
  assert.doesNotMatch(inspect().stdout,/Decision accepted; investigating/);
  delete s.progress.results["UNKNOWN-CRITERION"];
  assert.equal(write(root,"claude","one",s).status,0);
  const verified=inspect();assert.equal(verified.status,0);
  assert.match(verified.stdout,/core\/issues\/456/);
  assert.match(verified.stdout,/active: IN/);
  assert.match(verified.stdout,/Decision accepted; investigating/);
  assert.match(verified.stdout,/IN-3 passed/);
  assert.match(verified.stdout,/Investigate the accepted design/);
  assert.match(verified.stdout,/Human: none.*Decision receipt recorded/);
  assert.match(invoke(root,["inspect","--client","claude","--session","other"]).stdout,/UNKNOWN/);
}));
