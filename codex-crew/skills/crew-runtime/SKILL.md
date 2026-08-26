---
name: crew-runtime
description: Internal contract for invoking the shared codex-companion runtime from codex-crew agents
user-invocable: false
---

# Crew Runtime

Use this skill only inside `codex-crew` agents (`codex-implementer-sol`,
`codex-implementer-terra`, `codex-implementer-luna`, `codex-reviewer`).

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
- **To change a running job's course, queue a message. Never interrupt it.**
  `cd <sandbox root> && crew-codex queue <job-id> "<message>"` hands the job
  new instructions without stopping it: the message waits, and the agent reads
  it the moment it finishes the turn it is already running. A job halfway
  through a large multi-file edit therefore lands that edit first.
  `crew-codex redirect` is the destructive alternative, since it interrupts
  the turn wherever it happens to be and can leave an edit half applied. Keep
  redirect for a job that is genuinely off the rails, never for a routine
  course correction.
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
- `crew-codex queue <job-id> "<message>"` — the normal way to change a running
  job's course. Puts the message on the job's Codex thread; the agent reads it
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
  `--model gpt-5.3-codex-spark`.
- `cancel`, `redirect` and cross-job triage belong to the main thread
  (`/codex:status`, `/codex:cancel`); a crew agent only awaits the one job it
  launched, or the successor a redirect hands it via exit 4.
- **Changing a running job's instructions.** Use `crew-codex queue`. The
  message lands on the thread and the agent picks it up at the end of its
  current turn, which is how a person redirects an agent and is the only option
  that cannot corrupt work in progress. `crew-codex redirect` is destructive
  (it interrupts first) and `cancel` plus a fresh dispatch is worse still,
  throwing away everything the job had already done. Verified end to end: a
  message queued at file 2 of 10 left the series intact through file 10, and
  the agent then carried out the queued instruction.
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

GPT-5.6 family ladder (per OpenAI's own model registry): **sol** = flagship
frontier coding tier, **terra** = balanced everyday mid tier, **luna** =
fast/affordable low tier. Other known models (Codex CLI 0.144.0): gpt-5.5,
gpt-5.4, gpt-5.4-mini, gpt-5.3-codex-spark. All listed models accept up to
`xhigh`; the companion runtime rejects the registry's higher `max`/`ultra`
efforts — `xhigh` is the ceiling through this plugin.
