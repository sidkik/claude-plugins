---
name: crew-runtime
description: Internal contract for invoking the shared codex-companion runtime from codex-crew agents
user-invocable: false
---

# Crew Runtime

Use this skill only inside `codex-crew` agents (`codex-implementer-sol`,
`codex-implementer-terra`, `codex-implementer-luna`, `codex-reviewer`).

Primary helper — `crew-codex`, on PATH while the plugin is enabled:

- `crew-codex task [--background] [--write] [--resume-last] [--model <m>] [--effort <none|minimal|low|medium|high|xhigh>] "<prompt>"`
- `crew-codex review [--wait|--background] [--base <ref>] [--scope <auto|working-tree|branch>]`
- `crew-codex adversarial-review [--wait|--background] [--base <ref>] [--scope <...>] [focus text]`
- `crew-codex await <job-id> [--for <seconds>]` — block until the job leaves
  `running`, or until the deadline; prints ONE line. Exit 0 completed,
  1 failed/cancelled, 2 job not found, 3 job died silently, 10 still running
  (call again). It waits on the job's own process (`tail --pid`), so it wakes
  the instant the job ends rather than on a poll timer.
  Exit 3 (STALE) means the process vanished without ever reporting terminal —
  report it verbatim; that job needs a resume or re-dispatch, not more waiting.
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
  (`--background`), then loops `crew-codex await <id> --for 540` (each call
  made with Bash `timeout: 600000`) until it stops returning exit 10, then
  returns `crew-codex result <id>`. The agent owns the job for its entire
  life — a launch handle is NEVER a result, and the loop has no iteration
  limit. Waiting happens inside the shell, so hours of supervision cost only
  one short status line per ~9 minutes.
- Each agent's model/effort/write pins are defaults; only an explicit
  model or effort named in the request overrides them. `spark` maps to
  `--model gpt-5.3-codex-spark`.
- `cancel` and cross-job triage belong to the main thread (`/codex:status`,
  `/codex:cancel`); a crew agent only awaits the one job it launched.
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
