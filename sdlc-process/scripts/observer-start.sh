#!/bin/sh
script="${CLAUDE_PLUGIN_ROOT:-${PLUGIN_ROOT}}/scripts/observer-start.mjs"
if command -v node >/dev/null 2>&1 && [ -r "$script" ]; then
 node "$script" 2>/dev/null || :
fi
exit 0
