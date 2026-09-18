---
name: crew-runtime
description: Internal contract for invoking the shared codex-companion runtime from codex-crew agents
user-invocable: false
---

# Crew Runtime

Use this skill only inside `codex-crew` agents (`codex-implementer-astra`,
`codex-implementer-sol`, `codex-implementer-terra`, `codex-implementer-luna`,
`codex-reviewer`). Claude → Grok inject is
[grok-crew-runtime](../../../grok-crew/skills/grok-crew-runtime/SKILL.md).

Directory and ownership rules (these bind every command below):

- **Every `crew-codex` call is ONE shell call that begins with
  `cd <sandbox root> && ` on the same line.** No exceptions: `task`, `review`,
  `await`, `result`, `status`, `cancel`. Use the sandbox root the dispatch
  brief names. Codex keys job state to a hash of the shell's working directory
  and Claude Code resets that directory between Bash calls, so an `await`
  issued from anywhere else reads a different state directory and reports a
  live job as missing.
- **Launch and await never share a shell call.** The launch call returns as
  soon as it prints the job id; awaiting inside that same call rides the tool's
  600s timeout, and when the tool cuts the call off it kills the job with it.
  Every `await` is its own call, `--for 540`, made with Bash `timeout: 600000`.
- **Exit 2 means check the directory first, never relaunch first.** Before any
  relaunch, run both probes:
  `ps -eo pid,args | grep <job-id>`
  `ls ~/.claude/plugins/data/codex-openai-codex/state/*/jobs/<job-id>.json`
  If either probe finds the job, it is alive: go back to
  `cd <sandbox root> && crew-codex await <job-id> --for 540` and keep awaiting
  from the correct directory. Do not relaunch a live job, since a second
  dispatch puts two Codex processes in the same working tree.
- **The relaunch-once rule applies only when both probes come back empty.**
  That is the only state in which the job is genuinely gone.
- **To correct a job in flight, steer it. Never interrupt it.**
  `cd <sandbox root> && crew-codex steer <job-id> "<message>"` interjects into
  the turn the job is running right now. Nothing is stopped: the tool call in
  progress finishes, and the model reads the message at its next step, so it
  can change course before it has done all the wrong work. Its reply lands in
  that job's own result, so nothing extra is needed to see the outcome. This is
  the normal way to correct a running job.
- **Use `queue` when the message is for AFTER the current work.**
  `cd <sandbox root> && crew-codex queue <job-id> "<message>"` leaves a message
  the agent reads once it finishes the whole turn it is running. That is the
  right tool for "when you are done, also do X" and the wrong one for a
  correction, since a turn is the entire task and the message arrives too late
  to change it.
- **`crew-codex redirect` is destructive; keep it for a job off the rails.**
  It interrupts the turn wherever it happens to be, which can leave a
  multi-file edit half applied. Never use it for a routine course correction.
- **Relay what the queued message produced.** The job's own result covers only
  its first turn. When `await` prints `QUEUED-REPLIES n/n captured` it has
  appended the queued turn's answer to the archived result, so
  `crew-codex result` carries both; return all of it verbatim. If it prints
  `QUEUED-REPLIES 0/n`, say so rather than implying the message was acted on.

Primary helper — `crew-codex`, on PATH while the plugin is enabled:

- `crew-codex task [--background] [--write] [--resume-last] [--model <m>] [--effort <none|minimal|low|medium|high|xhigh>] "<prompt>"`
- `crew-codex review [--wait|--background] [--base <ref>] [--scope <auto|working-tree|branch>]`
- `crew-codex adversarial-review [--wait|--background] [--base <ref>] [--scope <...>] [focus text]`
- `crew-codex await <job-id> [--for <seconds>]` — block until the job leaves
  `running`, or until the deadline; prints ONE line. Exit 0 completed,
  1 failed/cancelled, 2 job not found, 3 job died silently, 4 SUPERSEDED by a
  redirect, 10 still running (call again). Exit 4 names the successor job id:
  await that one and own it to the end. A redirect is never a failure. Exit 2 is usually a working-directory mismatch rather than a
  dead job: `crew-codex` probes the sibling state directories and, when it
  finds the job, prints the cwd to re-run from. Verify with the two probes
  above before treating exit 2 as gone. It waits on the job's own process
  (`tail --pid`), so it wakes the instant the job ends rather than on a poll
  timer.
  Exit 3 (STALE) means the process vanished without ever reporting terminal —
  report it verbatim; that job needs a resume or re-dispatch, not more waiting.
- `crew-codex steer <job-id> "<message>"` — interject into the turn the job is
  running RIGHT NOW. The in-flight tool call finishes and the model reads the
  message at its next step, so it can correct course mid-task. Its reply is
  part of that same turn, so it lands in the job's own result. Prints
  `STEERED <job-id> | ...`. This is the normal correction path.
- `crew-codex queue <job-id> "<message>"` — a message for AFTER the current
  turn. Puts the message on the job's Codex thread; the agent reads it
  when it finishes the turn it is already running, so nothing is interrupted
  and no edit is left half applied. Prints `QUEUED <job-id> | ... | id
  crew-<job-id>-<n>`. Requires the codex plugin patch (`crew-codex patch
  --apply`); without it the plugin's broker refuses the method.
