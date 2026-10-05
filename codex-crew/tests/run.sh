#!/usr/bin/env bash
# Resolver tests for bin/crew-codex. Uses a throwaway CLAUDE_CONFIG_DIR;
# never touches the real ~/.claude.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREW="$HERE/../bin/crew-codex"
TMP="$(mktemp -d)"
STUB_PIDS=""

pass=0
fail=0
summary_reached=0

# ONE exit handler. Bash keeps a single trap per signal, so the abort guard and
# the temp-dir cleanup have to live in the same function or the second silently
# replaces the first - which is how earlier runs leaked both their temp trees
# and the broker stubs they started.
cleanup_suite() {
  local status=$?
  if [[ "$summary_reached" -ne 1 ]]; then
    echo
    echo "SUITE ABORTED before the summary - treat as FAILURE"
    status=1
  fi
  local pf p
  for pf in "$TMP"/crewb-*/broker.pid; do
    [[ -f "$pf" ]] || continue
    p="$(cat "$pf" 2>/dev/null || true)"
    # `kill` on an already-dead pid returns non-zero, and under set -e that
    # aborts this function before the tree is removed. Every signal here is
    # best-effort by definition.
    [[ "$p" =~ ^[0-9]+$ ]] && kill -9 "$p" 2>/dev/null || true
  done
  for p in $STUB_PIDS $(cat "$TMP/stub_pids" 2>/dev/null || true); do
    kill -9 "$p" 2>/dev/null || true
  done
  rm -rf "$TMP"
  exit "$status"
}
trap cleanup_suite EXIT

check() {
  local name="$1" expected_exit="$2" grep_for="$3" actual_exit="$4" output="$5"
  if [[ "$actual_exit" == "$expected_exit" ]] && grep -q "$grep_for" <<<"$output"; then
    echo "PASS: $name"
    pass=$((pass + 1))
  else
    echo "FAIL: $name (exit=$actual_exit, want=$expected_exit; output: $output)"
    fail=$((fail + 1))
  fi
}

# A broker stub shaped like the real thing: it opens the unix socket and writes
# the pid file, so crew_spawn_job_broker actually succeeds. Without this every
# per-job-broker path silently no-ops and the tests cannot see it.
write_broker_stub() { # $1 = scripts dir
  cat > "$1/app-server-broker.mjs" <<'BROKEREOF'
import net from "node:net";
import fs from "node:fs";
const a = process.argv.slice(2);
const endpoint = a[a.indexOf("--endpoint") + 1] || "";
const pidFile = a[a.indexOf("--pid-file") + 1] || "";
const sockPath = endpoint.replace(/^unix:/, "");
if (pidFile) fs.writeFileSync(pidFile, String(process.pid));
net.createServer(() => {}).listen(sockPath);
setInterval(() => {}, 1 << 30);
BROKEREOF
}
export CREW_CODEX_BROKER_TMPDIR="$TMP"

# Case 1: missing installed_plugins.json -> loud error, exit 1
out="$(CLAUDE_CONFIG_DIR="$TMP/empty" bash "$CREW" --resolve 2>&1)" && rc=0 || rc=$?
check "missing installed_plugins.json" 1 "install the official Codex plugin" "$rc" "$out"

# Case 2: codex plugin absent from installed_plugins.json -> loud error, exit 1
mkdir -p "$TMP/no-codex/plugins"
echo '{"version":2,"plugins":{"other@mp":[{"installPath":"/nowhere"}]}}' > "$TMP/no-codex/plugins/installed_plugins.json"
out="$(CLAUDE_CONFIG_DIR="$TMP/no-codex" bash "$CREW" --resolve 2>&1)" && rc=0 || rc=$?
check "codex plugin not installed" 1 "is not installed" "$rc" "$out"

# Case 3: entry present but companion script missing -> loud layout error, exit 1
mkdir -p "$TMP/stale/plugins" "$TMP/stale/fake-install"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/stale/fake-install\"}]}}" > "$TMP/stale/plugins/installed_plugins.json"
out="$(CLAUDE_CONFIG_DIR="$TMP/stale" bash "$CREW" --resolve 2>&1)" && rc=0 || rc=$?
check "companion script missing" 1 "layout changed" "$rc" "$out"

# Case 4: happy path with a fake companion -> resolves path, exit 0
mkdir -p "$TMP/happy/plugins" "$TMP/happy/install/scripts"
touch "$TMP/happy/install/scripts/codex-companion.mjs"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/happy/install\"}]}}" > "$TMP/happy/plugins/installed_plugins.json"
out="$(CLAUDE_CONFIG_DIR="$TMP/happy" bash "$CREW" --resolve 2>&1)" && rc=0 || rc=$?
check "happy path resolve" 0 "$TMP/happy/install/scripts/codex-companion.mjs" "$rc" "$out"

# Case 5: happy path forwards argv to the companion (exec node <companion> <args>)
cat > "$TMP/happy/install/scripts/codex-companion.mjs" <<'EOF'
console.log("ARGS:" + process.argv.slice(2).join(","));
console.log("DATA:" + (process.env.CLAUDE_PLUGIN_DATA || "unset"));
EOF
out="$(CLAUDE_CONFIG_DIR="$TMP/happy" env -u CLAUDE_PLUGIN_DATA bash "$CREW" status --json 2>&1)" && rc=0 || rc=$?
check "argv forwarding" 0 "ARGS:status,--json" "$rc" "$out"
check "CLAUDE_PLUGIN_DATA default" 0 "DATA:$TMP/happy/plugins/data/codex-openai-codex" "$rc" "$out"

# Explicit model ids and efforts are forwarded unchanged, including older ids.
# Agent-selected defaults use the same path; the wrapper never rewrites a tier.
for selected_model in gpt-6.1-sol gpt-6-sol gpt-6-astra gpt-6-luna gpt-5.6-terra custom-model-id; do
  out="$(CLAUDE_CONFIG_DIR="$TMP/happy" CREW_CODEX_NO_JOB_BROKER=1 \
    bash "$CREW" task --background --model "$selected_model" --effort xhigh --write "model probe" 2>&1)" && rc=0 || rc=$?
  check "task preserves explicit $selected_model and effort" 0 \
    "ARGS:task,--background,--model,$selected_model,--effort,xhigh,--write,model probe" "$rc" "$out"
done
for review_command in review adversarial-review; do
  out="$(CLAUDE_CONFIG_DIR="$TMP/happy" CREW_CODEX_NO_JOB_BROKER=1 \
    bash "$CREW" "$review_command" --background --model gpt-6.1-sol --base main 2>&1)" && rc=0 || rc=$?
  check "$review_command forwards latest thread model" 0 \
    "ARGS:$review_command,--background,--model,gpt-6.1-sol,--base,main" "$rc" "$out"
done

# --- Capacity-retry cases: fake companion whose behavior depends on attempt count ---
mkdir -p "$TMP/retry/plugins" "$TMP/retry/install/scripts"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/retry/install\"}]}}" > "$TMP/retry/plugins/installed_plugins.json"
cat > "$TMP/retry/install/scripts/codex-companion.mjs" <<'EOF'
import fs from "node:fs";
const counter = process.env.CREW_TEST_COUNTER;
const failuresBeforeSuccess = Number(process.env.CREW_TEST_FAILURES ?? 0);
const failureMessage = process.env.CREW_TEST_FAILURE_MSG ?? "Selected model is at capacity";
let n = 0;
try { n = Number(fs.readFileSync(counter, "utf8")); } catch {}
n += 1;
fs.writeFileSync(counter, String(n));
if (n <= failuresBeforeSuccess) {
  console.error(`[codex] Turn failed: ${failureMessage}`);
  process.exit(1);
}
console.log("TASK-RESULT-OK");
EOF

run_retry() {
  CLAUDE_CONFIG_DIR="$TMP/retry" CREW_CODEX_RETRY_DELAYS="0 0" \
  CREW_TEST_COUNTER="$1" CREW_TEST_FAILURES="$2" CREW_TEST_FAILURE_MSG="${3:-Selected model is at capacity}" \
    bash "$CREW" task "test prompt" 2>&1
}

# Case 7: capacity failure twice, then success -> retried to success, exit 0
c="$TMP/retry/c7"; out="$(run_retry "$c" 2)" && rc=0 || rc=$?
attempts="$(cat "$c")"
check "capacity retry then success" 0 "TASK-RESULT-OK" "$rc" "$out"
check "capacity retry attempt count" 0 "^3$" "$rc" "$attempts"

