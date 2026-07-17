#!/usr/bin/env bash
# Resolver tests for bin/crew-codex. Uses a throwaway CLAUDE_CONFIG_DIR;
# never touches the real ~/.claude.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREW="$HERE/../bin/crew-codex"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

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

echo
echo "$pass passed, $fail failed"
[[ "$fail" -eq 0 ]]
