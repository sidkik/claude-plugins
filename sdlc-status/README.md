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

The command consumes Claude's documented `session_id` from JSON stdin. It prints three bounded rows for attention, the route/stage chain and the next action. A material failure adds one concise blocker row; full criterion IDs and evidence remain in `inspect`. Use `--width 100` to narrow them. Obtain the current ID from Claude's session information or the current transcript filename; confirm it belongs to this session before writing. Never infer it from the working directory.

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

## Readability and color

Claude and Grok use ANSI color and bold by default, including when the CLI pipes
status output. Amber marks human decisions and unresolved checks; red marks
failures and stale/unknown state; cyan marks phase. Green qualifies reported, evidenced criterion completion, never authenticated
compliance. Labels convey the same meaning in plain text.

Use `--color auto|always|never`. Auto respects `NO_COLOR` (including an empty
value) and `TERM=dumb`; explicit `always` overrides them. Codex/text remain plain
by default; `inspect` is always plain and retains full names, attribution and
references. Use it when the compact footer truncates details.

`--width` sets a 20–500 column limit; otherwise `COLUMNS` is bounded to that
range, defaulting to 140. Grok keeps one row with attention, current stage and reported assurance;
issue and next action appear when space permits, with an inspection pointer. Claude keeps three rows, adding one blocker row for a material failure. Both color and plain modes
truncate visible text, not ANSI bytes. Terminal font size applies to the terminal;
this plugin uses color, bold and layout rather than per-row font-size escapes.


## Required stages and evidence

The accountable agent maintains the checklist; the human need not construct JSON
or prescribe the route, and an ordinary request such as “triage #456” is enough.
The agent-facing contract is owned by [the skill](skills/sdlc-status/SKILL.md) and
delivered in its native invocation result, so it is not duplicated here: session
identity, the CLI commands, the stage and symbol meanings, the progress and
criterion-result schema, declarations beyond the template, revision checks,
bug-reproduction criteria and the repository board hook. A footer looks like:

```text
core#456 | Triage | PENDING                                      Obs: unavailable
→ ? Intake  · Verify  · Refine  · Brief  · Review  · Closeout
Next: Load orchestrator before selecting the route | inspect
```

Templates in `templates/routes.json` pin the canonical planning source by path,
commit and SHA-256. Claude's compact footer also shows the observer state:
`seen Ns ago` requires matching native runtime evidence for this MAIN session;
launch intent without it is starting, while a setup/version/custom-agent conflict
is unavailable. Installation, configuration or an agent definition does not
establish activity, and this is an as-of observation, not a heartbeat or policy
approval. The human must still compare assertions to evidence where assurance
matters.

## Behavioral trials

Use the canonical [fresh-session prompts](https://github.com/sidkik/planning/blob/18b7aca81996f0ce2bd7445bb80c49bce0d2f9f3/tests/fixtures/sdlc-stage-prompts.md)
without leaking evaluator expectations into the new session. The planning test
suite owns those prompts and their separate expected outcomes. Plugin CLI tests
exercise actual rendering/validation with isolated temporary state; they are not
proof that a fresh model follows instructions or that a live CLI is configured.

## Verify

```sh
node --test sdlc-status/tests/status.test.mjs
python3 /path/to/plugin-creator/scripts/validate_plugin.py sdlc-status
python3 /path/to/skill-creator/scripts/quick_validate.py sdlc-status/skills/sdlc-status
```

Tests invoke the real CLI with isolated temporary state. They do not claim live footer installation or human approval enforcement.
