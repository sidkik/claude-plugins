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

Version 0.3.1 requires verified display updates after substantive events and
before yielding changed state to the user. It retains Intake orchestrator load
and explicit bug reproduction criteria. The agent initializes it from
`template --route triage|feature|delivery|research`; you can start with an ordinary
request such as “triage #456.” The skill owns checklist updates, not the human.
Templates in `templates/routes.json` pin the canonical planning source by path,
commit and SHA-256. Their required IDs cannot be replaced with a caller's list.

```text
core#456 | Triage | PENDING                                      Obs: unavailable
→ ? Intake  · Verify  · Refine  · Brief  · Review  · Closeout
Next: Load orchestrator before selecting the route | inspect
```

`✓` green means every applicable required criterion has current reported
proof, including independent assessment where required. `?` amber is current
pending/unknown; `·` is future work. `✕` marks a failure in red, or attempted
advancement/explicit completion with an unknown prerequisite in amber. `E` amber is an
authorized exception, never an unqualified complete stage. `-` is justified
N/A. `→` identifies the current stage without concealing its separate status
symbol. These meanings survive color being disabled. Reports remain unauthenticated;
even an independent assessment is a reported reference, not a verified identity.

Stages abbreviate Intake, Verify, Refine, Brief, Review, Ready/start, Deliver and
Closeout. The route governs which appear. Load requirements occur before their
governed activity, application requirements need actual outputs. Conditional
skills remain visible until supported or explicitly dispositioned N/A. Every route places orchestrator load at Intake, following the governing
`sdlc-process` entry before route selection or the next action. Missing skill
availability stays an explicit unknown capability gap; only dependent work
pauses. Loading the skill does not require spawning agents, and application
remains at the stage where governed work actually occurs. Feature refinement chooses its applicable grill/wayfinder
path and records why other conditional skills are inapplicable.

For a current defect being reproduced for repair, Verify includes `VE-BUG1`
(accepted expectation), `VE-BUG2` (relevant-path failure on the reported symptom,
not setup/mock configuration or an unrelated failure), and `VE-BUG3` (retained exact test/source,
command, tested revision and expected/actual results). Their passes mean
reproduction complete. `RS-BUG1`, at triage disposition or delivery Ready/start,
applies when actually proposing ready/start and requires bounded repair authority
and applicable readiness/start controls. For disposition-only triage or a requested
stop/handoff, record N/A with that reason; do not require more diagnosis or
readiness work before preserving the current state and handing off.
Red alone does not mean ready or fixed. Existing review requirements still apply.

Once reproduction is complete and no diagnostic gap remains, conditional
`diagnosing-bugs` load/application can be N/A when diagnosis was not needed.
Preserve actual load/application evidence when diagnosis was needed and performed. An unknown
conditional skill requires an applicability decision, not automatic invocation.
Further minimization and ranked hypotheses are not prerequisites to routine
repair. Investigate a named remaining gap instead. Non-bug, already-fixed and
specifically approved alternative-verification dispositions record their concrete
N/A basis for inapplicable reproduction criteria; ordinary verification and
policy obligations remain. The renderer checks reported evidence fields, not
whether the referenced test actually reproduced the symptom.

The criterion template is now `sidkik-sdlc@3`. Old templates lose green until
reinitialized; carry forward only applicable current evidence. This same-route
upgrade needs no new review checkpoint.

Generate an exhaustive starting payload, then have the accountable agent fill
in its real work data and evidence:

```sh
node /absolute/path/to/sdlc-status/scripts/status.mjs template --route triage
node /absolute/path/to/sdlc-status/scripts/status.mjs write --client claude --session SESSION_ID < session-payload.json
node /absolute/path/to/sdlc-status/scripts/status.mjs record --client claude --session SESSION_ID < event.json
node /absolute/path/to/sdlc-status/scripts/status.mjs inspect --client claude --session SESSION_ID
```

After initialization, `record` accepts one atomic event with `changed` state
fields, affected `results`, and optional shared `evidence` and `assessment`.
It validates and writes the merged state, then returns the same inspection used
for verification. Shared evidence does not supply independent approval.

Update after an accepted human decision, skill load/application, dispatch,
agent return/review, new or resolved blocker, or a phase/next-action/human-need
change. Batch events from one response into one write while preserving updates
required before governed activity. Before yielding to the user, flush substantive
changes since the last verified update. Unchanged turns need no duplicate write.

Check the writer's exit status, then inspect the same client, session and state
directory. Compare the actual work identity, phase/active stage, affected criterion
results, next action and human need. On write failure, inspection failure or
mismatch, report the display failure before the ordinary reply and correct it
within existing authority. Invalid writes preserve the previous projection, so an
old footer is not evidence the new update succeeded. Refreshing only its timestamp
does not renew evidence. These are agent responsibilities: the renderer cannot
detect an omitted write or authenticate the reported events.

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
review checkpoint. Changing the projected route needs no manufactured review:
display bookkeeping is not execution. The writer preserves an immutable prior
route snapshot, keeps attempted failures visible, and requires an
evidenced `historyDispositions` entry before those failures stop holding delivery
completion. Triage and Delivery completion remain distinct in the compact
summary. Actual starts and advancement remain governed by the retained route
criteria and applicable assessment. Tracked work cannot be downgraded to schema 1.

Claude's compact footer also shows the observer state. `seen Ns ago` requires
matching native runtime evidence for this MAIN session; launch intent without
that evidence is starting, while setup/version/custom-agent conflict is
unavailable. Installation, configuration or an agent definition does not
establish activity. This is an as-of observation, not a heartbeat or policy
approval.

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
