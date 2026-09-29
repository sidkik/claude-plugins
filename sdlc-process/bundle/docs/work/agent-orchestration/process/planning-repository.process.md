---
id: orchestration-planning-repository-process
type: process
status: draft
last_accepted_decision: https://github.com/sidkik/core/issues/517#issuecomment-5620917854
owner: planning
representation: snapshot
source_repository: sidkik/core
migration_status: transferred
canonical: https://github.com/sidkik/planning/blob/main/docs/work/agent-orchestration/process/planning-repository.process.md
initiative: https://github.com/sidkik/core/issues/507
work_item: https://github.com/sidkik/core/issues/517
source_revision: fd98a3d61b6cdc58330dc40d4ee284189f2b6a9b
captured_at: 2026-09-29T20:30:49Z
---

# Planning repository, branches and session continuity

[Accepted direction](https://github.com/sidkik/core/issues/517#issuecomment-5610064011): use one shared planning repository across Core, Web Platform and other repositories, with isolated checkouts and document-change branches. [The naming and handoff convention was accepted on 2026-09-10](https://github.com/sidkik/core/issues/517#issuecomment-5620917854). The user [subsequently authorized](https://github.com/sidkik/core/issues/517#issuecomment-5625609455) creating and using `sidkik/planning` now. The private repository exists at https://github.com/sidkik/planning. The first six primary-owned drafts transferred under the [completed cutover receipt](https://github.com/sidkik/core/issues/517#issuecomment-5625801674). Other owners’ migrations retain their existing scope. Automated enforcement and the remaining qualification scenarios have not run. The earlier accepted convention remains the decision source; these publication-status amendments are draft.

The [work-artifacts convention](../../../../.claude/skills/work-artifacts/SKILL.md) owns file types, metadata and stable identities. This process owns repository publication and continuation mechanics. The [collaboration research — source locator](https://github.com/sidkik/planning/blob/fd98a3d61b6cdc58330dc40d4ee284189f2b6a9b/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-3aedf0426aa6) supplies alternatives and limitations; its earlier hosting recommendation is historical where the accepted direction now settles it. [Policy checkpoints](../workstreams/context/governed-context.spec.md#policy-agent-checkpoints-across-the-process) govern advancement, including publication and handoff. A review of draft publication must not demand the architecture approval that the draft is being published to obtain.

## Storage and document names

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

## Branch and checkout names

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

## Publish a reviewable checkpoint

1. Read the owning issue, current candidate and accepted-source pointers. Confirm the accountable owner and whether this is a new change, helper contribution or continuation. Branch names and issue assignees alone do not establish an exclusive session claim.
2. For a new change, fetch current main and create the named branch in an isolated workspace. Record the starting commit and declared dependencies. For a continuation, use the receiving procedure below instead of starting from main.
3. Edit the owning records, keeping proposed changes visibly draft and preserving earlier decision evidence. Commit a coherent checkpoint locally and obtain the applicable policy assessment of that immutable candidate before remote publication. The reviewer may inspect the local committed content; if required evidence or review access is missing, hold publication. Push only the assessed revision after clearance, then verify the remote commit is retrievable before another session depends on it. A local commit, filesystem path or unpushed branch is not remote publication.
4. Open/update the document PR targeting main, link the work issue and state whether it publishes a draft, amends a document or records acceptance. Draft PR status is distinct from draft document status. A PR can become ready to merge while its document remains draft.
5. Complete relevant specialist reviews and policy coverage against the same exact source commit and dependencies. Reuse the publication assessment when it explicitly covers the proposed integration and its inputs remain applicable; verify outstanding conditions instead of commissioning a duplicate assessment. The owner consolidates findings, applies corrections and obtains affected reassessment. Appending visible commits preserves review context; do not rewrite a published review history as routine cleanup. Concurrent contributors use separate changes; the integrating owner reviews the combined meaning even for a clean text merge.
6. Publish to main only after applicable publication checks. Verify the landed content and update the issue's current-document/PR pointers. Preserve the last accepted content revision and decision pointer separately from the newest draft. Human architecture acceptance remains a specific trusted decision; merging alone does not provide it. A metadata-only acceptance update must still demonstrate that the accepted content is unchanged from the decision's subject.

Use meaningful checkpoints, not a PR per message. An unresolved candidate can remain in its open PR while review proceeds; publish coherent drafts early so long investigations do not require a permanent shared branch. Initial setup must give document PRs appropriate checks and validate actual merge/identity rules. Current Core CI and shared human credentials are not proof that this path is already configured.

## Handoff: pass the work and revision, not a directory

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

## Continue after merge, closure or implementation dispatch

If a handoff's branch has merged, use its PR to locate the landed main commit and compare the handed-over content and review scope. If there is more writing to do, create a new change branch from current main and record the predecessor. If the PR was closed unmerged, read its disposition; do not treat the candidate as accepted or recreate the old branch automatically. Delete a remote branch only after needed revisions are durably retained and active handoffs/contributions have a disposition. Preserve rejected alternatives when their reasoning is evidence. A branch name alone is never the only recovery pointer.

Before code dispatch, the delivery issue links to accepted planning documents at exact retained commits plus relevant decisions and readiness evidence. A Core implementer opens its normal implementation checkout/branch in Core; a Web Platform implementer does likewise in Web Platform. Both consume the shared accepted planning revision. They do not inherit the planning branch as a code integration branch. New planning revisions do not silently retarget in-flight attempts; material impacts follow the existing review/pause rules. Reordering the backlog continues to leave in-flight work unchanged.

## Qualification and rollout boundary

Verify the proposed names with Git's ref validator. Then qualify remote publication and independent-clone handoff, continuation without branch renaming, two isolated contributors, a semantic conflict despite clean merge, stale dependency review, merged/deleted branch recovery and stale-writer refusal. Shared-account agent reports must not impersonate human approval. Distinguish manual procedure evidence from enforced controls.

Provisioning and migration retain the owning [document-organization work item](https://github.com/sidkik/core/issues/517) and [migration record — source locator](https://github.com/sidkik/planning/blob/fd98a3d61b6cdc58330dc40d4ee284189f2b6a9b/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-aa054a02d872). Inventory owner files and access/relative links; preserve history and trusted decisions, update canonical locators and issue/registry pointers at cutover, and leave only reference stubs in the old location. Publish the required startup skills/process pointers in the planning repository before expecting a fresh session to use it. Provisioning must settle access, appropriate checks, retention and actual author/reviewer identity integration. Acceptance of this convention does not establish that those operations or qualification runs have happened.
