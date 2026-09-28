#!/bin/sh
# Runs on WSL even before Node is installed; hook diagnoses, agent repairs.
if command -v node >/dev/null 2>&1; then
  exec node "${CLAUDE_PLUGIN_ROOT:-${PLUGIN_ROOT}}/scripts/session-start.mjs"
fi
printf '%s\n' '{"systemMessage":"SDLC setup blocked: Node.js is missing. Ask this agent to finish SDLC setup if it does not start automatically.","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"The installed SDLC process plugin requires Node.js 18 or newer for setup and status. Diagnose the actual WSL environment and install/repair Node through supported tooling within user authorization, then load the installed sdlc-setup skill and run its verification. Ask the human only for unavailable privileges or authentication. Do not send a manual clone/setup checklist or claim setup is ready. Hold only Node-dependent actions; preserve unrelated repository policy."}}'
