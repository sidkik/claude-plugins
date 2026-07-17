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
- `crew-codex --resolve` — print the resolved companion script path (diagnostics only)

What it does: resolves the official `codex@openai-codex` plugin's
`codex-companion.mjs` via `installed_plugins.json` and execs it, ensuring
`CLAUDE_PLUGIN_DATA` points at the codex plugin's data dir so all jobs share
one state namespace with `/codex:status`, `/codex:result`, `/codex:cancel`
and the codex plugin's session-end cleanup.

Execution rules:

- Crew agents are forwarders, not orchestrators: exactly one `crew-codex`
  invocation per dispatch, stdout returned unchanged.
- Foreground by default: a foreground `task`/`review` blocks until the codex
  job actually finishes, so the subagent returning == the job being done, and
  its stdout is the real result. `--background` breaks that: the companion
  detaches, returns only a launch handle (job id), and the subagent exits
  immediately — the handle is NOT a result. Use `--background` ONLY when the
  request explicitly asks for it, and then the launcher's job id must be
  polled (`crew-codex status`/`result`) before the work is treated as done.
- Each agent's model/effort/write pins are defaults; only an explicit
  model or effort named in the request overrides them. `spark` maps to
  `--model gpt-5.3-codex-spark`.
- Job control (`status`, `result`, `cancel`) belongs to the main thread —
  via `/codex:status`, `/codex:result`, `/codex:cancel` or `crew-codex`
  with those subcommands — never to crew agents.
- Failures are loud: relay raw stderr and exit code verbatim; never return
  empty output on error.

GPT-5.6 family ladder (per OpenAI's own model registry): **sol** = flagship
frontier coding tier, **terra** = balanced everyday mid tier, **luna** =
fast/affordable low tier. Other known models (Codex CLI 0.144.0): gpt-5.5,
gpt-5.4, gpt-5.4-mini, gpt-5.3-codex-spark. All listed models accept up to
`xhigh`; the companion runtime rejects the registry's higher `max`/`ultra`
efforts — `xhigh` is the ceiling through this plugin.