# Case 8: capacity failure exhausts all attempts -> loud give-up, nonzero exit
c="$TMP/retry/c8"; out="$(run_retry "$c" 99)" && rc=0 || rc=$?
attempts="$(cat "$c")"
check "capacity exhausted gives up" 1 "still at capacity after 3 attempts" "$rc" "$out"
check "capacity exhausted attempt count" 1 "^3$" "$rc" "$attempts"

# Case 9: non-capacity failure -> NO retry, error and exit code pass through
c="$TMP/retry/c9"; out="$(run_retry "$c" 99 "authentication expired")" && rc=0 || rc=$?
attempts="$(cat "$c")"
check "non-capacity failure not retried" 1 "authentication expired" "$rc" "$out"
check "non-capacity single attempt" 1 "^1$" "$rc" "$attempts"

# Case 10: real (1s) delay exercises the sleep + jitter arithmetic path
c="$TMP/retry/c10"
start=$(date +%s)
out="$(CLAUDE_CONFIG_DIR="$TMP/retry" CREW_CODEX_RETRY_DELAYS="1" \
  CREW_TEST_COUNTER="$c" CREW_TEST_FAILURES=1 bash "$CREW" task "test prompt" 2>&1)" && rc=0 || rc=$?
elapsed=$(( $(date +%s) - start ))
check "real-delay retry succeeds" 0 "TASK-RESULT-OK" "$rc" "$out"
if [[ "$elapsed" -ge 1 ]]; then
  echo "PASS: real-delay retry actually slept (${elapsed}s)"
  pass=$((pass + 1))
else
  echo "FAIL: real-delay retry did not sleep (${elapsed}s)"
  fail=$((fail + 1))
fi

# --- await cases: fake companion serving status/result for a synthetic job ---
mkdir -p "$TMP/await/plugins" "$TMP/await/install/scripts"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/await/install\"}]}}" > "$TMP/await/plugins/installed_plugins.json"
cat > "$TMP/await/install/scripts/codex-companion.mjs" <<'EOF'
import fs from "node:fs";
const [cmd, jobId, flag] = process.argv.slice(2);
if (jobId === "task-missing") { console.log("{}"); process.exit(0); }
if (cmd === "result") {
  if (flag === "--json") console.log(JSON.stringify({ storedJob: { id: jobId, result: { rawOutput: "FINAL-RESULT" } } }));
  else console.log("FINAL-RESULT");
  process.exit(0);
}
// status: report `running` for CREW_TEST_RUNNING_POLLS polls, then terminal.
const counter = process.env.CREW_TEST_COUNTER;
const runningPolls = Number(process.env.CREW_TEST_RUNNING_POLLS ?? 0);
const terminal = process.env.CREW_TEST_TERMINAL ?? "completed";
let n = 0;
try { n = Number(fs.readFileSync(counter, "utf8")); } catch {}
n += 1;
fs.writeFileSync(counter, String(n));
const status = n <= runningPolls ? "running" : terminal;
console.log(JSON.stringify({
  job: { id: jobId, status, elapsed: `${n * 5}s`, logFile: "-", progressPreview: ["Turn started.", `poll ${n}`] }
}));
EOF

# Case 11: job already terminal -> DONE completed, exit 0, result archived
c="$TMP/await/c11"; arc="$TMP/await/archive11"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CREW_CODEX_ARCHIVE_DIR="$arc" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" CREW_TEST_RUNNING_POLLS=0 bash "$CREW" await task-x --for 5 2>&1)" && rc=0 || rc=$?
check "await terminal completed" 0 "DONE completed" "$rc" "$out"
check "await archived result" 0 "FINAL-RESULT" "$rc" "$(cat "$arc/task-x.result.txt" 2>/dev/null)"

# Case 12: job running past the deadline -> RUNNING line, exit 10, no archive
c="$TMP/await/c12"; arc="$TMP/await/archive12"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CREW_CODEX_ARCHIVE_DIR="$arc" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" CREW_TEST_RUNNING_POLLS=9999 bash "$CREW" await task-x --for 1 2>&1)" && rc=0 || rc=$?
check "await still running exits 10" 10 "RUNNING" "$rc" "$out"
check "await surfaces last progress" 10 "last: poll" "$rc" "$out"

# Case 13: job running then completing -> polls through, then DONE, exit 0
c="$TMP/await/c13"; arc="$TMP/await/archive13"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CREW_CODEX_ARCHIVE_DIR="$arc" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" CREW_TEST_RUNNING_POLLS=3 bash "$CREW" await task-x --for 30 2>&1)" && rc=0 || rc=$?
check "await polls then completes" 0 "DONE completed" "$rc" "$out"
check "await polled 4 times" 0 "^4$" "$rc" "$(cat "$c")"

# Case 14: terminal failure -> DONE failed, exit 1
c="$TMP/await/c14"; arc="$TMP/await/archive14"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CREW_CODEX_ARCHIVE_DIR="$arc" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" CREW_TEST_RUNNING_POLLS=0 CREW_TEST_TERMINAL=failed bash "$CREW" await task-x --for 5 2>&1)" && rc=0 || rc=$?
check "await failed job exits 1" 1 "DONE failed" "$rc" "$out"

# Case 15: unknown job -> exit 2 after tolerating transient misses
c="$TMP/await/c15"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" bash "$CREW" await task-missing --for 30 2>&1)" && rc=0 || rc=$?
check "await unknown job exits 2" 2 "not found in codex state" "$rc" "$out"

# --- pid-aware await: blocks on the job process, detects silent death --------
cat > "$TMP/await/install/scripts/pid-companion.mjs" <<'EOF'
import fs from "node:fs";
const [cmd, jobId, flag] = process.argv.slice(2);
if (cmd === "result") { console.log("FINAL-RESULT"); process.exit(0); }
const counter = process.env.CREW_TEST_COUNTER;
const pid = process.env.CREW_TEST_PID ?? "-";
const runningPolls = Number(process.env.CREW_TEST_RUNNING_POLLS ?? 0);
let n = 0;
try { n = Number(fs.readFileSync(counter, "utf8")); } catch {}
n += 1;
fs.writeFileSync(counter, String(n));
const status = n <= runningPolls ? "running" : "completed";
console.log(JSON.stringify({
  job: { id: jobId, status, elapsed: `${n}s`, logFile: "-", pid: Number(pid), progressPreview: [`poll ${n}`] }
}));
EOF
cp "$TMP/await/install/scripts/pid-companion.mjs" "$TMP/await/install/scripts/codex-companion.mjs"

# Case 17: live pid -> await blocks on the process, returns when it exits
sleep 2 & LIVE_PID=$!
c="$TMP/await/c17"; arc="$TMP/await/archive17"
start=$(date +%s)
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CREW_CODEX_ARCHIVE_DIR="$arc" \
  CREW_TEST_COUNTER="$c" CREW_TEST_PID="$LIVE_PID" CREW_TEST_RUNNING_POLLS=1 \
  bash "$CREW" await task-x --for 30 2>&1)" && rc=0 || rc=$?
elapsed=$(( $(date +%s) - start ))
wait "$LIVE_PID" 2>/dev/null || true
check "pid-block completes on process exit" 0 "DONE completed" "$rc" "$out"
if [[ "$elapsed" -ge 2 && "$elapsed" -le 8 ]]; then
  echo "PASS: pid-block woke on exit, not on poll timer (${elapsed}s)"
  pass=$((pass + 1))
else
  echo "FAIL: pid-block timing off (${elapsed}s, expected 2-8s)"
  fail=$((fail + 1))
fi

# Case 18: dead pid + status stuck running -> STALE, exit 3 (silent-death signal)
DEAD_PID=$(bash -c 'echo $$')
c="$TMP/await/c18"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" CREW_TEST_PID="$DEAD_PID" CREW_TEST_RUNNING_POLLS=9999 \
  bash "$CREW" await task-x --for 30 2>&1)" && rc=0 || rc=$?
check "stale job detected" 3 "died without reporting" "$rc" "$out"

# restore the plain fake for any later cases
cat > "$TMP/await/install/scripts/codex-companion.mjs" <<'EOF'
import fs from "node:fs";
const [cmd, jobId, flag] = process.argv.slice(2);
if (jobId === "task-missing") { console.log("{}"); process.exit(0); }
if (cmd === "result") { console.log("FINAL-RESULT"); process.exit(0); }
console.log(JSON.stringify({ job: { id: jobId, status: "completed", elapsed: "1s", logFile: "-", pid: null, progressPreview: ["done"] } }));
EOF

