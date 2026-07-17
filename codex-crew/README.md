# codex-crew

Purpose-built Codex delegate agents for Claude Code, invocable like native
subagents, each pinning a specific Codex model and posture. Rides the
official `codex@openai-codex` plugin's companion runtime (background jobs,
`/codex:status` / `/codex:result` / `/codex:cancel`, session-end cleanup)
instead of reimplementing it.

## Agents

Implementation is tiered across the GPT-5.6 ladder — the orchestrator picks
the tier per task; each agent's description carries the selection criteria:

| Agent | Model | Effort | Posture | Choose when |
|---|---|---|---|---|
| `codex-implementer-sol` | gpt-5.6-sol (flagship) | xhigh | write | Novel/intricate logic, cross-cutting multi-file changes, concurrency/money-path correctness, gnarly debugging — anything where mid-tier output would need rework |
| `codex-implementer-terra` | gpt-5.6-terra (balanced) | xhigh | write | Routine, well-specified implementation with clear spec and existing patterns; the default when a task is real work but not hard |
| `codex-implementer-luna` | gpt-5.6-luna (affordable) | xhigh | write | Mechanical, repetitive, parallelizable chores with an exact recipe; fan out freely |
| `codex-reviewer` | gpt-5.6-sol | xhigh | read-only | Diff/branch reviews, adversarial reviews, independent diagnosis |

Rough cost ratio per token: Sol ≈ 2× Terra ≈ 5× Luna. Pins are defaults — a
dispatch brief that explicitly names a model or effort overrides them
(`spark` → `gpt-5.3-codex-spark`, `mini` → `gpt-5.4-mini`).

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

Dispatches run **foreground**: the sonnet forwarder blocks until the codex
job actually completes, so "subagent finished" means the work is done and its
stdout is the real result. `--background` is opt-in only — it detaches and
returns just a launch handle (a job id), which must be polled with
`crew-codex status` / `/codex:status` before the work is treated as complete.

## Tests

```bash
bash tests/run.sh
```
