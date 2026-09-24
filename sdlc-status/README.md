# SDLC status

A local, per-session display of work and evidence standing. GitHub remains the authority. Nothing here verifies claims, approves work, advances a workflow, polls GitHub or stores a history. Node 18+; no dependencies or network during rendering.

## Setup

Install from the existing Sidkik Claude marketplace when ready:

```sh
claude plugin install sdlc-status@sidkik-plugins
```

Installation discovers the skill; configuring the footer is a separate explicit step. These examples are manual configuration, not an installer. Preserve your existing status command/settings: compose its output with this command in your own wrapper, or retain it and use the text command. A wrapper must read stdin once and pass the same JSON to each renderer. Replace `/absolute/path/to/sdlc-status` with your checkout or installed plugin location; cache paths can change after upgrades.

### Claude Code

Merge this field into your selected settings file, without replacing other keys:

```json
{"statusLine":{"type":"command","command":"node \"/absolute/path/to/sdlc-status/scripts/status.mjs\" claude","refreshInterval":30}}
```

The command consumes Claude's documented `session_id` from JSON stdin. It prints five bounded lines. Use `--width 100` to narrow them. Obtain the current ID from Claude's session information or the current transcript filename; confirm it belongs to this session before writing. Never infer it from the working directory.

[Claude status-line contract](https://code.claude.com/docs/en/statusline) and [plugin packaging](https://code.claude.com/docs/en/plugins-reference). The main status line is separately configured, not automatically installed by the plugin manifest.

### Grok Build

Manually merge into your user/managed `~/.grok/config.toml`, preserving other configuration, then restart Grok:

```toml
[ui.status_line]
type = "command"
command = 'node "/absolute/path/to/sdlc-status/scripts/status.mjs" grok --width 200'
refresh_interval = 30
```

Grok receives one compact row. Native `session_id` is documented in the installed Grok Build 1.0.34 embedded status-line manual; the public page lists only common fields. The renderer accepts that native ID, namespaced separately from Claude. Fixtures exercise its documented shape; a live Grok TUI session has not been tested. [Status-line documentation](https://docs.x.ai/build/features/status-line), [plugin compatibility](https://docs.x.ai/build/features/skills-plugins-marketplaces).

If a CLI omits session identity, explicitly allocate a unique token for this launch, expose it to both the renderer and the accountable agent, and reuse it only when resuming that same work session:

```sh
export SDLC_STATUS_SESSION="$(node "/absolute/path/to/sdlc-status/scripts/status.mjs" new-session)"
printf '%s\n' "$SDLC_STATUS_SESSION"
grok
```

Use this fallback only if the native ID is absent; if both exist they must agree, otherwise rendering reports UNKNOWN. Do not place one fixed token in global settings or a shared shell startup file. Native IDs are preferred. The writer always takes explicit client and identity.

### Codex

Codex has no supported arbitrary native footer here. Use the same launch-token procedure with `codex` in place of `grok`. The agent can read `SDLC_STATUS_SESSION` from its environment. Inspect with:

```sh
node "/absolute/path/to/sdlc-status/scripts/status.mjs" text --client codex --session "$SDLC_STATUS_SESSION"
```

The agent may present that text at substantive changes; this is a manual/text fallback, not persistent native integration. A Codex manifest is supplied for compatible plugin loaders, but no Codex marketplace is registered or user configuration modified. [Codex status-line configuration](https://learn.chatgpt.com/docs/config-file/config-reference).

## Write and inspect

Use the real session ID or arranged token in `SESSION_ID`. Pass strings as JSON, not shell-interpolated commands:

```sh
node "/absolute/path/to/sdlc-status/scripts/status.mjs" write --client claude --session SESSION_ID <<'JSON'
{
  "work": "https://github.com/sidkik/core/issues/478",
  "phase": "Implementation",
  "skills": [{"name": "temporal-workflow-writer", "standing": "loaded"}],
  "checks": [{"name": "architecture review", "result": "pending", "source": "agent", "actor": "primary"}],
  "next": "Complete the independent architecture review",
  "human": {"status": "none", "detail": "Continuing within approved scope"}
}
JSON
node "/absolute/path/to/sdlc-status/scripts/status.mjs" inspect --client claude --session SESSION_ID
```

`skills[].standing`: `loaded`, `applied`, `pending`; applied requires `reference` identifying the performed work. `checks[].result`: `passed`, `failed`, `pending`, `unknown`; passed/failed require `reference`. Each check has `source` (`agent` or `reviewer`) and `actor`. References should identify the reviewed/tested revision and result, preferably its GitHub receipt. They are inspectable text, never executed or independently authenticated. `human.status`: `none`, `needed`, `unknown`, with `detail` in every case. The schema intentionally has no approval or universal compliance field.

The writer assigns schema version 1, client/session and timestamp; callers cannot forge freshness through an input timestamp. Each valid update atomically replaces one projection. Invalid writes preserve the previous state. Defaults: `$HOME/.local/state/sidkik-sdlc-status`, stale after 900 seconds (`--max-age` overrides per renderer). `SDLC_STATUS_DIR` can select a private local state directory shared by writer and renderer; it is not a repository artifact. IDs are hashed with the CLI namespace. Empty/malformed/wrong-session/future data displays UNKNOWN. Stale state retains its last reported facts under STALE. A narrow single row may omit detail: use `inspect` for the complete account. The display uses plain ASCII and strips terminal controls, including hyperlink escapes.

This is isolation against accidental cross-session access, not a security boundary against another process running as the same user. Concurrent writers for the same session are last-writer-wins; the accountable session owns updates and consolidates helper results. No history is retained. Remove that session's projection or the private state directory when it is no longer needed.

## Verify

```sh
node --test sdlc-status/tests/status.test.mjs
python3 /path/to/plugin-creator/scripts/validate_plugin.py sdlc-status
python3 /path/to/skill-creator/scripts/quick_validate.py sdlc-status/skills/sdlc-status
```

Tests invoke the real CLI with isolated temporary state. They do not claim live footer installation or human approval enforcement.
