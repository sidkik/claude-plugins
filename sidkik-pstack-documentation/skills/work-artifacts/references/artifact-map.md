# PStack artifact ownership and locations

This map separates PStack 2.0.0 behavior from this plugin's Sidkik conventions.
Resolve PStack paths from the installed plugin, never a hard-coded cache version.
If the installed playbook differs, preserve its executable paths and formats and
report the mismatch before changing dependent documentation.

## PStack-owned artifacts

| Artifact | Owner and location | Retention |
| --- | --- | --- |
| Task checklist | Harness task tool; without one, `.audit/<task-slug>.todo.md` under `poteto-mode` | Local, uncommitted fallback |
| Standalone decision trail | `show-me-your-work`; `decisions.tsv` in the work directory or `.audit/<task-slug>.tsv` for concurrent efforts, unless the selected playbook overrides the location | Local by default; the selected playbook can require a reviewable committed trail |
| Orchestrate state and trail | `${XDG_STATE_HOME:-$HOME/.local/state}/t3-pstack/orchestrate/<slug>/`; `orch.ts` owns bookkeeping and regenerates status; `show-me-your-work` owns appending `decisions.tsv` in that directory | Machine-local; preserve the store at completion |
| Autopilot state and trail | Root store `${XDG_STATE_HOME:-$HOME/.local/state}/t3-pstack/`; `autopilot-full` owns recovery records and trail placement, inherited by `autopilot-stack` | Preserve recovery records; do not impose the Orchestrate layout or `orch.ts` |
| Pause/resume note | `pause-safely` owns the checkpoint; for compaction it names a file like `/tmp/<slug>-resume.md` and links an existing trail | Local recovery context; an optional durable handoff supplements rather than replaces it |
| Multi-phase plan | `poteto-mode/playbooks/multi-phase-plan.md` owns the skeleton and `check-plan.mjs`; its default is the agent store's `docs/`, with an explicit path override allowed | The playbook does not define a universal commit policy |
| `how` and `why` explanation | Their skills own the response structure | Chat output does not automatically require a file |
| Application verification skill | `create-verification-skill` and `maintain-verification-skill`; `<skills-dir>/verify-<app>/SKILL.md` and `features/` | Maintained project source |
| Formal verification skill and models | The formal-verification creation and maintenance skills choose project-specific paths | Preserve discovered source paths and coverage records |
| Verification run proof | The project's verification skill names its evidence directory | Must survive run cleanup; shared retention is configured separately |

The verification generator uses `.claude/skills` on Claude Code and `.agents/skills`
elsewhere. A repository can explicitly select another supported location. Core's
`.claude/skills/verify-core/` is such a project choice, not a cross-project default.
Keep one source and configure consumers to read it rather than creating divergent
copies for each client.

The phrase "agent store's docs" is not a precise path in the reviewed multi-phase
playbook. A repository adopting this plugin can explicitly select its durable
work root for authored plans. This changes the plan destination, not its skeleton,
validator, execution authorization or orchestration store.

## Sidkik conventions for durable documents

Preserve an existing canonical record unless the user explicitly changes its
ownership. For new records, use the repository configuration. The fallback is
`docs/work/<work-key>/` in the repository owning the change.

| Record | Default relative to the work root | When useful |
| --- | --- | --- |
| Research | `<topic>.research.md` | Findings must survive the conversation or be shared with another worker |
| Specification | `<topic>.spec.md` | The task needs a durable behavioral contract not already owned elsewhere |
| Plan | `<topic>.plan.md` | PStack or the user calls for a persisted plan |
| Decision | `<topic>.decision.md`, or the existing ADR location | A consequential choice needs a lasting rationale |
| Review | `<topic>.review.md` | A requested or necessary review record needs more than the existing PR discussion |
| Evidence summary | `<run-id>.evidence.md` | Revision, result and links to retained proof must survive the run |
| Handoff | `<topic>.handoff.md` | Another session needs durable context not already captured by PStack's store |

These filenames are proposed Sidkik conventions, not upstream PStack requirements.
They neither require a document for every type nor authorize GitHub publication.
An existing initiative hierarchy can remain intact. Work keys identify the same
effort across repositories without giving every repository a copy of its shared plan.

Domain glossaries, architecture references, API docs and runbooks stay in their
established maintained locations. Pocock's root `CONTEXT.md` and `docs/adr/` pattern
is compatible when already adopted. This plugin does not impose domain modeling
or rename an existing `ARCHITECTURE.md`, ADR tree or runbook collection.

## Source boundaries

Reviewed against the installed `t3-pstack` 2.0.0 skills on 2026-10-24:
`poteto-mode`, `show-me-your-work`, `how`, `why`, `create-verification-skill`, and
the `orchestrate`, `autopilot-full`, `autopilot-stack`, `pause-safely` and
`multi-phase-plan` playbooks. Upstream PStack lives in
[cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack).
The T3 adapter lives in [t3-pstack](https://github.com/chhoumann/t3-pstack).

The Pocock setup pattern supplies the idea of a small per-repository configuration
file linked from agent instructions. Sidkik's existing work-artifacts convention
supplies optional typed filenames and canonical ownership. This plugin does not
import their workflow routing, mandatory frontmatter, acceptance receipts or
planning-repository gates.
