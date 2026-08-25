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

**Long runs, owned end to end.** Codex jobs run for hours; Claude Code caps a
single Bash call at 600s. So a dispatch is three steps — launch detached,
loop `cd <root> && crew-codex await <id> --for 540`, return the result — and
the agent owns the job for its whole life. "Subagent finished" therefore still
means the work is done, with no cap on how long the job takes. The waiting
happens inside a shell poll loop, so hours of supervision cost one short
status line per ~9 minutes rather than a streamed transcript.

**Every call is pinned to the sandbox root.** The companion keys job state to a
hash of the shell's working directory, and Claude Code resets that directory
between Bash calls. A dispatch therefore looks like this, one shell call per
line, launch and await never sharing a call:

```
cd <sandbox root> && crew-codex task --background --model gpt-5.6-terra --effort xhigh --write "<task text>"
cd <sandbox root> && crew-codex await <job-id> --for 540      # repeat while exit 10
cd <sandbox root> && crew-codex result <job-id>
```

Drop the `cd` prefix on the await and the call hashes to a different state
directory: `await` reports exit 2 for a job that is alive and still editing
files. So exit 2 is a directory check before it is a relaunch. The agent probes
`ps -eo pid,args | grep <job-id>` and
`~/.claude/plugins/data/codex-openai-codex/state/*/jobs/<job-id>.json`, and
relaunches only when both come back empty. `crew-codex` helps from its side:
on "not found" it scans the sibling state directories under the same parent
and, when the job turns up in one, appends `job exists under cwd <path>;
re-run from that directory` to the error. State keying is unchanged.

```
crew-codex await <job-id> [--for <seconds>]
  exit 0  DONE completed      exit 1  DONE failed/cancelled
  exit 2  job not found       exit 3  STALE — died without reporting
  exit 4  SUPERSEDED by a redirect (line names the successor id)
  exit 10 RUNNING — call again
```

`await` waits on the job's **own process** (`tail --pid`), so it wakes the
instant the job ends — not on a poll tick — and costs no CPU while blocked. It
falls back to a 5s poll when no live pid is available. If the process
disappears while the job still claims to be `running`, that's a silent death:
`await` reports `STALE` with exit 3 instead of waiting out the deadline.

**Redirect a running job instead of restarting it.** A long job going the
wrong way does not have to be thrown away:

```
cd <sandbox root> && crew-codex redirect <job-id> "Change of plan: <new instruction>"
```

That interrupts the live turn and resumes the *same* Codex thread with the new
text, so everything the job already did stays in context. It prints
`REDIRECTED <old> -> <new>`; await the new id. Model, effort and write posture
carry over unless you override them. The agent that was awaiting the old id
gets exit 4 (`SUPERSEDED`) naming the successor, so it follows the thread
rather than reporting a failure.

Verified in a sandbox: a job cancelled after creating 4 of 30 files resumed
knowing it had made exactly 4, then carried out the new instruction instead.

Why not true mid-turn steering? Codex does support it (`turn/steer` on the
app-server), but the codex plugin's broker forwards exactly one method while a
turn is streaming, `turn/interrupt` (`app-server-broker.mjs`). Everything else
gets `-32001 Shared Codex broker is busy`. `codex queue --thread` is accepted
for a crew job's thread and then never drained, since the job's app-server goes
away with the job. Interrupt-then-resume is the mechanism that actually works
end to end today.

**Results survive.** On terminal state `await` archives the result, metadata
and log to `~/.claude/plugins/data/codex-crew/jobs/`, which the companion's
50-job pruner cannot delete. Jobs still stop when the Claude session ends (by
design), but the archived transcript and `threadId` remain, so interrupted
work is resumed rather than re-run from scratch.

**Capacity retries**: "model is at capacity" rejections are retried by
`crew-codex` automatically — up to 3 attempts with jittered 5/15/45s backoff
(override via `CREW_CODEX_RETRY_DELAYS`). This is write-safe: capacity is an
admission-time rejection, so no partial work exists to double-apply. Retries
are announced on stderr, never silent. Any other failure passes through
untouched on the first attempt, and there is no automatic tier fallback —
substituting a cheaper model is an orchestrator decision, made in the open.

## Tests

```bash
bash tests/run.sh
```