# Case 16: await requires a job id
out="$(CLAUDE_CONFIG_DIR="$TMP/await" bash "$CREW" await --for 5 2>&1)" && rc=0 || rc=$?
check "await without job id" 2 "needs a job id" "$rc" "$out"

# --- prompt-contract cases: the dispatch prompts must carry the cwd rule ----
# The failure these guard against is silent: an await run from a different
# directory hashes to a different state dir and reports a live job as gone.
AGENT_DIR="$HERE/../agents"
SKILL_FILE="$HERE/../skills/crew-runtime/SKILL.md"

check_absent() { # assert a phrase is NOT present; the inverse of check_contains
  local name="$1" haystack="$2" phrase="$3"
  if grep -qF -- "$phrase" <<<"$haystack"; then
    echo "FAIL: $name (unexpectedly found '$phrase')"
    fail=$((fail + 1))
  else
    echo "PASS: $name"
    pass=$((pass + 1))
  fi
}

check_contains() {
  local name="$1" file="$2" phrase="$3"
  if grep -qF -- "$phrase" "$file"; then
    echo "PASS: $name"
    pass=$((pass + 1))
  else
    echo "FAIL: $name (missing '$phrase' in $(basename "$file"))"
    fail=$((fail + 1))
  fi
}

for f in "$AGENT_DIR"/*.md "$SKILL_FILE"; do
  b="$(basename "$f")"
  check_contains "$b pins calls to the sandbox root" "$f" \
    'cd <sandbox root> && '
  check_contains "$b prefixes the await command" "$f" \
    'cd <sandbox root> && crew-codex await <job-id> --for 540'
  check_contains "$b keeps launch and await in separate calls" "$f" \
    'never share a shell call'
  check_contains "$b holds the await deadline at 540" "$f" \
    '--for 540'
  check_contains "$b probes ps before relaunch" "$f" \
    'ps -eo pid,args | grep <job-id>'
  check_contains "$b probes the job state file before relaunch" "$f" \
    '~/.claude/plugins/data/codex-openai-codex/state/*/jobs/<job-id>.json'
  check_contains "$b gates relaunch on both probes" "$f" \
    'relaunch-once rule applies only when both probes come back empty'
done

# --- cwd-mismatch hint: exit 2 names the directory the job really lives in --
mkdir -p "$TMP/cwd/elsewhere/state/vail-deadbeef/jobs" "$TMP/cwd/empty"
cat > "$TMP/cwd/elsewhere/state/vail-deadbeef/jobs/task-missing.json" <<'EOF'
{"id":"task-missing","status":"running","request":{"cwd":"/home/chad/projects/vail"},"workspaceRoot":"/home/chad/projects/vail"}
EOF

# Case 19: job present in a sibling state dir -> exit 2 carries the cwd hint
c="$TMP/await/c19"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CLAUDE_PLUGIN_DATA="$TMP/cwd/elsewhere" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" bash "$CREW" await task-missing --for 30 2>&1)" && rc=0 || rc=$?
check "exit 2 names the job's real cwd" 2 \
  "job exists under cwd /home/chad/projects/vail; re-run from that directory" "$rc" "$out"

# Case 20: job nowhere on disk -> plain not-found, no misleading hint
c="$TMP/await/c20"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CLAUDE_PLUGIN_DATA="$TMP/cwd/empty" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" bash "$CREW" await task-missing --for 30 2>&1)" && rc=0 || rc=$?
if [[ "$rc" == 2 ]] && ! grep -q "job exists under cwd" <<<"$out"; then
  echo "PASS: genuinely gone job gets no cwd hint"
  pass=$((pass + 1))
else
  echo "FAIL: genuinely gone job got a cwd hint (exit=$rc; output: $out)"
  fail=$((fail + 1))
fi

# Case 21: state file whose cwd IS this cwd -> not a mismatch, so no hint
mkdir -p "$TMP/cwd/samedir/state/here-cafe/jobs"
printf '{"id":"task-missing","request":{"cwd":"%s"}}\n' "$PWD" \
  > "$TMP/cwd/samedir/state/here-cafe/jobs/task-missing.json"
c="$TMP/await/c21"
out="$(CLAUDE_CONFIG_DIR="$TMP/await" CLAUDE_PLUGIN_DATA="$TMP/cwd/samedir" CREW_CODEX_POLL_SECS=0 \
  CREW_TEST_COUNTER="$c" bash "$CREW" await task-missing --for 30 2>&1)" && rc=0 || rc=$?
if [[ "$rc" == 2 ]] && ! grep -q "job exists under cwd" <<<"$out"; then
  echo "PASS: same-cwd state file is not reported as a mismatch"
  pass=$((pass + 1))
else
  echo "FAIL: same-cwd state file reported as a mismatch (exit=$rc; output: $out)"
  fail=$((fail + 1))
fi

# Case 22: status/result hits the same trap -> passthrough error gains the hint
mkdir -p "$TMP/notfound/plugins" "$TMP/notfound/install/scripts" \
  "$TMP/cwd/elsewhere/state/vail-deadbeef/jobs"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/notfound/install\"}]}}" > "$TMP/notfound/plugins/installed_plugins.json"
cat > "$TMP/notfound/install/scripts/codex-companion.mjs" <<'EOF'
console.error("codex: job not found");
process.exit(1);
EOF
cp "$TMP/cwd/elsewhere/state/vail-deadbeef/jobs/task-missing.json" \
  "$TMP/cwd/elsewhere/state/vail-deadbeef/jobs/task-aaa1-bbb2.json"
out="$(CLAUDE_CONFIG_DIR="$TMP/notfound" CLAUDE_PLUGIN_DATA="$TMP/cwd/elsewhere" \
  bash "$CREW" result task-aaa1-bbb2 2>&1)" && rc=0 || rc=$?
check "result not-found gains the cwd hint" 1 \
  "job exists under cwd /home/chad/projects/vail; re-run from that directory" "$rc" "$out"
check "result not-found keeps the companion error" 1 "codex: job not found" "$rc" "$out"

# --- redirect: interrupt a running job and resume its thread on new text ----
mkdir -p "$TMP/redir/plugins" "$TMP/redir/install/scripts" "$TMP/redir/data/state/lab-1/jobs"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/redir/install\"}]}}" > "$TMP/redir/plugins/installed_plugins.json"
# Fake companion: records argv, and answers `task` with a new job id.
cat > "$TMP/redir/install/scripts/codex-companion.mjs" <<'EOF'
import fs from "node:fs";
const argv = process.argv.slice(2);
fs.appendFileSync(process.env.CREW_TEST_ARGV_LOG,
  argv.join(" ") + " @endpoint=" + (process.env.CODEX_COMPANION_APP_SERVER_ENDPOINT || "none") + "\n");
if (argv[0] === "task") { console.log("Codex Resume started in the background as task-new1-aaa1."); }
else if (argv[0] === "cancel") { console.log("Cancelled " + argv[1] + "."); }
process.exit(0);
EOF

write_job() { # dir id status thread createdAt model effort write
  # A real job record always carries a pid. Fixtures without one hid a field
  # gluing bug for a whole release: crew_job_meta's last field was empty, bash
  # stripped the trailing tab, and the corruption only appeared against live
  # data. Keep every field populated the way production populates it.
  printf '{"id":"%s","status":"%s","threadId":"%s","createdAt":"%s","turnId":"turn-%s","pid":424242,"request":{"cwd":"%s","model":"%s","effort":"%s","write":%s}}\n' \
    "$2" "$3" "$4" "$5" "$2" "$PWD" "$6" "$7" "$8" > "$1/$2.json"
}
JOBS="$TMP/redir/data/state/lab-1/jobs"
write_broker_stub "$TMP/redir/install/scripts"
write_job "$JOBS" task-old1-bbb1 running thread-A 2026-01-01T00:00:00.000Z gpt-5.6-terra xhigh true

run_redirect() {
  CLAUDE_CONFIG_DIR="$TMP/redir" CLAUDE_PLUGIN_DATA="$TMP/redir/data" \
  CREW_TEST_ARGV_LOG="$1" bash "$CREW" redirect "${@:2}" 2>&1
}

# Case 23: redirect without a job id
out="$(CLAUDE_CONFIG_DIR="$TMP/redir" bash "$CREW" redirect 2>&1)" && rc=0 || rc=$?
check "redirect without job id" 2 "needs a job id" "$rc" "$out"

