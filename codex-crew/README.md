# codex-crew

Purpose-built Codex delegate agents for Claude Code, invocable like native
subagents, each pinning a specific Codex model and posture. Rides the
official `codex@openai-codex` plugin's companion runtime (background jobs,
`/codex:status` / `/codex:result` / `/codex:cancel`, session-end cleanup)
instead of reimplementing it.

## Agents

| Agent | Model | Effort | Posture | Use for |
|---|---|---|---|---|
| `codex-implementer` | gpt-5.6-terra | high | write | Substantial bounded implementation/debugging |
| `codex-reviewer` | gpt-5.6-terra | high | read-only | Diff/branch reviews, adversarial reviews, diagnosis |
| `codex-fast` | gpt-5.4-mini | low | write | Cheap mechanical/parallel grunt work |

Pins are defaults — a dispatch brief that explicitly names a model or effort
overrides them (`spark` → `gpt-5.3-codex-spark`).

## Requirements

- Official Codex plugin installed: `/plugin install codex@openai-codex`
- Codex CLI installed and authenticated (`codex login`)
- Node.js

## Install

```bash
# from GitHub
claude plugin marketplace add sidkik/claude-plugins
# or from a local checkout
claude plugin marketplace add /projects/sidkik/ep/claude-plugins

claude plugin install codex-crew@sidkik-plugins
```

## How it works

`bin/crew-codex` (on PATH while enabled) resolves the codex plugin's
`codex-companion.mjs` from `~/.claude/plugins/installed_plugins.json` —
version-bump-proof — and execs it with `CLAUDE_PLUGIN_DATA` pointed at the
codex plugin's data dir, so crew-launched jobs share one job namespace with
the official plugin's commands and hooks. Each agent is a thin forwarder
(sonnet): one `crew-codex` call in, raw stdout back, no independent work.

## Tests

```bash
bash tests/run.sh
```
