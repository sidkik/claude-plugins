# grok-crew

Channel map for steering a Grok job that **Claude launched**. Not a runtime.

Claude Code cannot put `grok-*` in an agent `model` field, so a Grok
delegate is a courier around the Grok CLI — the same pattern as Codex
Crew. Codex Crew can inject because it holds the Codex app-server.
Claude → Grok has no inject command.

Read [skills/grok-crew-runtime/SKILL.md](skills/grok-crew-runtime/SKILL.md)
before proposing Grok Crew, wrapping `grok -p`, or treating Grok's native
subagent steer as the Claude → Grok solution.

## Status

`0.0.1` — skill only. No `crew-grok` binary, no implementer lanes.

## Requirements

- Grok CLI installed and authenticated (`grok login`; `grok models` succeeds)
- Official Grok Claude Code plugin: `/plugin install grok-build@xai-grok-build`
- Node.js (the official bridge's runtime)

## Install

```bash
# Grok CLI
curl -fsSL https://x.ai/cli/install.sh | bash
grok login

# Official Grok ↔ Claude Code bridge
claude plugin marketplace add xai-org/grok-build-plugin-cc
claude plugin install grok-build@xai-grok-build

# This contract
claude plugin marketplace add sidkik/claude-plugins
# or from a local checkout:
# claude plugin marketplace add /projects/sidkik/ep/claude-plugins
claude plugin install grok-crew@sidkik-plugins
```

Inside Claude Code the same steps are `/plugin marketplace add …` and
`/plugin install …`, then `/reload-plugins` and `/grok-build:check`.

To load the skill in Grok Build itself:

```bash
grok plugin marketplace add /projects/sidkik/ep/claude-plugins
grok plugin install grok-crew --trust
```
