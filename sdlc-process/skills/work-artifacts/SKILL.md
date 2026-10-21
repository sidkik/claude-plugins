---
name: work-artifacts
description: Organize Sidkik work documents into initiative, workstream and work-item folders with typed Markdown filenames, canonical ownership, lifecycle metadata and coordinated migration. Use before creating, materially editing, reviewing, moving or consolidating specs, plans, spikes, research, evidence, maps, handoffs or session records under docs/work, including agent-orchestration POCs. Reuse existing records and link governing sources to prevent contradictory copies.
---

<!-- source: https://github.com/sidkik/planning @ 00a15fb8682612b6d8fbe9e603b561d42f8688b7 .claude/skills/work-artifacts/SKILL.md sha256:22bdb0fa74845016dcd495b096f45ccd5532e0bb91de6f7b6404855d53019cfe -->

> Source precedence: apply the [source adapter contract](#apply-packaged-sources-in-the-working-repository) at the end of this skill for working-repository ownership and source precedence.

# Work artifacts

Apply this convention to new managed work documents under `docs/work`. For existing documents, follow the migration procedure below when renaming or splitting them; ordinary progress updates do not require a bulk migration. Tool-required `SKILL.md`, `AGENTS.md`, `CLAUDE.md`, domain `CONTEXT.md`, existing ADR conventions and short navigation `README.md` files retain their names. This skill governs organization; the applicable process and task skills still govern the work itself.

## 1. Establish ownership before writing

Read the effort's index, canonical tracker/work record and active session registry. Locate existing records for the same subject and purpose. Update the owning record if one exists; create another only for a distinct purpose or observation. Do not create a summary that independently restates governing requirements.

Identify the canonical repository, location and owner of each logical record before choosing a folder. Starting in a delivery repository is valid; cwd and existing delivery `docs/work` files do not choose authority for a new artifact. Before writing planning documents, read the [planning convention's storage and publication rules](../../bundle/docs/work/agent-orchestration/process/planning-repository.process.md). Planning intent, proposed architecture, specifications, delivery plans, planning research and their planning review/handoff records belong in `sidkik/planning`, including standalone, single-repository and Core-only work. Delivery code, tests, maintained technical documentation, implementation evidence and implementation-session continuity remain delivery-owned, including useful records under delivery `docs/work`.

Discover or acquire an appropriate isolated planning checkout within existing authorization, applying the linked convention's ownership, branch and continuation rules. Keep the delivery checkout used for code context independent. If the planning checkout or required access is unavailable, hold document publication and report that scoped gap; do not silently write the planning spec in the delivery repository. This placement check adds no approval gate and authorizes no relocation of another owner's active records.

A sufficient small repair brief or Wayfinder map can remain issue-owned. Local files then point to it or preserve a frozen snapshot. A locally owned draft can transfer authority to the tracker explicitly on publication; convert its old location to a reference or snapshot. Neither location silently becomes a second editable authority.

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

Folder hierarchy expresses ownership and scope within the repository established above; the filename suffix expresses the document's purpose. The layouts below do not select a repository. Choose the smallest container that fits:

| Container | When to use it | Location for new work |
| --- | --- | --- |
| Initiative | A durable outcome spanning related decisions or independently delivered blocks, potentially across repositories. Its map links the owning tracker and participating repositories. | `docs/work/initiatives/<initiative>/` in the established owning repository. |
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

## Source adapter contract

<!-- source: maintained in this repository, sdlc-process/SOURCE-ADAPTER.md -->

### Apply packaged sources in the working repository

The bundle is a generated, revision-pinned distribution of shared instructions.
Its source manifest records each upstream repository, commit and byte digest.
Update the canonical source, then regenerate the package; native skills and
agents are generated outputs and are never edited directly. Managed planning
documents retain their canonical owner and become provenance-bearing snapshots
in this distribution.

Native skills and agents contain their instructions; they are not pointers. Each
has the pinned source's frontmatter, its full pinned body, the supporting
instruction and template files that body requires, and this contract.
Invoking one loads all of that: the `Skill` result is the packaged source, so a
separate read of the same file adds nothing and never substitutes for the
invocation. Links that remain are not bundled: other skills (invoke them), and
canonical process, specification and record documents under `bundle/`
(read the sections the current action relies on). `native-composition.json`
lists every asset's bundled files and retained links with sizes. Report a
retained rule you needed but could not read as a scoped load gap; do not
claim complete coverage of a rule you did not read.

1. Establish the actual working repository and its Git remotes. Read its
   `AGENTS.md`/`CLAUDE.md`, configured `docs/agents/issue-tracker.md` when present,
   and applicable engineering instructions. The plugin installation directory
   is a source location, never the work's repository or checkout.
2. Read the packaged SDLC entry and its required orchestrator dependency before
   route selection. Apply current user authorization and source precedence from
   the host. If a repository distributes a different shared-process revision,
   identify that conflict and its effect before the dependent action; installing
   a plugin does not silently revoke the repository's instructions.
3. The bundled tracker supplies Sidkik's GitHub mechanics. Resolve the owning
   delivery issue from its full URL and actual work scope. Planning documents
   belong to `sidkik/planning`, including single-repository work launched in a
   delivery checkout. Before writing them, natively invoke
   [work-artifacts](SKILL.md) and read its linked planning
   storage/publication convention. Delivery implementation, maintained technical
   documentation, implementation evidence and implementation-session continuity
   retain their delivery owner; a sufficient small repair brief can remain
   issue-owned. This does not reassign implementation issues to planning.
   Discover the actual configured owner before creating work.
4. Resolve engineering instructions through their configured canonical owner.
   Follow the working repository's explicit ownership/migration configuration
   and applicable user decisions for architecture, testing and local-development
   rules, specialist briefs and maintained governing references. When that owner
   is an engineering plugin, use its canonical sources or exact installed bundle
   for those instructions. From any starting repository, route contributions to
   the plugin-owned sources to the owner's authorized checkout; generated bundles,
   native skills and agents remain distribution outputs.
   For Core's explicitly adopted migration, `sidkik/core-plugins` owns these
   engineering instructions under `core-engineering/source`. Legacy Core copies
   of migrated instructions cannot silently override that authority; report
   conflicts before dependent work. This scoped migration preserves unrelated
   repository instructions and does not require other repositories to depend on
   the private plugin.
   The working delivery repository retains implementation code and tests,
   runtime/configuration and live environment, tool and operational facts.
   Observe its write boundaries and the source owner's separate write boundaries;
   a starting directory does not authorize writes to another checkout. Runtime
   commands come from the installed crew runtime documentation and skills.
   Report missing source access or capabilities for the affected action; a plugin
   does not grant permissions or authenticate a CLI.
5. Preserve Pocock's pinned sources and Sidkik's deliberate invocation-only
   adaptation: the Pocock workflows are model-invocable, so invoke the selected
   flow natively from the user's ordinary request; loading grants no authority
   and decides nothing for the human. For a skill still restricted to the user,
   follow the SDLC entry's handoff: provide the actual installed slash command
   with the current work reference and wait for the user's invocation. Source
   inspection may identify that command; it cannot replace invoking or
   authorize executing the flow. If no valid invocation is exposed, report the
   capability gap and hold only dependent work. Sidkik's process
   and tracker adaptations govern local-tracker defaults. Optional flows named
   by the broader Pocock router but absent here remain unavailable until their
   actual source is installed; never claim to have applied a missing skill.

Historical research and decision pointers are immutable upstream links. They
supply provenance when relevant; installed local sources supply required process
steps. A private GitHub link still requires access. This package provides agent
instructions, not authenticated enforcement or a workflow engine.
