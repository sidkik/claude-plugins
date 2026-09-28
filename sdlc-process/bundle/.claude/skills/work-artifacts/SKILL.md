---
name: work-artifacts
description: Organize Sidkik work documents into initiative, workstream and work-item folders with typed Markdown filenames, canonical ownership, lifecycle metadata and coordinated migration. Use before creating, materially editing, reviewing, moving or consolidating specs, plans, spikes, research, evidence, maps, handoffs or session records under docs/work, including agent-orchestration POCs. Reuse existing records and link governing sources to prevent contradictory copies.
---

# Work artifacts

Apply this convention to new managed work documents under `docs/work`. For existing documents, follow the migration procedure below when renaming or splitting them; ordinary progress updates do not require a bulk migration. Tool-required `SKILL.md`, `AGENTS.md`, `CLAUDE.md`, domain `CONTEXT.md`, existing ADR conventions and short navigation `README.md` files retain their names. This skill governs organization; the applicable process and task skills still govern the work itself.

## 1. Establish ownership before writing

Read the effort's index, canonical tracker/work record and active session registry. Locate existing records for the same subject and purpose. Update the owning record if one exists; create another only for a distinct purpose or observation. Do not create a summary that independently restates governing requirements.

Identify the canonical location and owner of each logical record. A tracker issue can own a spec or Wayfinder map. Local files then point to it or preserve a frozen snapshot. A locally owned draft can transfer authority to the tracker explicitly on publication; convert its old location to a reference or snapshot. Neither location silently becomes a second editable authority.

## Keep working material out of Git

Commit maintained deliverables needed by the work: agreed specifications, durable
architecture decisions, reusable instructions and documentation required to use or
maintain the change. Keep progress, decisions and concise validation results in the
existing issue/PR; link retained evidence when it is needed to assess a claim.

Do not add or commit session transcripts, chronological work diaries, raw command
or test logs, copied reviewer conversations, intermediate manifests, scratch notes,
or a bundled execution history unless the user explicitly requests that artifact.
A request to fix, review, verify or close work is not a request for such an archive.
A requested review artifact contains the scoped findings and disposition, not the
entire investigation. Required test fixtures and maintained reproduction tests are
code/test assets, not disposable logs.

Use the tool/session's working storage for disposable output. Keep required durable
planning/handoff documents in the established work container; temporary output must
not become the only copy of a decision or required proof. Where raw proof must be
retained, use the existing approved artifact store or CI artifacts and link the
necessary evidence; if retention is unavailable, report that gap without creating
an unsolicited repository archive. Preserve existing published history; this rule
does not authorize deleting other owners' records or rewriting Git history.

Before staging, inspect each added document: name its maintained purpose or the
user's explicit request. Leave working material out of the commit. A policy or
review evidence requirement does not by itself require another Markdown file.

## 2. Choose a type and location

Use lowercase kebab-case `<topic>.<type>.md`. Dates or run IDs precede the suffix for distinct observations. Put lifecycle and revision information in metadata, not filenames such as `final-v2.md`. Types are available choices, not a checklist of files to create; a small plan can remain on its issue and acceptance criteria belong in the spec.

| Type suffix | Owns |
| --- | --- |
| `.map.md` | Decision navigation, destination and pointers, or a reference to the canonical Wayfinder tracker map. |
| `.process.md` | Reusable workflow, skill routing, gates and lifecycle rules. |
| `.spec.md` | Deliverable intent, scope, behavior and acceptance criteria. |
| `.plan.md` | Delivery sequence, dependencies and execution approach tied to a spec revision. |
| `.decision.md` | Choice, alternatives, rationale and authority, or a reference to its owning decision record. |
| `.spike.md` | Bounded learning question, hypothesis, procedure, budget and pass/fail/inconclusive rules. |
| `.research.md` | Attributed source findings, versions, observation dates and limitations. |
| `.evidence.md` | Actual execution results, tested revisions, environment and outcomes. |
| `.handoff.md` | Assignment and minimum context pointers for the next worker. |
| `.session.md` | Owned progress, questions and replies, separating latest status from historical entries. |

### Choose the work container

Folder hierarchy expresses ownership and scope; the filename suffix expresses the document's purpose. Choose the smallest container that fits:

| Container | When to use it | Location for new work |
| --- | --- | --- |
| Initiative | A durable outcome spanning related decisions or independently delivered blocks, potentially across repositories. Its map links the owning tracker and participating repositories. | `docs/work/initiatives/<initiative>/` in one designated coordination repository. |
| Workstream | An initiative area with distinct ownership or a continuing sequence of work, such as chat or context infrastructure. Optional; avoid a workstream for every task. | `<initiative-root>/workstreams/<workstream>/` |
| Work item | One tracked feature block, regression, spike or enabling task with a completion contract. | `<owning-container>/items/<tracker-key>-<slug>/` |
| Standalone work item | Bounded work that belongs to no initiative; reuse existing approved behavior for regressions. | `docs/work/items/<tracker-key>-<slug>/` |

Use an unambiguous tracker key such as `core-gh-517`. A POC describes an evaluation milestone, not a separate folder hierarchy: its children can include both learning spikes and retained implementation. A decision map's child questions and a feature's delivery children retain their distinct tracker relationships. Folder nesting does not grant approval or create an integration branch.

