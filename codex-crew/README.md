# codex-crew

Purpose-built Codex delegate agents for Claude Code, invocable like native
subagents, each pinning a specific Codex model and posture. Rides the
official `codex@openai-codex` plugin's companion runtime (background jobs,
`/codex:status` / `/codex:result` / `/codex:cancel`, session-end cleanup)
instead of reimplementing it.

This plugin is Codex-only. Claude → Grok inject is
[grok-crew](../grok-crew/) — a different channel; Grok's native
`send_subagent_message` does not move a finding from Claude into a Grok
job Claude launched.

Reviewer evidence uses the [runtime review contract](skills/crew-runtime/SKILL.md#review-evidence):
reviewers can write and run focused regression tests in an isolated checkout at
the pinned candidate, while production and shared worktrees remain unchanged.
`task --write` supplies this mode; ordinary review commands remain read-only.
Explicit human read-only restrictions still apply.

## Agents

The default implementation and custom reviewer task lanes use GPT-6.1 Sol.
Astra handles the most demanding work; Luna handles focused, repeatable tasks.
Terra remains available when explicitly requested.

| Agent | Model | Effort | Posture | Choose when |
|---|---|---|---|---|
| `codex-implementer-astra` | gpt-6-astra | medium | write | Most demanding work, scattered evidence, sustained reasoning across tools, or a failed Sol attempt |
| `codex-implementer-sol` | gpt-6.1-sol | xhigh | write | Default for bounded implementation, routine or intricate |
| `codex-implementer-terra` | gpt-5.6-terra | xhigh | write | The brief explicitly names Terra |
| `codex-implementer-luna` | gpt-6-luna | xhigh | write | Focused, repeatable work with an exact recipe |
| `codex-reviewer` task routes | gpt-6.1-sol | xhigh | read-only; isolated test proof when authorized | Governing reviews, custom analysis and diagnosis |
| `codex-reviewer` generic review routes | gpt-6.1-sol thread model; native reviewer uses Codex configuration | Codex configuration | read-only | Generic diff/branch and adversarial reviews |

[OpenAI's model guidance](https://learn.chatgpt.com/docs/models) recommends
GPT-6.1 Sol for complex coding, Astra for the hardest work, and Luna for
clear, repeatable tasks. Verified against the Codex model registry snapshot
on 2026-10-05: GPT-6 Sol and GPT-5.6 Sol/Terra/Luna remain listed; no GPT-6
Terra is listed. GPT-6.1 Sol's CLI registry default is `low`; this plugin
explicitly chooses `xhigh` for its Sol implementation and reviewer task lanes.

Pins are defaults: an explicit model or effort in the brief overrides them.
`astra` selects `gpt-6-astra` at `medium` unless the brief also names an effort.
`spark` retains the companion alias for `gpt-5.3-codex-spark` only on explicit
request; it is absent from the verified registry, so check account/client
availability before selecting it. Exact model ids pass through unchanged.

**Why Astra runs at medium.** This lane keeps its chosen `medium` effort,
which is also Astra's CLI registry default. Astra above `medium` requires
Chad's explicit permission. Registry defaults and API/client defaults can
differ. The installed companion (1.0.6) accepts efforts only through `xhigh`;
registry-listed `max` and `ultra` are unavailable through this runtime.

Generic `review` and `adversarial-review` pass `--model gpt-6.1-sol` to the
installed companion (1.0.6). Explicit model requests override that thread model.
These commands accept no effort flag; use a reviewer `task` route when an
explicit effort or custom governing brief is required. Native `review` can
select its configured review model independently of its thread model, so its
reviewer model is not a verified crew pin.

For cost comparisons, consult [current API pricing](https://developers.openai.com/api/docs/pricing).
API token prices vary by context length and processing mode; they do not
establish Codex plan credit usage.

**Astra briefs must be self-contained.** State decisions, constraints and
assumptions up front. If the result asks a clarifying question, answer it and
resume the task with `--resume-last`.

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
cd <sandbox root> && crew-codex task --background --model gpt-6.1-sol --effort xhigh --write "<task text>"
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

**Correct a running job in flight.** A job going the wrong way does not have to
be thrown away, and does not have to be interrupted either:

```
cd <sandbox root> && crew-codex steer <job-id> "Stop adding files; switch to fixing the failing test"
STEERED task-abc-123 | thread 01a03e70-... | turn 01a03e70-... | the agent reads it at its next step
```

Steering interjects into the turn the job is running **right now**. Nothing is
stopped: the tool call in progress finishes normally, and the model reads the
message at its next step, so it can change course before doing all the wrong
work. The reply is part of the same turn, so it appears in the job's own
result with nothing extra to collect.

Verified end to end: a job creating 25 files one at a time was steered at file
2 and stopped at exactly 2, finishing in 30 seconds with "2 kappa files had
been created when I read your message." A second run steered at file 9 of 20
stopped at 16.

**A turn is the whole task, not one step.** That distinction is why steering
exists and why queueing is not a substitute:

```
user message ──► turn starts
  model call → tool call → result     (x30 for a 10-file job)
  model call → final answer ──► turn/completed
```

Everything a job does is one turn, so a message that waits for the turn to end
arrives after the work is finished.

**Queue is for the message that should follow the current work.**

```
cd <sandbox root> && crew-codex queue <job-id> "When you are done, also update the changelog"
QUEUED task-abc-123 | id crew-task-abc-123-1 | the agent reads it when its current turn ends
```

Because the companion closes a job at its first `turn/completed`, the queued
turn's answer would otherwise be lost. `await` waits for it and appends it to
the archived result:

```
QUEUED-REPLIES 1/1 captured | appended to .../task-abc-123.result.txt
DONE completed | 1m 45s | archived: .../task-abc-123.result.txt
```

**Every job gets its own broker.** The companion runs one broker per working
directory, and a broker carries exactly one streaming turn. Its answer to a
busy broker (`withAppServer` in `lib/codex.mjs`) is to run the whole job on a
private stdio app-server, which has no socket, so nothing can steer, queue or
interrupt it, ever. In a shared parent directory that means exactly one
reachable job: whichever won the broker first. Everything launched during its
turn is unreachable for life, and `cancel` on those jobs falls back to killing
the process.

So `crew-codex` starts a broker per launch and records the endpoint against the
job, then routes every later `steer`, `queue`, `await`, `status`, `result` and
`cancel` back to it. Measured: two jobs launched seconds apart in the same cwd,
zero private app-servers, both steerable. Without it, the second was
`thread not found` from birth.

Each broker holds a codex app-server, so leaks are expensive and reaping is
deliberate:

- terminal state in `await`, and `cancel`, retire that job's broker immediately
- every launch sweeps first, and `crew-codex reap` does it on demand
- a job whose status still says `running` but whose worker is dead is reaped
  too, which is the session-death path that would otherwise leak one broker per
  crashed job
- `CREW_CODEX_NO_JOB_BROKER=1` opts out

**Both need the codex plugin patched.** Stock, the plugin refuses on two
counts: its broker forwards only `turn/interrupt` while a turn is streaming, so
`turn/steer` and `thread/queue/add` come back `-32001 Shared Codex broker is
busy`, and its client declares `experimentalApi: false`, which the server
requires for the queue method. Neither limit is Codex's own. Note what that
left behind: interrupt, the one destructive option, was the only thing that
got through.

```
crew-codex patch --status     # PATCHED / UNPATCHED, for whatever version is installed
crew-codex patch --apply      # idempotent, keeps *.crew-orig backups
crew-codex patch --revert
```

Everyone installs their own copy of `codex@openai-codex` at their own version,
so the fix ships as a patch in `patches/` applied by context matching rather
than line numbers, which absorbs the drift between releases. It refuses to
half-apply if upstream moves the code out from under it. A SessionStart hook
re-applies it after the codex plugin updates; set `CREW_CODEX_NO_AUTO_PATCH=1`
to opt out.

**A stale `running` record blocks a redirect.** The companion refuses
`--resume-last` while it believes any task in that cwd is still running, so a
job whose worker died without updating its record (a killed session, a crash)
makes every later redirect in that directory fail with "Task <id> is still
running". `crew-codex reap` clears the broker but not the companion's own
index; clear the stale entry with `/codex:cancel <id>` before redirecting.

**Redirect is the destructive one.** Reach for it only when a job is genuinely
off the rails:

```
cd <sandbox root> && crew-codex redirect <job-id> "Change of plan: <new instruction>"
```

That INTERRUPTS the live turn and resumes the *same* Codex thread with the new
text, so everything the job already did stays in context. The interrupt is the
catch: it stops the turn wherever it stands, so an edit in progress can be left
half applied. It prints `REDIRECTED <old> -> <new>`; await the new id. Model,
effort and write posture carry over unless you override them. The agent that
was awaiting the old id gets exit 4 (`SUPERSEDED`) naming the successor, so it
follows the thread rather than reporting a failure.

Verified in a sandbox: a job cancelled after creating 4 of 30 files resumed
knowing it had made exactly 4, then carried out the new instruction instead.

The three are genuinely different, and only one of them destroys work:

| | What it does | When the agent sees it |
|---|---|---|
| `steer` | Interjects into the running turn | At its next step, after the in-flight tool call |
| `queue` | Appends to the thread queue | After the turn completes, so after the whole task |
| `redirect` | Interrupts the turn, then resumes | Never sees it; work in flight is destroyed |

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