# Case 24: redirect without instruction text
out="$(CLAUDE_CONFIG_DIR="$TMP/redir" CLAUDE_PLUGIN_DATA="$TMP/redir/data" bash "$CREW" redirect task-old1-bbb1 2>&1)" && rc=0 || rc=$?
check "redirect without instruction" 2 "needs the new instruction text" "$rc" "$out"

# Case 25: happy path -> cancels, resumes the thread, reports old -> new
log="$TMP/redir/argv1"; : > "$log"
out="$(run_redirect "$log" task-old1-bbb1 "Change of plan: stop and write NOTES.md")" && rc=0 || rc=$?
check "redirect interrupts the running job" 0 "interrupted task-old1-bbb1" "$rc" "$out"
check "redirect reports the successor" 0 "REDIRECTED task-old1-bbb1 -> task-new1-aaa1" "$rc" "$out"
check "redirect cancelled first" 0 "^cancel task-old1-bbb1 " "$rc" "$(cat "$log")"
check "redirect resumed the same thread" 0 "task --background --resume-last" "$rc" "$(cat "$log")"
check "redirect carries the write posture" 0 "resume-last --write" "$rc" "$(cat "$log")"
check "redirect carries model and effort" 0 "\-\-model gpt-5.6-terra --effort xhigh" "$rc" "$(cat "$log")"
check "redirect passes the instruction" 0 "Change of plan: stop and write NOTES.md" "$rc" "$(cat "$log")"

# Case 26: explicit --model/--effort override the job's own pins
log="$TMP/redir/argv2"; : > "$log"
out="$(run_redirect "$log" task-old1-bbb1 --model gpt-5.6-sol --effort high "escalate this")" && rc=0 || rc=$?
check "redirect honours model override" 0 "\-\-model gpt-5.6-sol --effort high" "$rc" "$(cat "$log")"

# Case 27: refuse when the target is not the newest task job for this cwd
write_job "$JOBS" task-new2-ccc2 running thread-B 2026-06-01T00:00:00.000Z gpt-5.6-terra xhigh true
log="$TMP/redir/argv3"; : > "$log"
out="$(run_redirect "$log" task-old1-bbb1 "too late")" && rc=0 || rc=$?
check "redirect refuses a non-newest job" 2 "is not the newest task job for this cwd" "$rc" "$out"

# Case 28: unknown job id -> not found, with the cwd hint machinery intact
log="$TMP/redir/argv4"; : > "$log"
out="$(run_redirect "$log" task-zzz9-zzz9 "nothing to redirect")" && rc=0 || rc=$?
check "redirect on unknown job" 2 "not found in codex state" "$rc" "$out"

# --- await exit 4: a cancelled job whose thread was picked up by a successor -
mkdir -p "$TMP/sup/plugins" "$TMP/sup/install/scripts" "$TMP/sup/data/state/lab-1/jobs"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/sup/install\"}]}}" > "$TMP/sup/plugins/installed_plugins.json"
cat > "$TMP/sup/install/scripts/codex-companion.mjs" <<'EOF'
const [cmd, jobId] = process.argv.slice(2);
if (cmd === "result") { console.log("FINAL-RESULT"); process.exit(0); }
console.log(JSON.stringify({ job: { id: jobId, status: "cancelled", elapsed: "9s", logFile: "-", pid: null, progressPreview: ["stopped"] } }));
EOF
SJOBS="$TMP/sup/data/state/lab-1/jobs"
printf '{"id":"task-old2-ddd2","status":"cancelled","threadId":"thread-Z","createdAt":"2026-01-01T00:00:00.000Z"}\n' > "$SJOBS/task-old2-ddd2.json"
printf '{"id":"task-new3-eee3","status":"running","threadId":"thread-Z","createdAt":"2026-01-02T00:00:00.000Z"}\n' > "$SJOBS/task-new3-eee3.json"

# Case 29: cancelled + later job on the same thread -> SUPERSEDED, exit 4
out="$(CLAUDE_CONFIG_DIR="$TMP/sup" CLAUDE_PLUGIN_DATA="$TMP/sup/data" CREW_CODEX_ARCHIVE_DIR="$TMP/sup/arc" \
  CREW_CODEX_POLL_SECS=0 bash "$CREW" await task-old2-ddd2 --for 5 2>&1)" && rc=0 || rc=$?
check "cancelled job names its successor" 4 "SUPERSEDED task-old2-ddd2 -> task-new3-eee3" "$rc" "$out"

# Case 30: cancelled with NO successor -> ordinary DONE cancelled, exit 1
printf '{"id":"task-lone1-fff1","status":"cancelled","threadId":"thread-Y","createdAt":"2026-01-01T00:00:00.000Z"}\n' > "$SJOBS/task-lone1-fff1.json"
out="$(CLAUDE_CONFIG_DIR="$TMP/sup" CLAUDE_PLUGIN_DATA="$TMP/sup/data" CREW_CODEX_ARCHIVE_DIR="$TMP/sup/arc" \
  CREW_CODEX_POLL_SECS=0 bash "$CREW" await task-lone1-fff1 --for 5 2>&1)" && rc=0 || rc=$?
check "lone cancelled job stays a failure" 1 "DONE cancelled" "$rc" "$out"