- `crew-codex redirect <job-id> [--model <m>] [--effort <e>] "<instruction>"` —
  **destructive**, and the exception rather than the rule. It INTERRUPTS the
  live turn, then resumes the same Codex thread with the new text. Interrupting
  stops the turn wherever it stands, so a job mid-way through a multi-file edit
  can be left half written. Use it only when a job is genuinely off the rails;
  for every ordinary course correction use `queue`. Prints
  `REDIRECTED <old> -> <new>`; await the NEW id. Model, effort and write
  posture carry over unless overridden.
- `crew-codex reap` — retire brokers whose jobs have finished. Runs
  automatically before every launch and on terminal state; only needed by hand
  after an abnormal exit.
- `crew-codex patch [--status|--apply|--revert]` — apply the queue passthrough
  fix to whichever version of the codex plugin is installed. Idempotent and
  reversible; the plugin's SessionStart hook applies it automatically.
- `crew-codex result <job-id>` — the finished job's output (plus its resume id)
- `crew-codex --resolve` — print the resolved companion script path (diagnostics only)

What it does: resolves the official `codex@openai-codex` plugin's
`codex-companion.mjs` via `installed_plugins.json` and execs it, ensuring
`CLAUDE_PLUGIN_DATA` points at the codex plugin's data dir so all jobs share
one state namespace with `/codex:status`, `/codex:result`, `/codex:cancel`
and the codex plugin's session-end cleanup.

Execution rules:

- **Launch → await → report.** Codex jobs run for hours; Claude Code caps a
  single Bash call at 600s. So every dispatch detaches the job
  (`--background`), then loops
  `cd <sandbox root> && crew-codex await <id> --for 540` (each call made with
  Bash `timeout: 600000`, and never in the same shell call as the launch) until
  it stops returning exit 10, then returns
  `cd <sandbox root> && crew-codex result <id>`. The agent owns the job for its
  entire life — a launch handle is NEVER a result, and the loop has no
  iteration limit. Waiting happens inside the shell, so hours of supervision
  cost only one short status line per ~9 minutes.
- Each agent's model/effort/write pins are defaults; only an explicit
  model or effort named in the request overrides them. `spark` maps to
  `--model gpt-5.3-codex-spark`; `astra` maps to `--model gpt-6-astra
  --effort medium` (Astra's registry default), and an effort named in the
  request still wins.
- `cancel`, `redirect` and cross-job triage belong to the main thread
  (`/codex:status`, `/codex:cancel`); a crew agent only awaits the one job it
  launched, or the successor a redirect hands it via exit 4.
- **Every job is reachable, whatever else is running.** A broker carries one
  streaming turn per directory, and the companion's answer to a busy broker is
  to run the job on a private app-server that nothing can reach. In a shared
  parent directory that left exactly one steerable job: whichever won the
  broker first. `crew-codex` now gives each launch its own broker and routes
  later calls back to it, so concurrency no longer decides which jobs can be
  corrected. Brokers are reaped when their job ends; `crew-codex reap` cleans
  up after an abnormal exit.
- **Changing a running job's instructions.** A turn is the WHOLE task, not one
  step, so anything that waits for the turn to end arrives after the work is
  done. To correct a job, `crew-codex steer` it: the message goes into the
  running turn and the model reads it at its next step. Verified end to end, a
  job told at file 2 of 25 to stop stopped at exactly 2 and reported "2 kappa
  files had been created when I read your message". `crew-codex queue` is for
  work that should follow the current task. `crew-codex redirect` is
  destructive (it interrupts first) and `cancel` plus a fresh dispatch is worse
  still, throwing away everything the job had already done.
- Results are archived by `await` on terminal state to
  `~/.claude/plugins/data/codex-crew/jobs/<id>.{result.txt,meta.json,log}`,
  which the companion's 50-job pruner cannot delete. Jobs still die with the
  Claude session by design (its SessionEnd hook terminates them); the archived
  transcript and the `threadId` in the meta file survive, so interrupted work
  resumes (`--resume-last` / `codex resume <threadId>`) instead of restarting.
- Failures are loud: relay raw stderr and exit code verbatim; never return
  empty output on error.
- Model-capacity rejections are retried automatically by `crew-codex` itself
  (3 attempts, jittered 5/15/45s backoff — write-safe because capacity is an
  admission-time rejection; the turn never started). Retry notices appear on
  stderr; relay them like any other output. If it still fails after retries,
  report that verbatim — the orchestrator decides whether to re-dispatch on
  another tier. Do NOT add your own retry loop on top.

Model ladder (per OpenAI's own model registry, Codex CLI 0.153.4):
**gpt-6-astra** = frontier flagship, one generation above the 5.6 ladder,
registry default effort `medium`, keeps notes across context windows, rejects
`none`/`minimal`, asks rather than guesses when input could change the result;
**sol** = top of the GPT-5.6 ladder, which the registry now describes as the
everyday agentic workhorse; **terra** = balanced mid tier; **luna** =
fast/affordable low tier. Also listed: gpt-5.5 (previous generation) and
gpt-5.3-codex-spark (ultra-fast, not in the API). GPT-5.4 Mini was retired on
2026-08-31 in favour of Luna. All listed models accept up to `xhigh`; the
companion runtime (codex plugin 1.0.6) still rejects the registry's higher
`max`/`ultra` efforts, so `xhigh` is the ceiling through this plugin.