Existing effort roots can remain in place as registered initiative roots. Declare that exception in their README and map metadata rather than splitting one active initiative across old and new roots. In particular, `docs/work/agent-orchestration/` remains this initiative's root while its POC sessions are active. Other existing work areas migrate only within their owners' authorized scope.

Use this layout inside a container, creating directories only when needed:

```text
<initiative-root>/
  README.md
  <effort>.map.md
  process/<topic>.process.md
  decisions/<topic>.decision.md
  workstreams/<workstream>/<topic>.{spec,plan,spike,handoff}.md
  workstreams/<workstream>/items/<tracker-key>-<slug>/
    <topic>.{spec,plan,spike}.md
    evidence/<run-id>.evidence.md
  research/<topic>/<date>-<subject>.research.md
  evidence/<work-item>/<run-id>.evidence.md
  sessions/README.md
  sessions/<owner>.session.md
  archive/
```

The brace notation lists alternatives, not literal filenames or mandatory files. An item with only one useful record can remain on its issue. Keep research/evidence at the narrowest owning container and link it from others; initiative-wide research belongs at the initiative root. Sessions describe actors and coordination, not a second work backlog. Organize by stable identity rather than Kanban lane, assignee or transient status.

Reusable organization-wide processes belong in the designated shared standards/skills source; initiative-specific process drafts belong here until deliberately promoted. Long-lived ecosystem, domain, API and operational documentation remains in its owning repository's established architecture/domain/runbook locations. Link those sources instead of creating an initiative copy. Cross-repository initiatives have one coordination root and link implementation records in their owning repositories. Store binary evidence in the selected asset store; the evidence document contains its manifest and references.

## 3. Declare identity, status and authority

Use YAML frontmatter on managed typed files. This example is a locally owned draft; paths in metadata are repository-root-relative, or use full URLs for external owners.

```yaml
---
id: orchestration-example-spec
type: spec
status: draft
owner: planning
representation: canonical
canonical: docs/work/agent-orchestration/workstreams/example/example.spec.md
---
```

All six fields are required. `id` identifies the logical record and remains stable across moves. References and snapshots share that record ID and canonical locator; there must be exactly one declared canonical location for the record. Distinct evidence runs have distinct IDs. An owner label identifies responsibility, not authenticated identity or authorization.

`representation` is `canonical`, `reference` or `snapshot`. References contain navigation, not editable copies of requirements. Snapshots require `source_revision`, an immutable source version or captured-content digest, and `captured_at` in UTC. A mutable issue URL alone is insufficient for a frozen snapshot. Store the revision of this document externally when pinning it for dispatch, review or approval; do not try to embed its own Git commit or self-referential hash in its content.

`status` is `draft`, `accepted`, `superseded` or `archived`. Use `accepted` only with an `acceptance` pointer to the applicable trusted decision/review receipt identifying the accepted revision. This field alone neither grants execution authority nor proves readiness. An unreviewed observation can remain draft evidence. Superseded records require `superseded_by`; archived records record `archive_reason`. Historical approval applies to the historical revision, not automatically to later edits.

Add `work_item` and `depends_on` references when applicable. Plans and handoffs pin the governing spec revision for execution. Evidence identifies tested code/spec revisions, environment, procedure, actual outcomes and asset digests as applicable. Research identifies source versions and observation dates, and labels recommendations. Reading documentation cannot establish that a runtime test passed.

For container entry maps, declare `scope_kind: initiative` or `scope_kind: workstream` and the canonical `initiative` locator. Item records declare `work_item`, their actual tracker `parent` when present, and `work_kind: feature`, `regression`, `spike` or `task`. Other artifacts link their applicable `initiative` and/or `work_item`. These fields describe relationships, not new approval claims. Stable IDs and canonical locators let a future catalog find relationships without interpreting folder depth.

## 4. Update and review

Change the canonical requirement once, then flag affected plans, decisions and handoffs for review. Preserve prior evidence and decisions as history; do not rewrite them to imply a changed requirement was already tested or approved. Drafts and archived material may inform research but cannot satisfy a current governing-policy requirement by default.

Before handing off, verify suffix/type agreement, required metadata, one canonical location per logical ID, resolving links, pinned snapshot versions and revision-matching acceptance receipts. Review the content for contradictory requirements; filenames and metadata alone cannot establish semantic consistency. Report the actual checks and any unresolved references. This skill supplies a review procedure, not an installed CI validator or knowledge-repository enforcement service.

## 5. Migrate existing files with their owners

Inventory files by purpose, authority and owner before choosing destinations. Check inbound references in the repository, linked tracker records and session handoffs. Consolidate duplicate rules into their owning source while preserving unique decisions, evidence and history. Coordinate active writers before moving their files; continue independent work while that coordination is pending.

For each move, update references and the registry together, verify the new path and preserve provenance. If an external reference cannot be updated yet, keep a minimal old-path reference stub naming the replacement; never keep two editable specs. Record remaining migration work in the existing work record. A convention's adoption does not mean historical files have already been migrated.
