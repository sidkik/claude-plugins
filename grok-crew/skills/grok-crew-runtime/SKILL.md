---
name: grok-crew-runtime
description: Claude-to-Grok inject contract. Load when proposing Grok Crew, steering a Grok job launched from Claude, wrapping grok -p as a crew, or treating Grok native subagent steer as the Claude-to-Grok solution. Name the channel, then name interrupt vs steer vs queue, before proposing a delivery.
---

# Grok Crew Runtime

There is no `crew-grok` command and no implementer lanes. This skill is
the channel map and the delivery map. Use it instead of analogizing from
Codex Crew or from Grok's own child-subagent tools.

## Install (give them these commands)

When they need Grok from Claude Code, give this sequence. Do not skip
the official Grok plugin; `grok-crew` is the channel map, not the
launcher.

```text
# 1. Grok CLI, once
curl -fsSL https://x.ai/cli/install.sh | bash
grok          # interactive login, then exit
# or: grok login

# 2. Official Grok ↔ Claude Code bridge (launch / review / stop)
/plugin marketplace add xai-org/grok-build-plugin-cc
/plugin install grok-build@xai-grok-build
/reload-plugins
/grok-build:check

# 3. This contract (channel + interrupt/steer/queue)
/plugin marketplace add sidkik/claude-plugins
/plugin install grok-crew@sidkik-plugins
```

Local checkout instead of GitHub for step 3:

```text
/plugin marketplace add /projects/sidkik/ep/claude-plugins
/plugin install grok-crew@sidkik-plugins
```

Ready for step 2 means Node is available, `grok` is on PATH, and
`grok models` succeeds. Step 2 is `grok -p` plus PID/log job control:
**interrupt** and **queue** only, no **steer**.

## Interrupt, steer, queue

These three are not interchangeable. Use these meanings, not Grok's
labels (Grok calls Ctrl+Enter "interject" / "send now"; that is
**interrupt**).

| Delivery | When the new text is read | Original request |
|---|---|---|
| **Interrupt** | Now. This turn's in-flight work stops. Session stays up. | Abandoned mid-flight |
| **Steer** | After current tool/churn finishes, before the model continues the original request | Same request; course-corrects |
| **Queue** | After the original request is fully done | Finished first; this is a later request |

Steer is the middle: not "stop and take this," not "wait until the whole
job is over."

## Name the channel

Before proposing any of those three for "a Grok agent", name which
channel you are on.

| Channel | Parent | Running work | Interrupt | Steer | Queue |
|---|---|---|---|---|---|
| **Claude → Grok job** | Claude Code (or any courier) | a `grok` process | kill the PID, or ACP `session/cancel` | none | wait until exit then `grok -r`; or a second ACP `session/prompt` while busy |
| **Grok → Grok child** | this Grok session | `spawn_subagent` | `send_subagent_message` `interject` (wait only); no full turn-cancel analog here | `send_subagent_message` `steer` (flag off by default) | `send_subagent_message` `queue` |
| **Human → this TUI** | you | this turn | Ctrl+Enter (Grok: "send now") | Enter, only if `ui.follow_up_behavior = "steer"` | Enter (default) |

A finding that arrives while Claude's Grok job is still in its turn
cannot be **steered**. Report that. The TUI composer and
`send_subagent_message` do not reach that process.

## Claude → Grok job

The official Claude bridge (`grok-build@xai-grok-build`) is `grok -p`,
PID + logs, launch and stop. No app-server broker. `grok -p` is one
prompt, one stdout stream, then exit.

A second `session/prompt` on a busy `grok agent stdio` session is
**queue**. Grok puts it on `_x.ai/queue` while the first
`runningPromptId` runs to `end_turn`; the second prompt starts only
after that. Observed 2026-09-18: STOP sent at 3 files; all 8 files were
still written; then STOP ran. That is not steer.

Codex **steer** is `crew-codex steer` on a held Codex app-server. That
command is Codex-only; see
[crew-runtime](../../../codex-crew/skills/crew-runtime/SKILL.md).
