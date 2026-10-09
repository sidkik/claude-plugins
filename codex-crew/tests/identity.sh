#!/usr/bin/env bash
# Broker identity and signalling tests for bin/crew-codex. Portable on purpose
# (bash 3.2, BSD or GNU userland, node only for the broker stub) so CI runs it
# on Linux and macOS; run.sh includes it. The real functions are lifted out of
# the wrapper and exercised directly; stubs override them only where named.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# CREW_TEST_IDENTITY_CREW points at another wrapper copy, e.g. to show an old revision fails.
CREW="${CREW_TEST_IDENTITY_CREW:-$HERE/../bin/crew-codex}"
# /tmp, not $TMPDIR: macOS TMPDIR is long enough to push the socket path near its cap.
TMP="$(mktemp -d /tmp/crewid.XXXXXX)"
PIDS=""
pass=0
fail=0

cleanup_identity() {
  local p pf
  for p in $PIDS; do kill -9 "$p" 2>/dev/null || true; done
  # Spawned broker stubs, including any a broken wrapper left unrecorded.
  for pf in "$TMP"/b/crewb-*/broker.pid; do
    [[ -f "$pf" ]] || continue
    p="$(cat "$pf" 2>/dev/null || true)"
    [[ "$p" =~ ^[0-9]+$ ]] && kill -9 "$p" 2>/dev/null || true
  done
  rm -rf "$TMP"
}
trap cleanup_identity EXIT

ok() { echo "PASS: $1"; pass=$((pass + 1)); }
bad() { echo "FAIL: $1"; fail=$((fail + 1)); }

crew_fn() { sed -n "/^$1() {/,/^}/p" "$CREW"; }
FNS="$(for f in crew_pid_starttime crew_pid_state crew_broker_clean crew_kill_broker crew_stop_own_child crew_spawn_job_broker crew_sidecar crew_publish_sidecar; do crew_fn "$f"; done)
CREW_BROKER_DEFERRED=3"

# A long-lived process standing in for a broker. With "ignore-term" it survives
# TERM, so only a KILL escalation can stop it.
victim() {
  if [[ "${1:-}" == ignore-term ]]; then
    sh -c 'trap "" TERM; exec sleep 300' >/dev/null 2>&1 &
  else
    sleep 300 >/dev/null 2>&1 &
  fi
  local pid=$!
  disown "$pid" 2>/dev/null || true
  PIDS="$PIDS $pid"
  echo "$pid"
}
state_dir() { # $1 = name -> a broker dir holding sock, pid and log
  local d="$TMP/$1"
  mkdir -p "$d"; : > "$d/broker.sock"; : > "$d/broker.pid"; : > "$d/broker.log"
  echo "$d"
}
alive() { kill -0 "$1" 2>/dev/null; }
gone() { sleep 0.3; ! kill -0 "$1" 2>/dev/null; }
kept() { [[ -S "$1/broker.sock" || -f "$1/broker.sock" ]] && [[ -f "$1/broker.pid" && -f "$1/broker.log" ]]; }

# --- identity source ----------------------------------------------------------
p="$(victim)"
noproc="$(crew_fn crew_pid_starttime | sed 's#"/proc/#"/nonexistent-proc/#')"
for variant in native fallback; do
  fns="$FNS"; [[ "$variant" == fallback ]] && fns="$noproc"
  out="$(eval "$fns"; a="$(crew_pid_starttime "$p")"; sleep 1; b="$(crew_pid_starttime "$p")"
    [[ -n "$a" && "$a" == "$b" && "$a" != *[[:space:]]* ]] && echo stable
    [[ -z "$(crew_pid_starttime 999999999)" ]] && echo dead-empty)" || true
  [[ "$out" == *stable* ]] && ok "$variant identity is stable, non-empty and one token" || bad "$variant identity is unstable or empty: $out"
  [[ "$out" == *dead-empty* ]] && ok "$variant identity is empty for a dead pid" || bad "$variant identity for a dead pid: $out"
done
utc="$(eval "$noproc"; TZ=UTC crew_pid_starttime "$p")"
tokyo="$(eval "$noproc"; TZ=Asia/Tokyo crew_pid_starttime "$p")"
[[ -n "$utc" && "$utc" == "$tokyo" ]] && ok "ps identity does not depend on TZ" || bad "ps identity differs by TZ (UTC=$utc Tokyo=$tokyo)"
kill -9 "$p" 2>/dev/null || true

# --- crew_kill_broker outcomes ------------------------------------------------
p="$(victim)"; d="$(state_dir mismatch)"
rc=0; (eval "$FNS"; crew_kill_broker "$p" "$d" "Thu_Jan_1_00:00:00_1970") 2>/dev/null || rc=$?
alive "$p" && [[ ! -d "$d" && $rc -eq 0 ]] && ok "a confirmed mismatch is never signalled and its files are cleaned" || bad "mismatch: rc=$rc alive=$(alive "$p" && echo y || echo n) dir=$([[ -d "$d" ]] && echo kept || echo gone)"
kill -9 "$p" 2>/dev/null || true

p="$(victim)"; d="$(state_dir empty-record)"
rc=0; err="$( (eval "$FNS"; crew_kill_broker "$p" "$d" "") 2>&1 >/dev/null)" || rc=$?
alive "$p" && kept "$d" && [[ $rc -eq 3 && "$err" == *"no start time was recorded"* ]] && ok "an empty recorded identity defers: not signalled, state kept, code 3" || bad "empty record: rc=$rc alive=$(alive "$p" && echo y || echo n) kept=$(kept "$d" && echo y || echo n) err=$err"
kill -9 "$p" 2>/dev/null || true