# Case 31: the prompts tell agents how to handle a redirect
for f in "$AGENT_DIR"/*.md "$SKILL_FILE"; do
  check_contains "$(basename "$f") handles the SUPERSEDED exit" "$f" "SUPERSEDED"
done
check_contains "SKILL.md documents redirect" "$SKILL_FILE" "crew-codex redirect <job-id>"
check_contains "SKILL.md warns against cancel-and-restart" "$SKILL_FILE" "cancel\` plus a fresh dispatch is worse"

# --- patch: applying the codex-plugin fix to whatever version is installed ---
# The fixture is reconstructed FROM the shipped patch's own pre-image, so these
# cases exercise the real patch file and never touch the real codex install.
PATCH_FILE="$HERE/../patches/codex-plugin-queue-passthrough.patch"

build_fixture() { # $1 = destination plugin root
  python3 - "$PATCH_FILE" "$1" <<'PYEOF'
import sys, os
patch, out = sys.argv[1], sys.argv[2]
cur, files, order = None, {}, []
for line in open(patch):
    if line.startswith("--- a/"):
        cur = line[6:].strip()
        if cur not in files:
            files[cur] = []; order.append(cur)
    elif line.startswith("+++") or cur is None:
        continue
    elif line.startswith("@@"):
        files[cur].append("// ---- unrelated code between hunks ----")
    elif line.startswith(" ") or line.startswith("-"):
        files[cur].append(line[1:].rstrip("\n"))
for f in order:
    p = os.path.join(out, f)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w").write("\n".join(files[f]) + "\n")
PYEOF
}

mkdir -p "$TMP/patch/plugins" "$TMP/patch/install/scripts"
touch "$TMP/patch/install/scripts/codex-companion.mjs"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/patch/install\"}]}}" > "$TMP/patch/plugins/installed_plugins.json"
build_fixture "$TMP/patch/install"

crew_patch() { CLAUDE_CONFIG_DIR="$TMP/patch" bash "$CREW" patch "$@" 2>&1; }

# Case 32: an unpatched install reports appliable, exit 10
out="$(crew_patch --status)" && rc=0 || rc=$?
check "patch status on unpatched install" 10 "UNPATCHED" "$rc" "$out"

# Case 33: apply succeeds and verifies
out="$(crew_patch --apply)" && rc=0 || rc=$?
check "patch applies" 0 "PATCHED" "$rc" "$out"
check "patch flips experimentalApi" 0 "experimentalApi: true" "$rc" "$(cat "$TMP/patch/install/scripts/lib/app-server.mjs")"
check "patch forwards the queue method" 0 "thread/queue/add" "$rc" "$(cat "$TMP/patch/install/scripts/app-server-broker.mjs")"
check "patch keeps interrupt forwarded" 0 "turn/interrupt" "$rc" "$(cat "$TMP/patch/install/scripts/app-server-broker.mjs")"
check "patch leaves a backup" 0 "experimentalApi: false" "$rc" "$(cat "$TMP/patch/install/scripts/lib/app-server.mjs.crew-orig" 2>/dev/null)"

# Case 34: status now reports patched, and a second apply is a no-op
out="$(crew_patch --status)" && rc=0 || rc=$?
check "patch status on patched install" 0 "PATCHED" "$rc" "$out"
out="$(crew_patch --apply)" && rc=0 || rc=$?
check "patch apply is idempotent" 0 "already patched" "$rc" "$out"

# Case 35: revert restores the original, and a second revert is a no-op
out="$(crew_patch --revert)" && rc=0 || rc=$?
check "patch reverts" 0 "UNPATCHED" "$rc" "$out"
check "revert restores experimentalApi" 0 "experimentalApi: false" "$rc" "$(cat "$TMP/patch/install/scripts/lib/app-server.mjs")"
out="$(crew_patch --revert)" && rc=0 || rc=$?
check "patch revert is idempotent" 0 "nothing to revert" "$rc" "$out"

# Case 36: a DIFFERENT plugin version (line drift) still takes the patch
mkdir -p "$TMP/patchdrift/plugins" "$TMP/patchdrift/install/scripts"
touch "$TMP/patchdrift/install/scripts/codex-companion.mjs"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/patchdrift/install\"}]}}" > "$TMP/patchdrift/plugins/installed_plugins.json"
build_fixture "$TMP/patchdrift/install"
python3 - "$TMP/patchdrift/install" <<'PYEOF'
import sys, os
root = sys.argv[1]
for rel in ["scripts/lib/app-server.mjs", "scripts/app-server-broker.mjs"]:
    p = os.path.join(root, rel)
    lines = open(p).read().split("\n")
    lines = ["// a later release added this above" for _ in range(37)] + lines
    open(p, "w").write("\n".join(lines))
PYEOF
out="$(CLAUDE_CONFIG_DIR="$TMP/patchdrift" bash "$CREW" patch --apply 2>&1)" && rc=0 || rc=$?
check "patch survives version line drift" 0 "PATCHED" "$rc" "$out"
check "drifted install got the queue method" 0 "thread/queue/add" "$rc" "$(cat "$TMP/patchdrift/install/scripts/app-server-broker.mjs")"

# Case 37: a version that moved the code out from under the patch -> refuse
mkdir -p "$TMP/patchgone/plugins" "$TMP/patchgone/install/scripts/lib"
touch "$TMP/patchgone/install/scripts/codex-companion.mjs"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/patchgone/install\"}]}}" > "$TMP/patchgone/plugins/installed_plugins.json"
echo "// upstream rewrote this file entirely" > "$TMP/patchgone/install/scripts/lib/app-server.mjs"
echo "// upstream rewrote this file entirely" > "$TMP/patchgone/install/scripts/app-server-broker.mjs"
out="$(CLAUDE_CONFIG_DIR="$TMP/patchgone" bash "$CREW" patch --apply 2>&1)" && rc=0 || rc=$?
check "patch refuses to half-apply" 1 "refusing to half-apply" "$rc" "$out"
check "refused install is untouched" 1 "upstream rewrote this file entirely" "$rc" "$(cat "$TMP/patchgone/install/scripts/app-server-broker.mjs")"

# --- queue: say something to a running job without stopping it ---------------
# Stubs the codex plugin's app-server client, so the real lib/appserver-cli.mjs
# and the real queue/await paths run against a scripted server.
mkdir -p "$TMP/q/plugins" "$TMP/q/install/scripts/lib" "$TMP/q/data/state/lab-1/jobs" "$TMP/q/arc"
echo "{\"version\":2,\"plugins\":{\"codex@openai-codex\":[{\"installPath\":\"$TMP/q/install\"}]}}" > "$TMP/q/plugins/installed_plugins.json"
cat > "$TMP/q/install/scripts/codex-companion.mjs" <<'EOF'
const [cmd, jobId] = process.argv.slice(2);
if (cmd === "cancel" && process.env.CREW_TEST_CANCEL_FAIL) {
  console.error("cancel failed: " + process.env.CREW_TEST_CANCEL_FAIL);
  process.exit(1);
}
if (cmd === "result") { console.log("FIRST-TURN-RESULT"); process.exit(0); }
console.log(JSON.stringify({ job: { id: jobId, status: "completed", elapsed: "4s", logFile: "-", pid: null, progressPreview: ["done"] } }));
EOF
cat > "$TMP/q/install/scripts/lib/app-server.mjs" <<'EOF'
import fs from "node:fs";
export class CodexAppServerClient {
  static async connect() { return new CodexAppServerClient(); }
  async request(method, params) {
    fs.appendFileSync(process.env.CREW_TEST_RPC_LOG, method + " " + JSON.stringify(params) + "\n");
    if (process.env.CREW_TEST_DUMP_ENDPOINT) {
      fs.appendFileSync(process.env.CREW_TEST_RPC_LOG,
        "endpoint=" + (process.env.CODEX_COMPANION_APP_SERVER_ENDPOINT || "<none>") + "\n");
    }
    if (method === "thread/queue/add") {
      if (process.env.CREW_TEST_QUEUE_FAIL) throw new Error(process.env.CREW_TEST_QUEUE_FAIL);
      return { queuedSubmission: { id: "sub-1", clientUserMessageId: params.clientUserMessageId } };
    }
    if (method === "turn/steer") {
      if (process.env.CREW_TEST_STEER_FAIL) throw new Error(process.env.CREW_TEST_STEER_FAIL);
      return { turnId: params.expectedTurnId };
    }
    if (method === "thread/turns/list") {
      if (process.env.CREW_TEST_NO_TURN) return { data: [] };
      // Mirror a real turn: chatter lands first, the final answer only once the
      // turn actually finishes. CREW_TEST_CHATTER_POLLS controls how many reads
      // see chatter alone, which is the race that made an early capture return
      // a preamble instead of the answer.
      let n = 0;
      const counter = process.env.CREW_TEST_TURN_COUNTER;
      if (counter) {
        try { n = Number(fs.readFileSync(counter, "utf8")); } catch {}
        n += 1;
        fs.writeFileSync(counter, String(n));
      }
      const chatterOnly = n <= Number(process.env.CREW_TEST_CHATTER_POLLS ?? 0);
      const items = [
        { type: "userMessage", id: "i1", clientId: process.env.CREW_TEST_CLIENT_ID, content: [] },
        { type: "agentMessage", id: "i2", text: "preamble, about to start", phase: "chatter" }
      ];
      if (!chatterOnly) {
        items.push({ type: "agentMessage", id: "i3", text: "QUEUED-TURN-ANSWER", phase: "final_answer" });
      }
      return { data: [{ id: "turn-2", items }] };
    }
    return {};
  }
  async close() {}
}
EOF
write_broker_stub "$TMP/q/install/scripts"
QJOBS="$TMP/q/data/state/lab-1/jobs"
qjob() { # id status thread
  printf '{"id":"%s","status":"%s","threadId":"%s","createdAt":"2026-02-01T00:00:00.000Z","pid":424242,"request":{"cwd":"%s","model":"gpt-5.6-terra","effort":"xhigh","write":true}}\n' \
    "$1" "$2" "$3" "$PWD" > "$QJOBS/$1.json"
}
qjob task-run1-aaa1 running thread-Q

crew_queue() {
  CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  CREW_TEST_RPC_LOG="${CREW_TEST_RPC_LOG:-$TMP/q/rpc.log}" bash "$CREW" queue "$@" 2>&1
}

# Case 38: usage errors
out="$(CLAUDE_CONFIG_DIR="$TMP/q" bash "$CREW" queue 2>&1)" && rc=0 || rc=$?
check "queue without job id" 2 "needs a job id" "$rc" "$out"
out="$(crew_queue task-run1-aaa1)" && rc=0 || rc=$?
check "queue without message" 2 "needs the message text" "$rc" "$out"

# Case 39: happy path -> queues, records the marker, never cancels
: > "$TMP/q/rpc.log"
out="$(CREW_TEST_RPC_LOG="$TMP/q/rpc.log" crew_queue task-run1-aaa1 "finish then write NOTES.md")" && rc=0 || rc=$?
check "queue reports success" 0 "QUEUED task-run1-aaa1" "$rc" "$out"
check "queue names the client id" 0 "crew-task-run1-aaa1-1" "$rc" "$out"
check "queue used thread/queue/add" 0 "^thread/queue/add" "$rc" "$(cat "$TMP/q/rpc.log")"
check "queue sent the message text" 0 "finish then write NOTES.md" "$rc" "$(cat "$TMP/q/rpc.log")"
check_absent "queue never interrupts the turn" "$(cat "$TMP/q/rpc.log")" "turn/interrupt"
check_absent "queue never cancels the job" "$(cat "$TMP/q/rpc.log")" "cancel"
check "queue records the marker" 0 "crew-task-run1-aaa1-1" "$rc" "$(cat "$TMP/q/arc/task-run1-aaa1.queued.txt")"

# Case 40: a second queued message increments the client id
out="$(CREW_TEST_RPC_LOG="$TMP/q/rpc.log" crew_queue task-run1-aaa1 "and update the README")" && rc=0 || rc=$?
check "second queue increments the id" 0 "crew-task-run1-aaa1-2" "$rc" "$out"

# Case 41: refuse to queue onto a job that will never read it
qjob task-done1-bbb1 completed thread-R
out="$(crew_queue task-done1-bbb1 "too late")" && rc=0 || rc=$?
check "queue refuses a finished job" 2 "would never be read" "$rc" "$out"

# Case 42: unknown job id
out="$(crew_queue task-zzz9-zzz9 "nobody home")" && rc=0 || rc=$?
check "queue on unknown job" 2 "not found in codex state" "$rc" "$out"

# Case 43: an unpatched plugin refusing the method points at the patch
out="$(CREW_TEST_QUEUE_FAIL="Shared Codex broker is busy." CREW_TEST_RPC_LOG="$TMP/q/rpc.log" \
  crew_queue task-run1-aaa1 "will be refused")" && rc=0 || rc=$?
check "queue failure explains the patch" 1 "crew-codex patch --apply" "$rc" "$out"

# Case 44: await captures the queued turn's FINAL answer into the archive
: > "$TMP/q/arc/task-run1-aaa1.queued.txt"
printf 'crew-task-run1-aaa1-1\tfinish then write NOTES.md\n' > "$TMP/q/arc/task-run1-aaa1.queued.txt"
out="$(CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  CREW_CODEX_POLL_SECS=0 CREW_TEST_RPC_LOG="$TMP/q/rpc.log" CREW_TEST_CLIENT_ID="crew-task-run1-aaa1-1" \
  CREW_TEST_TURN_COUNTER="$TMP/q/turnc" CREW_TEST_CHATTER_POLLS=2 \
  bash "$CREW" await task-run1-aaa1 --for 5 2>&1)" && rc=0 || rc=$?
check "await reports captured replies" 0 "QUEUED-REPLIES 1/1 captured" "$rc" "$out"
check "await appends the follow-up" 0 "QUEUED-TURN-ANSWER" "$rc" "$(cat "$TMP/q/arc/task-run1-aaa1.result.txt")"
check "await keeps the first turn's result" 0 "FIRST-TURN-RESULT" "$rc" "$(cat "$TMP/q/arc/task-run1-aaa1.result.txt")"
check_absent "await captures the answer, not the preamble" \
  "$(cat "$TMP/q/arc/task-run1-aaa1.result.txt")" "preamble, about to start"

# Case 45: a queued turn that never runs is reported, not silently dropped
printf 'crew-task-run2-ccc2\tnever read\n' > "$TMP/q/arc/task-run2-ccc2.queued.txt"
qjob task-run2-ccc2 running thread-S
out="$(CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  CREW_CODEX_POLL_SECS=0 CREW_CODEX_QUEUE_GRACE_SECS=0 CREW_TEST_RPC_LOG="$TMP/q/rpc.log" \
  CREW_TEST_NO_TURN=1 bash "$CREW" await task-run2-ccc2 --for 5 2>&1)" && rc=0 || rc=$?
check "unread queued message is reported" 0 "QUEUED-REPLIES 0/1" "$rc" "$out"

# --- steer: interject into the turn that is running right now ----------------
qjob task-steer1-ddd1 running thread-T
python3 - "$QJOBS/task-steer1-ddd1.json" <<'PYEOF'
import json, sys
p = sys.argv[1]
j = json.load(open(p))
j["turnId"] = "turn-live-1"
json.dump(j, open(p, "w"))
PYEOF

crew_steer() {
  CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  CREW_TEST_RPC_LOG="$TMP/q/rpc.log" bash "$CREW" steer "$@" 2>&1
}

# Case 46: usage errors
out="$(CLAUDE_CONFIG_DIR="$TMP/q" bash "$CREW" steer 2>&1)" && rc=0 || rc=$?
check "steer without job id" 2 "needs a job id" "$rc" "$out"
out="$(crew_steer task-steer1-ddd1)" && rc=0 || rc=$?
check "steer without message" 2 "needs the message text" "$rc" "$out"

# Case 47: happy path -> turn/steer with the live turn id, nothing destroyed
: > "$TMP/q/rpc.log"
out="$(crew_steer task-steer1-ddd1 "stop adding files and fix the test")" && rc=0 || rc=$?
check "steer reports success" 0 "STEERED task-steer1-ddd1" "$rc" "$out"
check "steer used turn/steer" 0 "^turn/steer" "$rc" "$(cat "$TMP/q/rpc.log")"
check "steer sends expectedTurnId" 0 '"expectedTurnId":"turn-live-1"' "$rc" "$(cat "$TMP/q/rpc.log")"
# The turn id must go out CLEAN. A short `read` glues later meta fields onto it,
# which the server rejects as an expected-turn mismatch.
check_absent "steered turn id carries no glued-on field" \
  "$(grep '^turn/steer' "$TMP/q/rpc.log")" '"expectedTurnId":"turn-live-1\t'
check "steer sends the message" 0 "stop adding files and fix the test" "$rc" "$(cat "$TMP/q/rpc.log")"
check_absent "steer never interrupts" "$(cat "$TMP/q/rpc.log")" "turn/interrupt"
check_absent "steer never queues instead" "$(cat "$TMP/q/rpc.log")" "thread/queue/add"
check_absent "steer leaves no follow-up marker to collect" \
  "$(ls "$TMP/q/arc")" "task-steer1-ddd1.queued.txt"

# Case 48: a job with no live turn cannot be steered, and says what to use
qjob task-steer2-eee2 completed thread-U
out="$(crew_steer task-steer2-eee2 "too late")" && rc=0 || rc=$?
check "steer refuses a finished job" 2 "no live turn to steer" "$rc" "$out"
check "steer points at queue instead" 2 "crew-codex queue" "$rc" "$out"

# Case 49: turn ended between read and send -> explain, do not fall back blindly
out="$(CREW_TEST_STEER_FAIL="no active turn to steer" crew_steer task-steer1-ddd1 "just missed it")" && rc=0 || rc=$?
check "steer explains a turn that moved on" 1 "use crew-codex queue" "$rc" "$out"

# Case 50: an unpatched plugin refusing to steer points at the patch
out="$(CREW_TEST_STEER_FAIL="Shared Codex broker is busy." crew_steer task-steer1-ddd1 "refused")" && rc=0 || rc=$?
check "steer failure explains the patch" 1 "crew-codex patch --apply" "$rc" "$out"

# Case 51: the patch must forward steer, not just queue
check_contains "patch forwards turn/steer" "$PATCH_FILE" "turn/steer"
check_contains "patch still forwards interrupt" "$PATCH_FILE" "turn/interrupt"

# --- per-job brokers and reaping --------------------------------------------
# A broker holds a codex app-server, so a leaked one is expensive. Stand-in
# "brokers" are real sleep processes, which is all crew_kill_broker needs.
fake_broker() { # $1 = job id -> writes sidecar, echoes the pid
  local job="$1" dir pid
  dir="$(mktemp -d "$TMP/q/fakebroker-XXXXXX")"
  sleep 300 >/dev/null 2>&1 & pid=$!
  disown "$pid" 2>/dev/null || true
  # fake_broker is called through command substitution, so a variable set here
  # dies with the subshell. The pid file is the only channel back to cleanup.
  echo "$pid" >> "$TMP/stub_pids"
  : > "$dir/broker.sock"; echo "$pid" > "$dir/broker.pid"; : > "$dir/broker.log"
  printf 'unix:%s/broker.sock\t%s\t%s\t%s\n' "$dir" "$pid" "$dir" "$PWD" \
    > "$TMP/q/arc/$job.broker"
  echo "$pid"
}
crew_reap() {
  CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
    bash "$CREW" reap 2>&1
}

# Case 52: a terminal job's broker is reaped and its sidecar removed
qjob task-reap1-aaa1 completed thread-R1
bp1="$(fake_broker task-reap1-aaa1)"
out="$(crew_reap)" && rc=0 || rc=$?
check "reap runs" 0 "REAPED" "$rc" "$out"
if kill -0 "$bp1" 2>/dev/null; then
  echo "FAIL: terminal job's broker survived reap"; fail=$((fail + 1)); kill -9 "$bp1" 2>/dev/null || true
else
  echo "PASS: terminal job's broker is reaped"; pass=$((pass + 1))
fi
check_absent "reaped broker leaves no sidecar" "$(ls "$TMP/q/arc")" "task-reap1-aaa1.broker"

# Case 53: a RUNNING job with a live worker keeps its broker
sleep 300 >/dev/null 2>&1 & live_worker=$!
disown "$live_worker" 2>/dev/null || true
python3 - "$QJOBS/task-reap2-bbb2.json" "$live_worker" <<'PYEOF'
import json, sys
json.dump({"id": "task-reap2-bbb2", "status": "running", "threadId": "thread-R2",
           "createdAt": "2026-02-02T00:00:00.000Z", "pid": int(sys.argv[2]),
           "request": {"cwd": "/nowhere"}}, open(sys.argv[1], "w"))
PYEOF
bp2="$(fake_broker task-reap2-bbb2)"
crew_reap >/dev/null 2>&1 || true
if kill -0 "$bp2" 2>/dev/null; then
  echo "PASS: live job keeps its broker"; pass=$((pass + 1))
else
  echo "FAIL: reap killed a live job's broker"; fail=$((fail + 1))
fi

# Case 54: status says running but the worker is DEAD -> reap anyway.
# This is the session-death path; without it every crashed job leaks a broker.
sleep 300 >/dev/null 2>&1 & dead_worker=$!
kill -9 "$dead_worker" 2>/dev/null || true; wait "$dead_worker" 2>/dev/null || true
python3 - "$QJOBS/task-reap3-ccc3.json" "$dead_worker" <<'PYEOF'
import json, sys
json.dump({"id": "task-reap3-ccc3", "status": "running", "threadId": "thread-R3",
           "createdAt": "2026-02-03T00:00:00.000Z", "pid": int(sys.argv[2]),
           "request": {"cwd": "/nowhere"}}, open(sys.argv[1], "w"))
PYEOF
bp3="$(fake_broker task-reap3-ccc3)"
crew_reap >/dev/null 2>&1 || true
if kill -0 "$bp3" 2>/dev/null; then
  echo "FAIL: orphaned broker of a silently dead job survived"; fail=$((fail + 1)); kill -9 "$bp3" 2>/dev/null || true
else
  echo "PASS: silently dead job's broker is reaped"; pass=$((pass + 1))
fi
check_absent "orphan reap leaves no sidecar" "$(ls "$TMP/q/arc")" "task-reap3-ccc3.broker"
kill -9 "$bp2" 2>/dev/null || true; kill -9 "$live_worker" 2>/dev/null || true

# Case 55: steer/queue route to the job's recorded broker
qjob task-route1-ddd1 running thread-RT
python3 - "$QJOBS/task-route1-ddd1.json" <<'PYEOF'
import json, sys
j = json.load(open(sys.argv[1])); j["turnId"] = "turn-rt-1"; json.dump(j, open(sys.argv[1], "w"))
PYEOF
printf 'unix:/tmp/does-not-matter.sock\t999999\t/tmp/nope\t%s\n' "$PWD" > "$TMP/q/arc/task-route1-ddd1.broker"
out="$(CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  CREW_TEST_RPC_LOG="$TMP/q/rpc.log" CREW_TEST_DUMP_ENDPOINT=1 \
  bash "$CREW" steer task-route1-ddd1 "routed" 2>&1)" && rc=0 || rc=$?
check "steer routes to the job's own broker" 0 "unix:/tmp/does-not-matter.sock" "$rc" "$(cat "$TMP/q/rpc.log")"
rm -f "$TMP/q/arc/task-route1-ddd1.broker"

# Case 56: no recorded broker -> say so instead of a bare "thread not found"
out="$(CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  CREW_TEST_RPC_LOG="$TMP/q/rpc.log" bash "$CREW" steer task-route1-ddd1 "unrouted" 2>&1)" && rc=0 || rc=$?
check "steer warns when the job has no broker" 0 "no broker recorded" "$rc" "$out"

# Case 57: prompts and docs put queue ahead of the destructive path
for f in "$AGENT_DIR"/*.md "$SKILL_FILE"; do
  check_contains "$(basename "$f") teaches queue" "$f" "crew-codex queue <job-id>"
done
check_contains "SKILL.md calls redirect destructive" "$SKILL_FILE" "destructive"
check_contains "README documents the patch" "$HERE/../README.md" "crew-codex patch --apply"

# --- metadata encoding: empty columns must not shift later fields -----------
# A review job pins no model or effort, so those columns are empty. Under a tab
# separator bash collapses the run and every later field shifts left, landing
# the turn id in the wrong variable. This is the shape that shipped broken.
cat > "$QJOBS/review-empty1-aaa1.json" <<EOF
{"id":"review-empty1-aaa1","status":"running","threadId":"thread-EMPTY","createdAt":"2026-02-05T00:00:00.000Z","turnId":"turn-empty-1","pid":424242,"request":{"cwd":"$PWD","write":false}}
EOF
: > "$TMP/q/rpc.log"
out="$(CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  CREW_TEST_RPC_LOG="$TMP/q/rpc.log" bash "$CREW" steer review-empty1-aaa1 "unpinned job" 2>&1)" && rc=0 || rc=$?
check "steer works with empty model/effort columns" 0 "STEERED review-empty1-aaa1" "$rc" "$out"
check "empty columns do not shift the turn id" 0 '"expectedTurnId":"turn-empty-1"' "$rc" "$(cat "$TMP/q/rpc.log")"

# --- reap must not act on an unreadable snapshot ----------------------------
# The companion rewrites job files in place. A half-written file must read as
# UNREADABLE, not as a dead job, or the sweep kills a live job's broker.
qjob task-unread1-bbb1 running thread-UR
bpu="$(fake_broker task-unread1-bbb1)"
printf '{"id":"task-unread1-bbb1","status":"run' > "$QJOBS/task-unread1-bbb1.json"
crew_reap >/dev/null 2>&1 || true
if kill -0 "$bpu" 2>/dev/null; then
  echo "PASS: unreadable snapshot does not reap a live broker"; pass=$((pass + 1))
else
  echo "FAIL: a half-written job file got its broker reaped"; fail=$((fail + 1))
fi
check_contains "unreadable snapshot keeps its sidecar" "$TMP/q/arc/task-unread1-bbb1.broker" "broker.sock"

# ...but it must not skip forever: a file left invalid by a crashed rewrite
# would otherwise hold its broker for the life of the machine. Ageing is by
# wall clock, so back-date the marker rather than sweeping in a loop, which is
# also what stops a burst of concurrent sweeps from racing through it.
printf '%s' "$(( $(date +%s) - 9999 ))" > "$TMP/q/arc/task-unread1-bbb1.broker.unreadable"
crew_reap >/dev/null 2>&1 || true
if kill -0 "$bpu" 2>/dev/null; then
  echo "FAIL: permanently unreadable record held its broker forever"; fail=$((fail + 1)); kill -9 "$bpu" 2>/dev/null || true
else
  echo "PASS: permanently unreadable record eventually releases its broker"; pass=$((pass + 1))
fi
check_absent "aged-out record leaves no sidecar" "$(ls "$TMP/q/arc")" "task-unread1-bbb1.broker"
kill -9 "$bpu" 2>/dev/null || true; rm -f "$TMP/q/arc/task-unread1-bbb1.broker" "$QJOBS/task-unread1-bbb1.json"

# --- a failed cancel must not destroy a live job's broker -------------------
qjob task-cxfail1-ccc1 running thread-CX
bpc="$(fake_broker task-cxfail1-ccc1)"
out="$(CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  CREW_TEST_CANCEL_FAIL="wrong cwd" bash "$CREW" cancel task-cxfail1-ccc1 2>&1)" && rc=0 || rc=$?
check "failed cancel reports the failure" 1 "cancel failed" "$rc" "$out"
if kill -0 "$bpc" 2>/dev/null; then
  echo "PASS: failed cancel leaves the live broker alone"; pass=$((pass + 1))
else
  echo "FAIL: failed cancel destroyed a live job's broker"; fail=$((fail + 1))
fi
check_contains "failed cancel keeps the sidecar" "$TMP/q/arc/task-cxfail1-ccc1.broker" "broker.sock"
kill -9 "$bpc" 2>/dev/null || true

# --- a successful cancel still retires the broker ---------------------------
out="$(CLAUDE_CONFIG_DIR="$TMP/q" CLAUDE_PLUGIN_DATA="$TMP/q/data" CREW_CODEX_ARCHIVE_DIR="$TMP/q/arc" \
  bash "$CREW" cancel task-cxfail1-ccc1 2>&1)" && rc=0 || rc=$?
check_absent "successful cancel removes the sidecar" "$(ls "$TMP/q/arc")" "task-cxfail1-ccc1.broker"

# --- redirect: broker routing, publication and refusal ----------------------
# The old job's cancel must go to the broker that job runs on, the successor
# must get its own recorded broker, and a broker that cannot be started must
# abort BEFORE the old turn is destroyed.
redir_jobs="$TMP/redir/data/state/lab-1/jobs"
write_job "$redir_jobs" task-rr1-aaa1 running thread-RR 2026-09-01T00:00:00.000Z gpt-5.6-terra xhigh true
mkdir -p "$TMP/redir/arc"
printf 'unix:/tmp/old-broker.sock\t888888\t/tmp/old-broker-dir\t%s\n' "$PWD" > "$TMP/redir/arc/task-rr1-aaa1.broker"
log="$TMP/redir/argv_rr"; : > "$log"
out="$(CLAUDE_CONFIG_DIR="$TMP/redir" CLAUDE_PLUGIN_DATA="$TMP/redir/data" CREW_CODEX_ARCHIVE_DIR="$TMP/redir/arc" \
  CREW_TEST_ARGV_LOG="$log" bash "$CREW" redirect task-rr1-aaa1 "switch approach" 2>&1)" && rc=0 || rc=$?
check "redirect routes the cancel to the old job's broker" 0 \
  "^cancel task-rr1-aaa1 @endpoint=unix:/tmp/old-broker.sock" "$rc" "$(cat "$log")"
check "redirect relaunches on a NEW broker" 0 \
  "resume-last.*@endpoint=unix:$TMP/crewb-" "$rc" "$(grep resume-last "$log")"
check_absent "redirect drops the old job's sidecar" "$(ls "$TMP/redir/arc")" "task-rr1-aaa1.broker"
check_contains "redirect publishes the successor's broker" "$TMP/redir/arc/task-new1-aaa1.broker" "crewb-"

# allocation failure must not destroy the old turn
write_job "$redir_jobs" task-rr2-bbb2 running thread-RR2 2026-09-02T00:00:00.000Z gpt-5.6-terra xhigh true
log="$TMP/redir/argv_rr2"; : > "$log"
out="$(CLAUDE_CONFIG_DIR="$TMP/redir" CLAUDE_PLUGIN_DATA="$TMP/redir/data" CREW_CODEX_ARCHIVE_DIR="$TMP/redir/arc" \
  CREW_CODEX_BROKER_TMPDIR="$TMP/no-such-dir-for-brokers" \
  CREW_TEST_ARGV_LOG="$log" bash "$CREW" redirect task-rr2-bbb2 "should refuse" 2>&1)" && rc=0 || rc=$?
check "redirect refuses when it cannot start a broker" 1 "leaving task-rr2-bbb2 running" "$rc" "$out"
check_absent "refused redirect never cancelled the old job" "$(cat "$log")" "cancel task-rr2-bbb2"

# A burst of sweeps inside the grace period must NOT age a record out: that was
# the concurrency hole in counting sweeps instead of seconds.
qjob task-burst1-ddd1 running thread-BURST
bpb="$(fake_broker task-burst1-ddd1)"
printf '{"id":"task-burst1-ddd1","status":"run' > "$QJOBS/task-burst1-ddd1.json"
crew_reap >/dev/null 2>&1 || true
crew_reap >/dev/null 2>&1 || true
crew_reap >/dev/null 2>&1 || true
crew_reap >/dev/null 2>&1 || true
if kill -0 "$bpb" 2>/dev/null; then
  echo "PASS: a burst of sweeps cannot age out a record early"; pass=$((pass + 1))
else
  echo "FAIL: rapid sweeps reaped a live broker inside the grace period"; fail=$((fail + 1))
fi
kill -9 "$bpb" 2>/dev/null || true
rm -f "$TMP/q/arc/task-burst1-ddd1.broker" "$TMP/q/arc/task-burst1-ddd1.broker.unreadable" "$QJOBS/task-burst1-ddd1.json"

# Identity check: a sidecar naming a pid that has been recycled must not be
# signalled. A live process with a mismatched start time stands in for the
# recycled pid.
qjob task-recycle1-eee1 completed thread-REC
sleep 300 >/dev/null 2>&1 & innocent=$!
disown "$innocent" 2>/dev/null || true
STUB_PIDS="$STUB_PIDS $innocent"
printf 'unix:/tmp/gone.sock\t%s\t/tmp/gone-dir\t%s\t1\n' "$innocent" "$PWD" \
  > "$TMP/q/arc/task-recycle1-eee1.broker"
crew_reap >/dev/null 2>&1 || true
if kill -0 "$innocent" 2>/dev/null; then
  echo "PASS: a recycled pid is not signalled"; pass=$((pass + 1))
else
  echo "FAIL: cleanup killed an unrelated process holding a recycled pid"; fail=$((fail + 1))
fi
kill -9 "$innocent" 2>/dev/null || true

# Packaging must expose exactly the supported dedicated lanes and reviewer.
# Explicit older model ids remain covered by the argv and redirect tests above.
packaged_agents="$(find "$AGENT_DIR" -maxdepth 1 -type f -name '*.md' -printf '%f\n' | sort)"
expected_agents=$'codex-implementer-astra.md\ncodex-implementer-luna.md\ncodex-implementer-sol.md\ncodex-reviewer.md'
if [[ "$packaged_agents" == "$expected_agents" ]]; then
  echo "PASS: packaged crew agents match supported lanes"; pass=$((pass + 1))
else
  echo "FAIL: unexpected packaged crew agents: $packaged_agents"; fail=$((fail + 1))
fi

# --- lane pins: each agent launches with its own model and effort ------------
# Astra defaults to medium; Sol is GPT-6.1 and Luna is GPT-6 at xhigh.
# A drifted pin changes the dispatched model, so assert each launch line.
check_contains "astra lane pins gpt-6-astra at medium" "$AGENT_DIR/codex-implementer-astra.md" \
  'crew-codex task --background --model gpt-6-astra --effort medium --write'
check_contains "sol lane pins gpt-6.1-sol at xhigh" "$AGENT_DIR/codex-implementer-sol.md" \
  'crew-codex task --background --model gpt-6.1-sol --effort xhigh --write'
check_contains "luna lane pins gpt-6-luna at xhigh" "$AGENT_DIR/codex-implementer-luna.md" \
  'crew-codex task --background --model gpt-6-luna --effort xhigh --write'
check_contains "reviewer read-only task route pins gpt-6.1-sol at xhigh" "$AGENT_DIR/codex-reviewer.md" \
  'crew-codex task --background --model gpt-6.1-sol --effort xhigh "<task text>"'
check_contains "reviewer proof task pins gpt-6.1-sol at xhigh" "$AGENT_DIR/codex-reviewer.md" \
  'crew-codex task --background --model gpt-6.1-sol --effort xhigh --write'
check_contains "reviewer generic review passes latest thread model" "$AGENT_DIR/codex-reviewer.md" \
  'crew-codex review --background --model gpt-6.1-sol'
check_contains "reviewer adversarial review passes latest thread model" "$AGENT_DIR/codex-reviewer.md" \
  'crew-codex adversarial-review --background --model gpt-6.1-sol'
check_contains "astra lane tells the forwarder what to do with a clarifying question" \
  "$AGENT_DIR/codex-implementer-astra.md" 'Do not answer it yourself'
for f in "$AGENT_DIR"/*.md "$SKILL_FILE"; do
  check_contains "$(basename "$f") maps the astra alias" "$f" '`astra` maps to `--model gpt-6-astra'
done
# GPT-5.4 Mini was retired on 2026-08-31; no agent may still offer it.
for f in "$AGENT_DIR"/*.md; do
  check_absent "$(basename "$f") no longer offers retired gpt-5.4-mini" "$(cat "$f")" 'gpt-5.4-mini'
done
check_contains "SKILL.md lists the astra lane" "$SKILL_FILE" 'codex-implementer-astra'
check_contains "README documents the astra lane" "$HERE/../README.md" 'codex-implementer-astra'
check_contains "README explains the medium default" "$HERE/../README.md" 'Why Astra runs at medium'

summary_reached=1
echo
echo "$pass passed, $fail failed"
[[ "$fail" -eq 0 ]]
