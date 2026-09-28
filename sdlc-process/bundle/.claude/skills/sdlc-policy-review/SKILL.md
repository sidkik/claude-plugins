---
name: sdlc-policy-review
description: Independently assess a named SDLC advancement or corrected finding against the applicable process, source revisions, actual history, human decisions and evidence. Return scoped pass, fail or required unknown findings before the accountable session acts.
---

# Assess the proposed action

Read the [policy checkpoint contract](../../../docs/work/agent-orchestration/workstreams/context/governed-context.spec.md#policy-agent-checkpoints-across-the-process), the [process](../../../docs/work/agent-orchestration/process/orchestration.process.md) and the applicable activity's actual skill. Use the governing scope and current user decisions; this procedure supplies no new product authority or automatic enforcement.

Use the checkpoint contract to distinguish advancement from bookkeeping. An
ordinary agreement receipt, blocker report or investigation update (including a
corrected hypothesis) within the authorized step needs no assessment merely to
post it. Assess substantive advancement or resolution of a policy hold under the
checkpoint contract. When a human answer resolves a policy hold or changes a required control, assess its effect on
the dependent action once; do not add an acknowledgment checkpoint. Explicitly
name each action when one assessment covers a coherent sequence, and retain any
execution-time conditions. Reassess changed inputs and uncovered actions.

## Independent review

The assessor is a separately assigned agent from the worker whose advancement is assessed. Use the [source agent brief](../../../.claude/agents/sdlc-policy-reviewer.md) and actual available harness. If independent execution is unavailable, return a required unknown for the checkpoint; a worker self-check is useful preparation, not the independent pass. Helpers return findings to the accountable session; they do not send global reports or mutate tracker state on its behalf.

Receive the work identity, accountable session/attempt, current step, exact proposed action, applicable policies/skills, source revisions, actual outputs/history, human decision sources, previous assessments and intervening changes. Resolve those inputs yourself. If access, identity, completeness or revision is uncertain, retain that coverage gap instead of certifying the author's summary.

## Review and return

1. Establish which requirements govern **this action**. Read the relevant source content and its trusted decisions. Preserve accepted scoped decisions even when the consolidated document remains draft. Separate drafting a proposal from acting on its acceptance; requesting human architecture review does not already need architecture acceptance. A current user's bounded authorization is applicable to that scope without adopting every draft policy proposal.
2. Reconstruct the required stage criteria and triggered skills from the pinned [route checklist](../../../docs/work/agent-orchestration/process/orchestration.process.md#required-stage-completion), including omitted entries. Check load timing and application outputs separately, applicability reasons, exception authority and evidence assurance. A phase label or green projection is not review evidence. Inspect the underlying actions and outputs against those requirements, including their required order, affected consumers and evidence coverage. Test whether the proposed next action follows from the evidence. For bugs, apply the process's current-behavior and already-fixed routes before endorsing a repair or further environment/replay requirements; identify the material unresolved behavior that justifies additional investigation. Check that the brief's consumers and delivery owners were verified, comment-added work has an explicit scope disposition, and QA holds identify an applicable failed criterion, a caused regression or missing required verification. Bind each proof to its actual contract/code/environment revision. Explain why it proves the required claim; green counts and skill names alone do not. Mark an inapplicable requirement with its reason rather than generating unrelated holds.
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
