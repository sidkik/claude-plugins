# Preserve decisions and continuity

Use these record procedures when reporting, waiting, receiving a return or transferring a session. The [process reporting contract](../../work/agent-orchestration/process/orchestration.process.md#human-decision-requests-and-accountable-reports), [policy checkpoint contract](../../work/agent-orchestration/workstreams/context/governed-context.spec.md#policy-agent-checkpoints-across-the-process) and [planning handoff convention](../../work/agent-orchestration/process/planning-repository.process.md#handoff-pass-the-work-and-revision-not-a-directory) own their requirements. Use sections of an existing issue/session/evidence record; these logical records are not a mandatory set of new files.

## Keep one current account

Record the full owning issue, accountable session and attempt when one exists, current phase/action, applicable source identities/revisions, existing authority, open questions/findings and smallest next action. Update the current summary and applicable map pointers at meaningful changes. Preserve decision rationale and source links in the owning record; do not append a turn-by-turn execution history. Link the canonical decision detail rather than restating it in every surface. Each session owns its helpers and consolidates their findings before reporting upward.

A context manifest lists each applicable canonical source, exact revision/digest, accepted/draft/historical standing and decision provenance, selected skill and actual execution mode, relevant criteria and missing coverage. It need only contain the subset governing the proposed work. Inspect the actual artifact at the referenced revision. Check that the recipient can access the needed bytes within its audience permissions; inaccessible links, changed digests and summaries remain evidence gaps. Preserve protected material in its authorized store and share only an appropriate extract.

## Ask and record the actual answer

Assign a stable question identity within the owning record. Present the question, recommendation, meaningful alternatives, evidence, exact proposal revision and affected work waiting. The human may answer naturally in the active session or connected Zulip conversation; no magic approval phrase is required.

Record the answer's actual source, speaker attribution, scope, subject revision and conditions, with the resulting disposition in GitHub. A local conversation can be identified by its available session/message locator and a faithful retained excerpt. State when independent identity verification is unavailable; shared GitHub credentials are not proof that the human authored an agent-posted receipt. Resolve ambiguity before dependent advancement. A precise current answer reuses its authority; do not ask the same approval again.

A minimal decision receipt can be a short issue comment:

```text
Question: <stable identity and specific decision>
Subject: <artifact ID/path and full revision or digest>
Source: <actual conversation/message locator and attributed human response>
Decision: <accepted/revised/rejected scope and conditions>
Disposition: <next authorized action; affected hold/reassessment only when applicable>
```

The placeholders are structure, not a required multi-field comment for every reply. A clear agreement can be recorded in one sentence with its source and scope. Recording it needs no separate assessment; apply the checkpoint contract to any dependent advancement. A receipt does not claim reassessment or execution already happened.

## Retain waits and uncertain delivery

Track a request/report as prepared, sent, awaiting acknowledgment, accepted or refused as actually observed. Sending a message, writing a handoff or posting a file is not receipt by another session. Before retrying an uncertain send, read the durable record using the same request/report identity; reconcile a prior result or resend under that identity, preserving the uncertainty if lookup is unavailable.

On a late response, compare the question identity, revision, current authority and current disposition. Keep unrelated/stale answers as history. A duplicate of an already handled answer causes no second advancement. On a valid answer that resolves a policy hold or changes an applicable control, obtain the affected reassessment and check remaining conditions before dependent continuation. Other clear answers are recorded and used within existing authority without an acknowledgment assessment. Unanswered questions and scoped holds survive interruption and handoff; elapsed time alone resolves nothing. These are manual precautions, not distributed delivery guarantees.

Report milestones, changed plans, blockers and results with evidence and the next action. While waiting, keep affected work paused and continue independent authorized investigation or corrections. Do not claim another session has received direction until its actual acknowledgment is observed.

## Transfer an existing writer

Follow the full planning convention for sender and receiver, including policy review before publication and writer transfer. Retain the change's existing branch; hand off the repository, full commit, PR/base, document IDs/paths, source/decision revisions, current action, open questions/findings, sender release and intended recipient. The portable pointer is the issue and exact receipt, not an absolute filesystem path.

The recipient fetches and checks the offered content against current branch/issue disposition, reads the governing sources, reconciles relevant changes and records acknowledgment of the exact receipt before editing. Reuse an applicable current handoff assessment. Without clear writer release/exclusion, read/review or prepare a separately isolated proposal; do not silently reclaim the shared candidate. A disappeared writer requires the convention's explicit coordinator takeover procedure.

A new effort with no predecessor has no handoff to demand. Start from its user's outcome and relevant evidence, discover its context and select the appropriate flow. Historical investigations are inputs with their original scope and standing; they do not automatically assign the new session's destination.

## Return a result

Bind the result to the work/attempt and actual source revision, describe what happened, link criterion evidence and independent review, and retain limitations, outstanding obligations and the intended recipient's acknowledgment. For delivery, identify integrated source/build and applicable configuration, migration, activation and recovery notes for release management. Record a release as performed only when its separately authorized execution is observed.

## Finish triage and clean up the workspace

Complete workspace cleanup before returning a completed triage or delivery result.
For each task checkout this session owns, verify its work disposition, Git status,
PR/merge state and worktree users. Return reusable checkouts to current `main` by
fast-forward after preserving all required work. Remove disposable task worktrees
and local/remote task branches once their work is integrated (including a verified
squash merge) or the investigation needed no retained changes, and they have no
remaining owner or continuation use. Keep the established runtime source checkout;
it is not a disposable worktree.

Preserve dirty files, unpublished/unmerged work, another session's checkout and
branches needed for an open PR or ongoing implementation. Retain any ref still
needed to retrieve a pinned source or evidence revision. If cleanup cannot safely
finish, name the retained item, reason, owner and next action in the completion
receipt; an unresolved triage or active handoff is a continuation, not cleanup
permission. Reuse existing authority for routine cleanup, and report the resulting
branch/checkout state rather than waiting for the user to request it.

## Close out delivered work

As part of the authorized delivery sequence, verify the merge/integrated revision
and applicable checks, then reconcile the owning issue, configured Project status
and companion planning PRs. Complete a companion PR when its reviewed content and
merge authority permit; otherwise give it an owner and concrete remaining action.
Close only the work whose completion contract is satisfied; keep a broader parent
open for remaining obligations. Reuse the assessed delivery sequence for its
bookkeeping instead of requesting another review to post the result.

Return one concise completion receipt: landed revision/PR, relevant validation,
remaining owned follow-ups, and release disposition. Do not wait for the user to
ask for administrative closeout. Within existing authority, finish these actions;
when a permission or required check blocks one, name that exact remaining action.
Release timing remains a human decision unless already authorized.

A new bug report discovered during closeout receives a linked intake item or an
explicit triage owner and next action. Establish its event time and affected version
before treating it as a regression of the delivered repair. A comment on a closed
issue is not an adequate follow-up disposition by itself.
