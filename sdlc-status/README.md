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

The command consumes Claude's documented `session_id` from JSON stdin. It prints five bounded lines with an attention marker, stage chain and unmet criteria. Use `--width 100` to narrow them. Obtain the current ID from Claude's session information or the current transcript filename; confirm it belongs to this session before writing. Never infer it from the working directory.

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
issue and next action appear when space permits, with an inspection pointer. Claude keeps five rows. Both color and plain modes
truncate visible text, not ANSI bytes. Terminal font size applies to the terminal;
this plugin uses color, bold and layout rather than per-row font-size escapes.


## Required stages and evidence

Version 0.2.0 adds a criterion-derived stage chain. The agent initializes it from
`template --route triage|feature|delivery|research`; you can start with an ordinary
request such as “triage #456.” The skill owns checklist updates, not the human.
Templates in `templates/routes.json` pin the canonical planning source by path,
commit and SHA-256. Their required IDs cannot be replaced with a caller's list.

```text
? reported | core#456 | ? PENDING
Intake[?] > Verify[.] > Refine[.] > Brief[.] > Review[.] > Closeout[.]
SK-orchestrator-load: orchestrator loaded (unknown)
Next: Read orchestrator before planning evidence delegation
Human: none | inspect
```

`[ok]` green means every applicable required criterion has current reported
proof, including independent assessment where required. `[?]` amber is current
pending/unknown; `[.]` is future work. `[!]` red is a failure or attempted
advancement/explicit completion with an unmet prerequisite. `[E]` amber is an
authorized exception, never an unqualified complete stage. `[-]` is justified
N/A. These meanings survive color being disabled. Reports remain unauthenticated;
even an independent assessment is a reported reference, not a verified identity.

Stages abbreviate Intake, Verify, Refine, Brief, Review, Ready/start, Deliver and
Closeout. The route governs which appear. Load requirements occur before their
governed activity, application requirements need actual outputs. Conditional
skills remain visible until supported or explicitly dispositioned N/A. All
triage includes coordinated policy review; orchestrator load is therefore an
intake obligation. Feature refinement chooses its applicable grill/wayfinder
path and records why other conditional skills are inapplicable.

Generate an exhaustive starting payload, then have the accountable agent fill
in its real work data and evidence:

```sh
node /absolute/path/to/sdlc-status/scripts/status.mjs template --route triage
node /absolute/path/to/sdlc-status/scripts/status.mjs write --client claude --session SESSION_ID < session-payload.json
node /absolute/path/to/sdlc-status/scripts/status.mjs inspect --client claude --session SESSION_ID
```

The JSON's `progress` object has `template`, `route`, `sourceRevision`,
`evidenceRevision`, `active`, `claimedComplete`, `activities` and `results`.
`sourceRevision` is the pinned canonical SHA-256; `evidenceRevision` identifies
the actual candidate/context used for evidence. A result is keyed by a template
criterion ID:

```json
{"status":"passed","actor":"primary","reference":"GitHub receipt or concrete retained output","revision":"actual-candidate-revision"}
```

Status may be `unknown`, `pending`, `passed`, `failed`, `na` or `exception`.
Missing results, pass claims without evidence, mismatched revisions and absent
required independent assessments derive unknown. `na` is permitted only for
conditional criteria and requires `reason`. A required independent criterion
also needs `assessment: {"result":"passed","actor":"different-reviewer",
"reference":"assessment receipt","revision":"actual-candidate-revision"}`.
An exception needs a reason, alternative evidence and
`authority: {"kind":"human","actor":"actual decision maker",
"reference":"scoped decision receipt","revision":"actual-candidate-revision"}`;
required independent assessment still applies. References are text, never executed.

For a triggered specialist skill beyond the template, add declarations before
its governed activity to `progress.additions`, with a separate load/application
criterion. For example:

```json
{"id":"X-temporal-workflow-writer-load","stage":"DE","label":"temporal-workflow-writer loaded","source":".claude/skills/temporal-workflow-writer/SKILL.md","sourceRevision":"actual-skill-sha256"}
```

Declare the corresponding `X-temporal-workflow-writer-apply` requirement and
record its actual outputs under `results`. Declarations are bounded to 40, use
`X-` IDs, and cannot replace a template criterion. Existing declarations persist
when omitted from an update for the same work and route/template; omitted
results become unknown. A changed declaration is rejected. A justified N/A
requires a declaration marked `conditional: true` and a result reason.
A same-route template upgrade preserves existing declarations without another
review checkpoint. Changing route for already tracked work requires `routeChange` with
actor, reference, current revision and a distinct actor's passing assessment
(the same assessment shape above). Reuse an existing applicable policy assessment; this is not an extra checkpoint.
This permits a reviewed reset, not silently
shrinking the denominator. Tracked work cannot be downgraded to schema 1.

Set `activities` to include `delegation` before attempting dispatch, add stage
IDs to `claimedComplete` when claiming completion, and set `active` to the stage
being entered. Missing prior criteria become violations. A phase sentence such
as “verification done” has no authority over the chain: this tool does not parse
natural-language claims or observe unreported activity. Agents must report these
explicit events accurately. A user correction requires invalidating affected
criterion results, not merely changing the phase sentence.

Rendering compares source evidence to the packaged pin. Supply known current
revisions with `--source-revision SHA256 --evidence-revision REVISION` to detect
subsequent changes; no background GitHub fetch occurs. Stale state, mismatched
revisions and unknown template versions withdraw green. Reconcile evidence
before writing fresh state. Inspect preserves reported evidence for diagnosis.

Schema-1 writes remain supported for migration and display `legacy/untracked`;
they provide no stage completion. Reinitialize from `template` to adopt schema 2
and carry only still-applicable evidence. The writer assigns schema version,
client/session and timestamp. Each bounded valid write atomically replaces one
private local projection; invalid writes leave the prior projection untouched.
The human must still compare assertions to evidence where assurance matters.

## Behavioral trials

Use the canonical [fresh-session prompts](https://github.com/sidkik/planning/blob/c4484ddc583baa091455028ce7657837b8890d04/tests/fixtures/sdlc-stage-prompts.md)
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
