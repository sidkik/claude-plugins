---
name: crew-runtime
description: Internal contract for invoking the shared codex-companion runtime from codex-crew agents
user-invocable: false
---

# Crew Runtime

Use this skill only inside `codex-crew` agents (`codex-implementer`,
`codex-reviewer`, `codex-fast`).

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
- Each agent's model/effort/write pins are defaults; only an explicit
  model or effort named in the request overrides them. `spark` maps to
  `--model gpt-5.3-codex-spark`.
- Job control (`status`, `result`, `cancel`) belongs to the main thread —
  via `/codex:status`, `/codex:result`, `/codex:cancel` or `crew-codex`
  with those subcommands — never to crew agents.
- Failures are loud: relay raw stderr and exit code verbatim; never return
  empty output on error.

Known models (Codex CLI 0.144.0): gpt-5.6-terra, gpt-5.6-sol, gpt-5.6-luna,
gpt-5.5, gpt-5.4, gpt-5.4-mini (no xhigh effort), gpt-5.3-codex-spark.
