---
name: work-artifacts
description: Organize Sidkik work documents into initiative, workstream and work-item folders with typed Markdown filenames, canonical ownership, lifecycle metadata and coordinated migration. Use before creating, materially editing, reviewing, moving or consolidating specs, plans, spikes, research, evidence, maps, handoffs or session records under docs/work, including agent-orchestration POCs. Reuse existing records and link governing sources to prevent contradictory copies.
---

<!-- source: https://github.com/sidkik/planning @ dc76ca4c3e5b163d88b92524ccfa18d7e4d101d2 .claude/skills/work-artifacts/SKILL.md sha256:22bdb0fa74845016dcd495b096f45ccd5532e0bb91de6f7b6404855d53019cfe -->

> Source precedence: apply the [source adapter contract](#apply-packaged-sources-in-the-working-repository) at the end of this skill for working-repository ownership and source precedence.

# Work artifacts

Apply this convention to new managed work documents under `docs/work`. For existing documents, follow the migration procedure below when renaming or splitting them; ordinary progress updates do not require a bulk migration. Tool-required `SKILL.md`, `AGENTS.md`, `CLAUDE.md`, domain `CONTEXT.md`, existing ADR conventions and short navigation `README.md` files retain their names. This skill governs organization; the applicable process and task skills still govern the work itself.

## 1. Establish ownership before writing

Read the effort's index, canonical tracker/work record and active session registry. Locate existing records for the same subject and purpose. Update the owning record if one exists; create another only for a distinct purpose or observation. Do not create a summary that independently restates governing requirements.

Identify the canonical repository, location and owner of each logical record before choosing a folder. Starting in a delivery repository is valid; cwd and existing delivery `docs/work` files do not choose authority for a new artifact. Before writing planning documents, read the [planning convention's storage and publication rules](#bundled-docs-work-agent-orchestration-process-planning-repository-process-md). Planning intent, proposed architecture, specifications, delivery plans, planning research and their planning review/handoff records belong in `sidkik/planning`, including standalone, single-repository and Core-only work. Delivery code, tests, maintained technical documentation, implementation evidence and implementation-session continuity remain delivery-owned, including useful records under delivery `docs/work`.

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

## Bundled required dependencies

The instructions above require the following pinned files. They are included here so this invocation loads them; separately invoked skills are not.

<a id="bundled-docs-work-agent-orchestration-process-planning-repository-process-md"></a>
<!-- source: https://github.com/sidkik/planning @ dc76ca4c3e5b163d88b92524ccfa18d7e4d101d2 docs/work/agent-orchestration/process/planning-repository.process.md sha256:b7e354fac2120e8e7b2e81e4144baf7d33402ecd6653b815cae3b1e0027d7442 -->

### Planning repository, branches and session continuity

[Accepted direction](https://github.com/sidkik/core/issues/517#issuecomment-5610064011): use one shared planning repository across Core, Web Platform and other repositories, with isolated checkouts and document-change branches. [The naming and handoff convention was accepted on 2026-09-10](https://github.com/sidkik/core/issues/517#issuecomment-5620917854). The user [subsequently authorized](https://github.com/sidkik/core/issues/517#issuecomment-5625609455) creating and using `sidkik/planning` now. The private repository exists at https://github.com/sidkik/planning. The first six primary-owned drafts transferred under the [completed cutover receipt](https://github.com/sidkik/core/issues/517#issuecomment-5625801674). Other owners’ migrations retain their existing scope. Automated enforcement and the remaining qualification scenarios have not run. The earlier accepted convention remains the decision source; these publication-status amendments are draft.

The [work-artifacts convention](SKILL.md) owns file types, metadata and stable identities. This process owns repository publication and continuation mechanics. The [collaboration research — source locator](https://github.com/sidkik/planning/blob/dc76ca4c3e5b163d88b92524ccfa18d7e4d101d2/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-3aedf0426aa6) supplies alternatives and limitations; its earlier hosting recommendation is historical where the accepted direction now settles it. [Policy checkpoints](#policy-agent-checkpoints-across-the-process) govern advancement, including publication and handoff. A review of draft publication must not demand the architecture approval that the draft is being published to obtain.

#### Storage and document names

The planning repository stores planning intent, proposed architecture, specifications, delivery plans, research and their review/handoff records. GitHub issues retain work ownership, questions and decisions; implementation issues remain in Core, Web Platform or the other delivery repository. Application code, API contracts and maintained technical documentation stay in those repositories. OpenViking ingests source revisions for context retrieval; an indexed copy is not another editable authority.

Keep the existing `docs/work/` convention. Examples for a new initiative in the planning repository:

```text
docs/work/initiatives/saved-clips/
  saved-clips.spec.md
  saved-clips.plan.md
  decisions/storage.decision.md
  items/core-gh-123-api-contract/
    api-contract.handoff.md
  items/web-platform-gh-456-clip-library/
    clip-library.handoff.md
```

Numbers and names here are illustrative. Create only useful records; intent can be a section of the specification, and a sufficient small repair brief can remain on its issue. Preserve this initiative's registered `docs/work/agent-orchestration/` root during migration. Do not require another folder reorganization merely because its owning repository changes. Names describe stable subject/purpose, never current lane, author, approval status or version. Revisions live in Git and acceptance receipts. The full owning issue URL accompanies the convenient `<repo>-gh-<number>` tracker key; preserve document IDs and explicitly update locators if repositories/issues move.

#### Branch and checkout names

Use `main` as the shared published baseline, including explicitly draft documents. Each coherent proposed change has one temporary remote branch and one integrating writer at a time:

```text
plan/<tracker-key>/<change-slug>-<change-id>
plan/core-gh-517/planning-repository-a3f29c7e
plan/web-platform-gh-456/clip-library-spec-6b91d204
plan/planning-gh-123/shared-storage-decision-9c21b7d0
```

All examples are prospective. `tracker-key` identifies the issue owning this document change, not necessarily the repository storing the file. `change-slug` is a short lowercase kebab-case description. `change-id` is eight randomly generated lowercase hexadecimal characters, allocated once for this change; check remote-name availability and refuse to attach to an existing branch on collision. Regenerate on collision rather than overwrite it. This avoids a shared sequence allocator. These identifiers are locators, not authentication or locks.

All document changes use `plan/`, including research and amendments. A branch belongs to a change, not a session or a process stage. Keep it when the author resumes or transfers unfinished work. After merge/closure, give subsequent work a new change ID and branch from current main. Link the preceding PR when relevant. Do not create a branch per intent/spec/review phase or accumulate the entire feature on an integration branch.

Each writable session has its own clone or worktree. A suggested local leaf name is `planning-<tracker-key>-<change-id>-<session-key>` under the environment's allocated workspace root. The session key distinguishes local directories, not authority. The local absolute path is diagnostic only and is never the portable handoff address. Read-only reviewers can fetch the recorded commit without a writable branch. Helpers returning research or review findings do not need a branch; a helper independently proposing edits gets its own change branch/patch and bounded file scope.

#### Publish a reviewable checkpoint

1. Read the owning issue, current candidate and accepted-source pointers. Confirm the accountable owner and whether this is a new change, helper contribution or continuation. Branch names and issue assignees alone do not establish an exclusive session claim.
2. For a new change, fetch current main and create the named branch in an isolated workspace. Record the starting commit and declared dependencies. For a continuation, use the receiving procedure below instead of starting from main.
3. Edit the owning records, keeping proposed changes visibly draft and preserving earlier decision evidence. Commit a coherent checkpoint locally and obtain the applicable policy assessment of that immutable candidate before remote publication. The reviewer may inspect the local committed content; if required evidence or review access is missing, hold publication. Push only the assessed revision after clearance, then verify the remote commit is retrievable before another session depends on it. A local commit, filesystem path or unpushed branch is not remote publication.
4. Open/update the document PR targeting main, link the work issue and state whether it publishes a draft, amends a document or records acceptance. Draft PR status is distinct from draft document status. A PR can become ready to merge while its document remains draft.
5. Complete relevant specialist reviews and policy coverage against the same exact source commit and dependencies. Reuse the publication assessment when it explicitly covers the proposed integration and its inputs remain applicable; verify outstanding conditions instead of commissioning a duplicate assessment. The owner consolidates findings, applies corrections and obtains affected reassessment. Appending visible commits preserves review context; do not rewrite a published review history as routine cleanup. Concurrent contributors use separate changes; the integrating owner reviews the combined meaning even for a clean text merge.
6. Publish to main only after applicable publication checks. Verify the landed content and update the issue's current-document/PR pointers. Preserve the last accepted content revision and decision pointer separately from the newest draft. Human architecture acceptance remains a specific trusted decision; merging alone does not provide it. A metadata-only acceptance update must still demonstrate that the accepted content is unchanged from the decision's subject.

Use meaningful checkpoints, not a PR per message. Batch coherent brief or spec changes into one candidate; decisions, bookkeeping and investigation updates ride with it and are not independent checkpoints merely because they are committed or posted. This governs step 3: assess the batched candidate once. When that assessment is a conditional pass on an exact mechanical edit, applying the edit and recording the verification predicate on the final revision satisfies the condition, so push that revision without a second assessment; any other change to the candidate needs reassessment under the [convergence rules](#converge-reviews-decisions-and-publication). An unresolved candidate can remain in its open PR while review proceeds; publish coherent drafts early so long investigations do not require a permanent shared branch. Initial setup must give document PRs appropriate checks and validate actual merge/identity rules. Current Core CI and shared human credentials are not proof that this path is already configured.

#### Handoff: pass the work and revision, not a directory

The portable entry point is the owning GitHub issue and a specific handoff receipt. The receipt provides:

| Field | Meaning |
| --- | --- |
| Work and handoff identity | Full owning issue URL, distinct handoff ID, sender and intended receiving role/session |
| Repository | Verified GitHub repository/remote URL |
| Candidate | Branch, full commit ID, PR URL/state and its base revision |
| Documents | Repository-relative paths and logical IDs; pointers to the actual spec, plan, decisions and existing `.handoff.md` |
| Authority and review | Current phase and requested next action; last accepted revisions and trusted decisions; assessed revisions, findings and required unresolved checks |
| Dependencies | Relevant policy/contract/source revisions and known changes affecting them |
| Writer transfer | Current owner, whether the sender released writing, intended recipient and required acknowledgment |
| Next action | Smallest concrete continuation, open questions, blockers and observable resume condition |

Use full commit IDs in actual receipts; abbreviated hashes in conversation are display aids only. The handoff file does not contain its own Git commit ID. Commit it with the useful document checkpoint, then publish an external issue receipt naming that commit. If the file pins a previous source revision, label it as the source being handed over. This avoids a self-referential hash or a second mutable copy of the full specification.

**Sender:** prepare the checkpoint and handoff, obtain the applicable policy clearance before publishing them as above, verify the remote revision, record relevant review dispositions, and publish the receipt on the owning issue. Obtain the applicable handoff assessment before releasing/transferring writing; a later review cannot retroactively clear an earlier transition. Notify the receiver through the currently available channel; publishing a file is not an acknowledgment or session wakeup. Until a bridge exists, explicitly direct the receiving session to the issue/receipt.

**Receiver:** fetch the named repository/revision, read its handoff and relevant governing sources, check live issue/PR disposition, and compare the current remote branch with the offered commit. Obtain the applicable receiving/handoff policy clearance, acknowledge that exact receipt and acquire the writing assignment before editing. Reuse a current applicable handoff assessment rather than requiring duplicate reviews of unchanged inputs. Review-only consumers need no ownership transfer. The sender remains released after transfer; resuming an old conversation cannot silently reclaim the branch.

If the head moved, someone else claimed the change, or an input materially changed, reconcile the delta/ownership and obtain a corrected handoff or explicit reassessment. Do not silently substitute latest main for the offered draft. If the old writer disappeared, a designated coordinator records an explicit takeover and prevents the previous writer from continuing before granting exclusive writing. Without a way to establish that exclusion, a successor can read/review or prepare an isolated proposal but cannot treat the shared candidate as exclusively claimed. The supporting-state design must enforce owner generations and reject stale writers; the present manual registry does not guarantee this.

#### Continue after merge, closure or implementation dispatch

If a handoff's branch has merged, use its PR to locate the landed main commit and compare the handed-over content and review scope. If there is more writing to do, create a new change branch from current main and record the predecessor. If the PR was closed unmerged, read its disposition; do not treat the candidate as accepted or recreate the old branch automatically. Delete a remote branch only after needed revisions are durably retained and active handoffs/contributions have a disposition. Preserve rejected alternatives when their reasoning is evidence. A branch name alone is never the only recovery pointer.

Before code dispatch, the delivery issue links to accepted planning documents at exact retained commits plus relevant decisions and readiness evidence. A Core implementer opens its normal implementation checkout/branch in Core; a Web Platform implementer does likewise in Web Platform. Both consume the shared accepted planning revision. They do not inherit the planning branch as a code integration branch. New planning revisions do not silently retarget in-flight attempts; material impacts follow the existing review/pause rules. Reordering the backlog continues to leave in-flight work unchanged.

#### Qualification and rollout boundary

Verify the proposed names with Git's ref validator. Then qualify remote publication and independent-clone handoff, continuation without branch renaming, two isolated contributors, a semantic conflict despite clean merge, stale dependency review, merged/deleted branch recovery and stale-writer refusal. Shared-account agent reports must not impersonate human approval. Distinguish manual procedure evidence from enforced controls.

Provisioning and migration retain the owning [document-organization work item](https://github.com/sidkik/core/issues/517) and [migration record — source locator](https://github.com/sidkik/planning/blob/dc76ca4c3e5b163d88b92524ccfa18d7e4d101d2/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-aa054a02d872). Inventory owner files and access/relative links; preserve history and trusted decisions, update canonical locators and issue/registry pointers at cutover, and leave only reference stubs in the old location. Publish the required startup skills/process pointers in the planning repository before expecting a fresh session to use it. Provisioning must settle access, appropriate checks, retention and actual author/reviewer identity integration. Acceptance of this convention does not establish that those operations or qualification runs have happened.

<!-- source: https://github.com/sidkik/planning @ dc76ca4c3e5b163d88b92524ccfa18d7e4d101d2 docs/work/agent-orchestration/process/orchestration.process.md#converge-reviews-decisions-and-publication sha256:e5a0cdbffd1b9eef8d80f07da4104b9adffe3ceebb1f0f4e1c8565ec57afbff6 -->

### Converge reviews, decisions and publication

Convergence ends repeated work when its stated condition is met. It sets no numeric limit on reviews, tests or questions, and it never waives a required check.

- **Batch coherent changes.** Group related brief or spec changes into one candidate, then assess and publish it once. An ordinary decision, bookkeeping or investigation update joins the candidate it belongs to; committing or posting it does not make it an independent checkpoint. A checkpoint under the [planning convention](#publish-a-reviewable-checkpoint) is a coherent candidate for an actual advancement, never each edit or message.
- **Classify each finding.** Record a class, the violated acceptance criterion or authority, the smallest fix and the verification that shows it. A *material blocker* violates an accepted criterion, authority or required evidence and holds its dependent action. An *advisory* finding has no such violation; record its disposition and continue. A finding that names no violated criterion or authority is advisory.
- **Conditional pass.** An independent reviewer may pass on an exact, deterministic mechanical edit (file, location, old and new text) paired with a verification predicate (command or check and expected result). The predicate names the assessed revision and exits non-zero unless the diff from that revision to the final pushed revision is exactly the specified edit (or the named generator's output), with no other file, hunk or uncommitted change; the recorded hash is the pushed revision, so any later commit voids the result and anyone can rerun it. The accountable worker applies exactly that edit, runs the predicate on the final revision and records the revision, command and result. That evidence satisfies the condition without another model assessment. Return to independent reassessment: a semantic change, new behavior, authority or evidence, any edit that differs from the specified one, a failed predicate, and a FAIL that carries no conditional pass. Diff size decides nothing: a one-character edit that changes meaning is semantic, and a large generated edit with a deterministic predicate can be mechanical.
- **Consolidate and stop.** Another instance of a defect class already targeted follows the orchestrator's [recurrence rule](../orchestrator/SKILL.md#reviews--mandatory-skill-grounded-code-reading). The review concludes when every blocker's verification has passed and every advisory has a disposition. A fresh full review is not required.
- **Reuse accepted decisions.** An accepted human decision answers its question for in-scope work. Ask again only when new concrete evidence materially contradicts it or shows it insufficient for in-scope user-visible behavior; state the evidence delta and hold only the dependent work. Facts, engineering choices and test-seam execution are agent work, not questions. When the user says to stop asking, stop; do not infer a new product decision from frustration, and report a genuine blocker once, holding only its dependent work. Existing authorization persists.
- **Bound grilling here.** Grilling and grill-with-docs end when every prerequisite-ready human choice has an answer or a reported blocker. Check the decision record for a settled answer before each question. The imported skills stay unchanged; this adaptation sits above them.
- **Observer.** The [advisory observer](#policy-agent-checkpoints-across-the-process) flags re-asked settled questions, semantic-free review restarts and publication churn. It accepts executed reviewer-specified mechanical verification and flags a semantic change presented as mechanical, a missing predicate result or an unsafe self-clear. Human direction governs within its scope.

<!-- source: https://github.com/sidkik/planning @ dc76ca4c3e5b163d88b92524ccfa18d7e4d101d2 docs/work/agent-orchestration/workstreams/context/governed-context.spec.md#policy-agent-checkpoints-across-the-process sha256:91d0b32ce1bde1334362b264fc59a56c02d8c03e02e5f77a89698d5a7b4da7b9 -->

### Policy-agent checkpoints across the process

[User direction, 2026-09-09](https://github.com/sidkik/core/issues/512#issuecomment-5608432096): policy agents review the steps taken and the recorded history as work traverses the process. Policy noncompliance must be flagged and the affected work paused before the next step. This supersedes the narrower open question about adding a review only before Ready. It applies to feature and bug paths, planning/refinement sessions, handoffs and delivery transitions. The required behavior is established direction; the report and enforcement details below are a proposed realization, not an installed automated gate.

**Checkpoint boundaries.** Assess an actual advancement: declaring readiness,
starting/dispatching implementation or a separately scoped assignment, transferring writing ownership, advancing completed QA
to independent review, publishing a coherent review candidate, integrating or
completing delivery, or resuming an action held by a policy finding. For a bounded
regression, one assessment can cover readiness and the immediately proposed start,
with separate conclusions for contract readiness and current eligibility. It must
name both actions and their inputs; an unavailable resource still prevents start. Reuse applicable existing user authority; the combined assessment does not require a new human permission receipt for the same authorized repair.

Ordinary questions, recording an unambiguous human agreement, progress updates,
reporting a blocker, and authorized investigation/corrections within a step are not
new checkpoints. Record the actual decision and continue within existing authority.
If the answer resolves a policy hold, changes the accepted scope/architecture or
alters a required control, reassess that affected control before dependent work.
A duplicate or unrelated answer does not clear a hold. Do not create a separate
assessment merely to acknowledge the answer before assessing the dependent action.

One independent assessment may explicitly cover a coherent publication/integration
sequence at the same candidate and inputs, with remaining conditions stated. Check
those conditions at execution; a conditional pass is not proof they occurred.
Reconcile changed inputs and reassess affected controls. Related changes form one candidate and one assessment; a decision, receipt or investigation update does not become its own checkpoint by being committed or posted. A reviewer may pass conditionally on an exact mechanical edit with a verification predicate. The accountable worker's recorded predicate result on the final revision satisfies that condition, and it cannot clear a semantic change or a FAIL lacking such a pass ([convergence rules](#converge-reviews-decisions-and-publication)). Routine posting of
investigation findings, corrected hypotheses, receipts or previously assessed results within the authorized step does not require a publication assessment.
Posting to GitHub alone creates no checkpoint. Assess the substantive action when
findings are used to advance work, change an applicable control or clear a policy hold.
Use one compact result in the existing issue/PR; apply the work-artifacts retention
rule rather than committing the review's working history.

**Review inputs.** Identify the current step and proposed next step, work/attempt where one exists, accountable actor, applicable policy and skill revisions, accepted human decisions, source/artifact revisions, prior checkpoint results, intervening actions and evidence, and unresolved findings. Separate accepted human intent and scope decisions from author claims about the implementation, evidence or correction. The decisions govern the review; an accepted brief or implementation freedom is not proof that the implementation or proposed approach is correct. Treat an assertion that a finding is fixed as a claim to falsify. The reviewer reads the underlying relevant history and outputs; the author's latest summary or checklist is insufficient. Missing history coverage stays explicit. Apply policy appropriate to the actual step: proposing architecture requires a reviewable proposal, while advancing work dependent on that architecture requires the user's decision. A paused feature can still perform the authorized investigation needed to resolve its finding.

**Review responsibility.** A policy agent checks whether required steps actually occurred in the applicable order, whether their outputs support the proposed advance, and whether authority and prior decisions were preserved. For bug work, apply the process's current-behavior and already-fixed routes: challenge a proposed repair unsupported by a current defect, and require a stated material gap for additional environment or replay requirements. Assess whether the next action follows from the evidence, not merely whether each reported fact is accurate. Mechanical checks should verify what they can; semantic review must assess meaning and evidence adequacy. Implementation QA and independent Standards/Spec code review retain their own responsibilities under the [orchestrator review rules](../orchestrator/SKILL.md#reviews--mandatory-skill-grounded-code-reading). Policy review verifies those obligations were met; it does not supply missing tests, select product intent, accept architecture for the human, invent additional policy or waive a requirement. Recommended separation is a reviewing agent distinct from the worker whose step is assessed; exact runtime identity and allocation belong to the supporting-state design.

**Advisory observers.** A native observer can report a suspected departure during the accountable session's work. Treat the report as a prompt to inspect its governing source and underlying evidence, then correct a supported finding within current authority. It is not human consent, a new approval requirement, or a substitute for the independent revision-bound checkpoint assessment. It may flag a re-asked settled question, a review restart without a semantic change or publication churn, and a mechanical-labeled change that is semantic, lacks its predicate result or was self-cleared without a conditional pass. It does not object to executed reviewer-specified mechanical verification. An observer cannot grant permission to change configuration or policy. A report lacking a digest or visible history identifies a coverage gap; it does not establish that an earlier required action never occurred. Retrieve the relevant history before making that claim, and retain a required unknown only where unavailable proof is required for the proposed action. A correction that resolves an actual policy hold still follows reassessment below. A delivered observer message demonstrates notification, not acceptance or course correction; those require the receiving session's observed actions.

**Result and enforcement.** Record a revision-bound `pass`, `fail` or `unknown` for each applicable requirement, identifying source policy, evidence inspected, assessor and rationale. `Fail`, required `unknown`, an incomplete assessment or an absent checkpoint must prevent the affected next step. A policy-agent comment alone does not enforce that rule: the transition owner must require the applicable result before permitting advancement, and the architecture must cover both agent and UI command paths. Actions outside an explicitly assessed sequence or changes to relevant inputs require affected reassessment; a pass is not standing permission for unrelated later steps. Policy checks do not authorize retroactive approval of an action already taken.

**Flag and pause.** A finding identifies the unmet policy, expected versus observed steps/evidence, affected action/work, resolver and smallest corrective action. Retain the current stage, history and evidence, show the policy wait in GitHub's durable work record and the supporting operational view, and prevent dependent advancement. Independent authorized work can continue under the existing scoped-wait rule. The exact safe handling of an already-running external action is an execution contract to specify; recording a pause is not proof that action stopped. Policy pauses are separate from backlog reordering, which leaves in-flight work unchanged.

**Resolve and resume.** The owner supplies the missing work or evidence; the appropriate human decides an architectural/product question or permitted exception. A disputed finding is adjudicated against the governing source and authority. The policy agent reassesses the finding and dependent assumptions, records its disposition, then the coordinator rechecks applicable authority/dependencies/resources before resuming. Neither a repeated request, elapsed time nor a claimed correction clears the pause by itself. Reuse prior evidence where its applicability is demonstrated; do not require the entire history to be regenerated after each correction.

Initial acceptance examples for the policy integration:

- A feature has a complete-looking spec but its proposed architecture has no human decision: flag the missing decision and hold dependent advancement.
- A bug brief reports a failing operation but provides no accepted-behavior basis or usable defect evidence: hold repair readiness and route diagnosis without demanding a new feature specification.
- An implementer requests review with passing unit tests but missing required live QA: retain implementation and route the missing QA to its owner.
- A paused step receives an unrelated or outdated approval: preserve the pause; a current applicable resolution triggers reassessment.
- A session skips a required refinement/handoff step or treats an old draft as governing despite a newer user decision: flag the skipped obligation or source conflict before the next step.

These are specification examples, not executed runtime proof. A manually dispatched policy reviewer can check a bounded session step now; durable gating, authenticated results, replay handling and bypass prevention still require the supporting-state implementation and qualification.

Use these cases when refining the eventual integration acceptance criteria:

- **Reproduced invitation refusal:** return the accepted-expectation source, actual red evidence and remaining governing/QA-seam/isolation-viability findings. Do not require a new human approval solely because the brief was AI-authored; do not convert a passing reproduction into implementation readiness.
- **Saved clips with unresolved lifecycle:** return the source/child-deletion and range-behavior questions as relevant contract gaps. A provider capability page cannot choose those product promises. Independent permitted refinement remains visible.
- **A changed governing source:** identify the changed source/revision and affected controls; retain prior assessments as history. Unrelated textual changes permit justified reuse, while a changed intended outcome requires semantic reassessment by the proper authority.
- **A complete contract with no current workspace slot:** distinguish known viable provisioning from current unavailability. Context may support contract readiness while execution remains unscheduled; it must not invent an allocation.
- **A high-ranking conflicting draft:** surface the conflict and canonical approved source with provenance. Ranking, recency and summary fluency do not supersede a governing decision; missing trusted authority remains unknown.

These are proposed response semantics for specification preparation, not claims that OpenViking or a Sidkik evaluator has passed them. Keep measured product behavior and quantitative qualification with their existing owners.

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
instruction and template files that body requires, the shared process,
specification, record, planning and tracker content that its flows make mandatory
(the whole process where the source directs reading it), and this contract.
Invoking one delivers all of that: the `Skill` result (or the agent's own
definition) is the content, so loading needs no separate read of any source file
and a read never substitutes for the invocation. Links that remain point to
separate assets or facts: other skills (invoke each by its name when the work
reaches it), live project facts such as tracker configuration, issue state,
ownership and repository documents (discover them from their owners when the
action needs them), and pinned historical evidence or the governed-context
proposal's identity (its governing sections are carried here). `native-composition.json`
lists every asset's bundled files with sizes and these cited sources. If a rule the
work needs is not in the delivered content, report a scoped load gap; do not
claim coverage of a rule you did not receive, and do not fill the gap from a
source read as if it were a load.

1. Establish the actual working repository and its Git remotes. Read its
   `AGENTS.md`/`CLAUDE.md`, configured `docs/agents/issue-tracker.md` when present,
   and applicable engineering instructions. The plugin installation directory
   is a source location, never the work's repository or checkout.
2. Natively load the SDLC entry and its required orchestrator dependency before
   route selection. Apply current user authorization and source precedence from
   the host. If a repository distributes a different shared-process revision,
   identify that conflict and its effect before the dependent action; installing
   a plugin does not silently revoke the repository's instructions.
3. The bundled tracker supplies Sidkik's GitHub mechanics. Resolve the owning
   delivery issue from its full URL and actual work scope. Planning documents
   belong to `sidkik/planning`, including single-repository work launched in a
   delivery checkout. Before writing them, natively invoke
   [work-artifacts](SKILL.md), whose result delivers the
   planning storage/publication convention. Delivery implementation, maintained technical
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