p="$(victim)"; d="$(state_dir unreadable)"
rc=0; err="$( (eval "$FNS"; recorded="$(crew_pid_starttime "$p")"; crew_pid_starttime() { :; }
  crew_kill_broker "$p" "$d" "$recorded") 2>&1 >/dev/null)" || rc=$?
alive "$p" && kept "$d" && [[ $rc -eq 3 && "$err" == *"cannot be read"* ]] && ok "an unreadable identity for a live pid defers with state preserved" || bad "unreadable: rc=$rc alive=$(alive "$p" && echo y || echo n) kept=$(kept "$d" && echo y || echo n) err=$err"
kill -9 "$p" 2>/dev/null || true

# The pid survives TERM and then reports a different start time, as if recycled
# during the grace period: KILL must not follow.
p="$(victim ignore-term)"; d="$(state_dir changed-after-term)"; calls="$TMP/calls"; : > "$calls"
rc=0; (eval "$FNS"; recorded="$(crew_pid_starttime "$p")"
  crew_pid_starttime() { echo x >> "$calls"; [[ $(wc -l < "$calls") -le 1 ]] && echo "$recorded" || echo "Sat_Jan_1_00:00:00_2000"; }
  crew_kill_broker "$p" "$d" "$recorded") 2>/dev/null || rc=$?
alive "$p" && [[ $rc -eq 0 && ! -d "$d" ]] && ok "identity changed after TERM: no KILL" || bad "changed after TERM: rc=$rc alive=$(alive "$p" && echo y || echo n)"
kill -9 "$p" 2>/dev/null || true

p="$(victim ignore-term)"; d="$(state_dir verified-kill)"
rc=0; (eval "$FNS"; crew_kill_broker "$p" "$d" "$(crew_pid_starttime "$p")") 2>/dev/null || rc=$?
gone "$p" && [[ $rc -eq 0 && ! -d "$d" ]] && ok "a verified broker that ignores TERM is still killed" || bad "verified TERM-immune broker survived: rc=$rc"

p="$(victim)"; d="$(state_dir verified)"
rc=0; (eval "$FNS"; crew_kill_broker "$p" "$d" "$(crew_pid_starttime "$p")") 2>/dev/null || rc=$?
gone "$p" && [[ $rc -eq 0 && ! -d "$d" ]] && ok "a verified broker still stops" || bad "verified broker survived: rc=$rc"

d="$(state_dir dead)"
rc=0; (eval "$FNS"; crew_kill_broker 999999999 "$d" "anything") 2>/dev/null || rc=$?
[[ $rc -eq 0 && ! -d "$d" ]] && ok "a dead broker's files are cleaned" || bad "dead broker: rc=$rc"

# --- spawn and publication ----------------------------------------------------
cat > "$TMP/broker-stub.mjs" <<'BROKEREOF'
import net from "node:net";
import fs from "node:fs";
const a = process.argv.slice(2);
const endpoint = a[a.indexOf("--endpoint") + 1] || "";
const pidFile = a[a.indexOf("--pid-file") + 1] || "";
if (pidFile) fs.writeFileSync(pidFile, String(process.pid));
net.createServer(() => {}).listen(endpoint.replace(/^unix:/, ""));
setInterval(() => {}, 1 << 30);
BROKEREOF
mkdir -p "$TMP/b" "$TMP/arc"
spawn_env() { echo "CREW_BROKER_SCRIPT='$TMP/broker-stub.mjs' CREW_CODEX_BROKER_TMPDIR='$TMP/b' CREW_ARCHIVE_DIR='$TMP/arc'"; }

out="$( (eval "$FNS"; eval "$(spawn_env)"; crew_pid_starttime() { :; }
  rc=0; crew_spawn_job_broker "$PWD" || rc=$?
  echo "rc=$rc start=[$CREW_SPAWNED_START] pid=[$CREW_SPAWNED_PID]"
  crew_publish_sidecar job-noident && echo published || echo refused) 2>&1)" || true
dirs="$(ls "$TMP/b")"; sidecars="$(ls "$TMP/arc")"
[[ "$out" == *"rc=1 start=[] pid=[]"* && "$out" == *refused* && "$out" == *"refused the spawn"* && -z "$dirs" && -z "$sidecars" ]] \
  && ok "spawn without a recordable identity is refused and never publishes" || bad "spawn without identity: $out dirs=[$dirs] sidecars=[$sidecars]"

out="$( (eval "$FNS"; eval "$(spawn_env)"
  crew_spawn_job_broker "$PWD" && crew_publish_sidecar job-ident && echo "pid=$CREW_SPAWNED_PID"
  IFS=$'\t' read -r _e bpid bdir _c bstart _r < "$(crew_sidecar job-ident)"
  [[ -n "$bstart" && "$bpid" == "$CREW_SPAWNED_PID" ]] && echo recorded
  crew_kill_broker "$bpid" "$bdir" "$bstart" && echo stopped) 2>&1)" || true
spawned="${out#*pid=}"; spawned="${spawned%%[!0-9]*}"
[[ "$out" == *recorded* && "$out" == *stopped* ]] && { [[ -z "$spawned" ]] || gone "$spawned"; } \
  && ok "a spawned broker records its identity and is stopped by it" || bad "spawn with identity: $out"

echo
echo "identity: $pass passed, $fail failed"
[[ "$fail" -eq 0 ]]
