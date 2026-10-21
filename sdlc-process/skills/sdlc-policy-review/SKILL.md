---
name: sdlc-policy-review
description: Independently assess a named SDLC advancement or corrected finding against the applicable process, source revisions, actual history, human decisions and evidence. Return scoped pass, fail or required unknown findings before the accountable session acts.
---

<!-- source: https://github.com/sidkik/planning @ 00a15fb8682612b6d8fbe9e603b561d42f8688b7 .claude/skills/sdlc-policy-review/SKILL.md sha256:9204acd7c57222c3038eeddde98fc30c0245fdd543961b7b7c5961c610102bc7 -->

> Source precedence: apply the [source adapter contract](#apply-packaged-sources-in-the-working-repository) at the end of this skill for working-repository ownership and source precedence.

# Assess the proposed action

Read the [policy checkpoint contract](#policy-agent-checkpoints-across-the-process), the [process](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md) and the applicable activity's actual skill. Use the governing scope and current user decisions; this procedure supplies no new product authority or automatic enforcement.

Use the checkpoint contract to distinguish advancement from bookkeeping. An
ordinary agreement receipt, blocker report or investigation update (including a
corrected hypothesis) within the authorized step needs no assessment merely to
post it. Assess substantive advancement or resolution of a policy hold under the
checkpoint contract. When a human answer resolves a policy hold or changes a required control, assess its effect on
the dependent action once; do not add an acknowledgment checkpoint. Explicitly
name each action when one assessment covers a coherent sequence, and retain any
execution-time conditions. Reassess changed inputs and uncovered actions.

For a native observer return, apply the checkpoint contract's advisory-observer rule: inspect the underlying evidence before asserting noncompliance, preserve coverage gaps as such, and distinguish corrective advice from the independent assessment required for advancement.

## Independent review

The assessor is a separately assigned agent from the worker whose advancement is assessed. Use the [source agent brief](../../agents/sdlc-policy-reviewer.md) and actual available harness. If independent execution is unavailable, return a required unknown for the checkpoint; a worker self-check is useful preparation, not the independent pass. Helpers return findings to the accountable session; they do not send global reports or mutate tracker state on its behalf.

Receive the work identity, accountable session/attempt, current step, exact proposed action, applicable policies/skills, source revisions, actual outputs/history, human decision sources, previous assessments and intervening changes. Resolve those inputs yourself. If access, identity, completeness or revision is uncertain, retain that coverage gap instead of certifying the author's summary.

## Converge

Apply the process's [convergence rules](#converge-reviews-decisions-and-publication). Classify each finding as a material blocker or advisory, naming the violated acceptance criterion or authority, the smallest fix and its verification. When the only remaining fix is an exact deterministic mechanical edit, return a conditional pass that states the literal edit and a verification predicate. Re-reviewing the worker's recorded predicate result on the final revision is not required; reassess when the edit differs, the predicate fails or the change is semantic. Judge the edit's nature, not its size. Consolidate a recurring defect class into one finding, and conclude once every blocker's condition is met.

## Review and return

1. Establish which requirements govern **this action**. Read the relevant source content and its trusted decisions. Preserve accepted scoped decisions even when the consolidated document remains draft. Separate drafting a proposal from acting on its acceptance; requesting human architecture review does not already need architecture acceptance. A current user's bounded authorization is applicable to that scope without adopting every draft policy proposal.
2. Reconstruct the required stage criteria and triggered skills from the pinned [route checklist](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#required-stage-completion), including omitted entries. Check load timing and application outputs separately, applicability reasons, exception authority and evidence assurance. A phase label or green projection is not review evidence. Inspect the underlying actions and outputs against those requirements, including their required order, affected consumers and evidence coverage. Test whether the proposed next action follows from the evidence. For bugs, apply the process's current-behavior and already-fixed routes before endorsing a repair or further environment/replay requirements; identify the material unresolved behavior that justifies additional investigation. Check that the brief's consumers and delivery owners were verified, comment-added work has an explicit scope disposition, and QA holds identify an applicable failed criterion, a caused regression or missing required verification. Bind each proof to its actual contract/code/environment revision. Explain why it proves the required claim; green counts and skill names alone do not. Mark an inapplicable requirement with its reason rather than generating unrelated holds.
3. Assess each applicable requirement as `pass`, `fail` or `unknown`, naming whether an unknown is required for this action. Check current authority, outstanding holds and relevant source changes. Distinguish missing proof, a setup failure and an observed behavior failure. Human decisions retain actual conversation/response provenance; an agent comment under shared credentials is not independent identity evidence.
4. Return one compact assessment in the existing work issue/PR. A separate retained review artifact requires the user's request under work-artifacts; do not commit raw review logs or an execution archive. Include:

   - Review identity, assessor, work/attempt, current step and proposed action.
   - Exact inspected source/policy/skill/artifact revisions or digests, history coverage and inaccessible/missing inputs.
   - Per-requirement result, governing source, inspected evidence and rationale.
   - Every finding's affected work/action, expected versus observed result, accountable resolver, smallest correction and observable resume condition.
   - Applicable reused checks with justification, remaining independent authorized work and overall disposition for the named action.

Completion: every applicable required control is covered and the accountable session can determine whether the proposed action is supported. Any failed required control, required unknown or incomplete checkpoint holds affected advancement. Optional observations remain visible without becoming invented gates. A pass applies only to this action and input set; it does not approve architecture, waive policy, allocate capacity, perform the transition or prove the result.

## Reassessment

For a correction or human response, compare the supplied answer/evidence with the original question/finding identity, subject revision, decision scope, conditions and actual authority. Read the current durable disposition before allowing a repeated send or continuation. A stale, unrelated or ambiguous answer preserves the affected wait and identifies what would resolve it; silence is unanswered.

Reassess the failed controls and dependent assumptions. Reuse unaffected evidence explicitly. A valid current answer can clear the matching finding once the required reassessment passes; the accountable coordinator still checks remaining authority, blockers and resources before continuing. A duplicate answer is recorded as already handled, with no second advancement. Late results from superseded attempts remain historical.

Disputed findings are resolved against the governing source and authority. Return a corrected assessment when the original finding was wrong; do not demand a new human exception for an obligation the process never imposed. Runtime identity, stale-writer exclusion and crash-safe replay remain separate unqualified system capabilities.

## Bundled required dependencies

The instructions above require the following pinned files. They are included here so this invocation loads them; separately invoked skills are not.

<!-- source: https://github.com/sidkik/planning @ 00a15fb8682612b6d8fbe9e603b561d42f8688b7 docs/work/agent-orchestration/workstreams/context/governed-context.spec.md#policy-agent-checkpoints-across-the-process sha256:91d0b32ce1bde1334362b264fc59a56c02d8c03e02e5f77a89698d5a7b4da7b9 -->

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

<!-- source: https://github.com/sidkik/planning @ 00a15fb8682612b6d8fbe9e603b561d42f8688b7 docs/work/agent-orchestration/process/orchestration.process.md#converge-reviews-decisions-and-publication sha256:c691867c5324df0dd7cb2b70535ae1dd36aac8b7bc27eb13fe61971cf90f0ed3 -->

### Converge reviews, decisions and publication

Convergence ends repeated work when its stated condition is met. It sets no numeric limit on reviews, tests or questions, and it never waives a required check.

- **Batch coherent changes.** Group related brief or spec changes into one candidate, then assess and publish it once. An ordinary decision, bookkeeping or investigation update joins the candidate it belongs to; committing or posting it does not make it an independent checkpoint. A checkpoint under the [planning convention](../../bundle/docs/work/agent-orchestration/process/planning-repository.process.md#publish-a-reviewable-checkpoint) is a coherent candidate for an actual advancement, never each edit or message.
- **Classify each finding.** Record a class, the violated acceptance criterion or authority, the smallest fix and the verification that shows it. A *material blocker* violates an accepted criterion, authority or required evidence and holds its dependent action. An *advisory* finding has no such violation; record its disposition and continue. A finding that names no violated criterion or authority is advisory.
- **Conditional pass.** An independent reviewer may pass on an exact, deterministic mechanical edit (file, location, old and new text) paired with a verification predicate (command or check and expected result). The predicate names the assessed revision and exits non-zero unless the diff from that revision to the final pushed revision is exactly the specified edit (or the named generator's output), with no other file, hunk or uncommitted change; the recorded hash is the pushed revision, so any later commit voids the result and anyone can rerun it. The accountable worker applies exactly that edit, runs the predicate on the final revision and records the revision, command and result. That evidence satisfies the condition without another model assessment. Return to independent reassessment: a semantic change, new behavior, authority or evidence, any edit that differs from the specified one, a failed predicate, and a FAIL that carries no conditional pass. Diff size decides nothing: a one-character edit that changes meaning is semantic, and a large generated edit with a deterministic predicate can be mechanical.
- **Consolidate and stop.** Another instance of a defect class already targeted follows the orchestrator's [recurrence rule](../orchestrator/SKILL.md#reviews--mandatory-skill-grounded-code-reading). The review concludes when every blocker's verification has passed and every advisory has a disposition. A fresh full review is not required.
- **Reuse accepted decisions.** An accepted human decision answers its question for in-scope work. Ask again only when new concrete evidence materially contradicts it or shows it insufficient for in-scope user-visible behavior; state the evidence delta and hold only the dependent work. Facts, engineering choices and test-seam execution are agent work, not questions. When the user says to stop asking, stop; do not infer a new product decision from frustration, and report a genuine blocker once, holding only its dependent work. Existing authorization persists.
- **Bound grilling here.** Grilling and grill-with-docs end when every prerequisite-ready human choice has an answer or a reported blocker. Check the decision record for a settled answer before each question. The imported skills stay unchanged; this adaptation sits above them.
- **Observer.** The [advisory observer](#policy-agent-checkpoints-across-the-process) flags re-asked settled questions, semantic-free review restarts and publication churn. It accepts executed reviewer-specified mechanical verification and flags a semantic change presented as mechanical, a missing predicate result or an unsafe self-clear. Human direction governs within its scope.

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
   [work-artifacts](../work-artifacts/SKILL.md) and read its linked planning
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
