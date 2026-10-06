---
name: orchestrator
description: How the primary thread orchestrates agent work in this repo — skill-grounded dispatch briefs, mandatory code reviews (reading code, never scanning), adversarial reviews for complex areas, verification of every self-report, follow-up discipline, and supervision. Load at the START of any session that will dispatch agents, and re-read before every dispatch wave.
when_to_use: Any multi-agent build — before writing the first dispatch brief, before accepting any agent report, before declaring any chunk done.
---

# Orchestrator

The orchestrator's job is not speed of dispatch — it is being the quality
gate agents cannot be for themselves. Every rule here was paid for on
chad/154 (2026-07-07/08); the failure that bought it is named inline so
the rule is never re-litigated.

## Rule 0 — load the governing skills BEFORE writing briefs

You cannot brief work you haven't loaded the skill for, and you cannot
review it either. **Blind briefs override agent skills**: dispatch briefs
read as authoritative, so an agent with the right skill preloaded will
still build your anti-pattern if your brief dictates one.

- Before ANY dispatch: load every skill governing the work being briefed
  (temporal-workflow-writer for worker code, web-service-writer for
  service code, repository-writer, adapter-writer, scenario-test-writer,
  cqrs-messaging-writer, errors-v1-writer…). Brief structure/shape MUST
  derive from the skill's own sections, not from memory of them.
- **Load IMMEDIATELY — the moment the governing work is identified.**
  Never defer loading to "when the work starts", a later phase, or after
  a planning conversation. Planning, answering questions about, or
  queuing work whose governing skill is not yet in context is already
  the violation — the skill informs the plan and the answers, not just
  the brief.
- Every brief carries the clause: **"load <skill> first; if this brief
  contradicts the skill, THE SKILL WINS — flag the contradiction."**
- **Every launch names its skills — Claude and codex alike.** Native
  Claude agents get the skill-wins clause above. Codex lanes inherit NO
  skills and NO project context: their brief's STEP 0 is an explicit
  ordered list of `.claude/skills/<name>/SKILL.md` (+PATTERNS etc.) file
  paths to READ — they are ordinary repo files — covering every layer
  the task touches, and the lane's report must state, per file changed,
  which skill rules it was verified against. An inlined convention
  digest is not a substitute; digests drift and under-specify.
- *Paid for by:* the accounting-worker rebuild brief dictating
  "workflows call activities directly" — the skill's NAMED legacy
  anti-pattern — which the agent dutifully built. Found by Q, not by me.

## Establish the worker runtime and workspace

Read the installed delegation runtime documentation and skill before launching a
worker (for example, `codex-crew:crew-runtime` or `grok-crew-runtime`). Reading
the source establishes the contract when native invocation is unavailable. Its commands and capability
checks govern launch, progress inspection, steering, resume and cancellation.
Native harness agents use their available tools. A missing runtime holds that
lane only; use another available, authorized harness where appropriate.
Where codex-crew is installed and authorized, use its workers by default;
otherwise use the available authorized harness.

Resolve the actual checkout paths before dispatch. For cross-repository work,
select the smallest authorized workspace root containing all intended write paths;
for one repository, use its authorized root. Establish the runtime's actual sandbox
and permission behavior rather than assuming that changing cwd grants access.
Record the launch cwd and use it for subsequent operations when job lookup depends
on cwd. Every brief names absolute target paths and explicit write fences. Local
machine paths are observations to discover, not shared process requirements.

Before changing a running worker's assignment, inspect its current state and the
runtime's supported controls. Use verified steering when available; distinguish
an in-flight change from a message queued for a later turn. If stopping/relaunching
is required, inspect partial edits first and give the replacement the complete
end-state, current history and applicable constraints. Confirm the resulting state;
sending a command alone does not prove that a worker received it.

## Dispatch briefs

- **Fences**: explicit file/tree boundaries per agent; parallel agents
  never share a writable file. Shared-file edits are named, surgical,
  and reported.
- **Contracts dictated once, verbatim, identically**: when parallel
  agents share an interface (repo signatures, workflow inputs), write
  the exact signature into BOTH briefs from one source. *Paid for by:*
  the revocation-input mismatch (`FullRefund/RefundRatio` vs
  `RefundAmount/PaymentTotal`) — two briefs, two shapes, runtime-only
  failure, caught by the receiving agent.
- **Complete state**: agents get history, not vibes — what exists, what
  landed mid-flight, what another session is doing. An agent guessing at
  state builds on sand.
- **Report requirements**: every brief ends with what evidence the
  report must contain (file:line, test output, boot proof by NAMED pod).

## Reviews — mandatory, skill-grounded, code-reading

**Every build wave gets a conformance review before its commit. No
exceptions, no silent skips.** If circumstances genuinely force shipping
unreviewed, SAY SO to Q in those words and let Q decide — deleting the
gate silently is the deception the DoD rules forbid. *Paid for by:* A1
shipping with zero reviews (C14 got two) while nine hours of runway
remained; the architecture violation sat until Q found it himself.

- **Before drafting a code-review brief, load
  [code-review](../../../.agents/skills/code-review/SKILL.md).** Preserve its
  independent Standards and Spec axes and paste its complete mandatory smell
  baseline into the Standards brief alongside repository standards. A tailored
  checklist supplements that contract; it cannot replace it.
- **The reviewer loads the governing skill first** and reviews against
  its checklist — tests and self-reports verify OUTCOMES; skills define
  CONVENTIONS. A worker can be all-green and built wrong.
- **Reviewing means reading the code.** Not scanning, not sampling a few
  files, not grepping for smells: read every file in scope completely.
  A review that reads three of nineteen files is a scan wearing a
  review's name.
- **Keep decisions separate from claims.** Accepted human intent and scope
  decisions govern the review. An author's brief, implementation choice,
  checklist, or assertion that a finding is fixed is a claim to test, not
  proof that the implementation or approach is correct. A write or action
  fence limits what the reviewer may change; it does not limit supported
  findings. The reviewer chooses the relevant callers and sibling analogues
  needed to assess the changed contract, without turning a bounded review
  into an exhaustive whole-repository audit. Report source-backed defects or
  contradictions in the spec or approach for disposition by the proper
  authority; do not silently rewrite accepted human intent.
- **Challenge additions against existing capabilities.** For new production
  functions and paths, inspect relevant existing equivalents and callers; state
  whether reuse or modification could satisfy the requirement and why an addition
  is necessary. Apply repository architecture, concurrency and compatibility
  constraints. Function count and smell labels alone do not prove a defect.
- **A bounded re-review stays bounded.** Carry forward identified prior coverage
  and evidence only where the applicable inputs are unchanged. Re-test the
  correction and new affected surface at the pinned revision, including reuse
  checks for added code. Missing earlier coverage still needs assessment before
  overall approval. A brief listing prior findings cannot suppress new supported
  findings within that affected surface or erase unresolved earlier findings.
  **Recurrence consolidates.** When a re-review finds another instance of a
  defect class an attempted correction already targeted, the primary and
  reviewer record in the existing review return/brief, BEFORE another repair
  dispatch: the governing accepted behavior and standards; the affected real
  callers and input classes, with unknown or default behavior stated; observed
  failures; representative regression coverage; and a finite completion
  boundary. Broader alternatives and exhaustive catalogs are not required.
  Each blocker records the evidence for realistic reachability and impact and
  the contract it violates; a failing synthetic or mock case alone proves
  neither, though a static standards finding can block without a behavioral test.
  Missing required proof holds its dependent gate. The revision keeps unchanged
  prior coverage, rechecks the fix and affected surface, and stays open to new
  supported findings and to the reviewer's challenge of the author's proposed
  boundary; the author's assertion alone does not establish that boundary's correctness.
  A review-count cap cannot waive required checks. An unresolved authority choice goes to
  the human, holding only its dependent actions. Once the agreed affected
  criteria and proof pass and prior unresolved findings are dispositioned, the
  review concludes without a redundant fresh full review.
- **Adversarial reviews for complex/money areas**: independent skeptics
  briefed to REFUTE — concurrency envelopes, idempotency under retry,
  race windows, orphaned-state paths. *Paid for by:* the orphaned-PENDING
  remainder poisoning and the concurrent-customer dup-create — both found
  only because the reviewer was told to attack, not admire.
- **The orchestrator's own edits get the same review.** Primary-thread
  fixes are agent output with better PR. *Paid for by:* my
  MarkRefundFailed/ResolvePayment additions shipping without the adapter
  tests every sibling method had — caught by the next review, not by me.
- Review findings retain their Standards or Spec axis and are typed: must-fix
  (blocks commit), should-fix (fix now or Q rules), flagged (Q decides). Record
  the evidence class below separately from severity and give each a disposition.
  An unverified suspicion alone is not a proven must-fix; an unmet required
  verification criterion holds only its dependent action.

### Reviewer-owned proof

Review briefs authorize test creation and execution in a reviewer-owned isolated
checkout of the exact candidate revision, including a pinned patch for reviewed
uncommitted changes. Name its write fence; keep production code and the
implementer's working tree untouched. Arrange the necessary test capability
instead of imposing blanket read-only review. Respect an explicit human read-only
restriction and report the resulting proof gap. Follow the delivery repository's
test selection and test-writing skills.

- **Unit-testable behavioral defect:** the reviewer writes and runs a focused
  failing regression before reporting the defect as proven. Assert the accepted
  behavior through the real code path, with only dependencies mocked as the
  repository permits. Return the candidate SHA, transferable test patch, command,
  expected versus actual result and relevant failure output. A compilation,
  dependency or environment failure is a proof gap, not a reproduced defect.
- **Static standards or design finding:** cite the exact rule and affected code;
  identify smell findings as judgement calls and explain the concrete reuse or
  maintenance consequence. These do not require invented behavioral red tests.
- **Scenario/live or unavailable proof:** return the source-backed hypothesis as
  unverified, the exact missing observation or capability, its owner and next
  check. Use existing scenario seams where feasible; do not manufacture a new
  integration harness merely to turn a review suspicion into a red test.

The reviewer owns producing the proof, including correcting an invalid test.
The implementer verifies transfer of the same regression and reviewed candidate,
reuses its red evidence when those inputs are unchanged, repairs production code
and demonstrates green on the repaired revision. A changed test, expected behavior
or reviewed baseline requires renewed red evidence on that baseline; any test
change also needs an explicit reason. The intended production repair is the green
revision, not a demand for another failure. The primary
checks the expectation, revisions, patch and actual run results before treating
an alleged behavioral defect as established; it routes missing proof back to its
owner rather than writing the test itself. Keep concise results in the existing
review return, with the regression transferred to the delivery repository when
accepted; no separate diagnostic archive is required.

## Verification — self-reports are hypotheses

- **Verify the applicable tests yourself** before believing "all green".
  Use the delivery repository's test selection and commands; for Go, apply
  its race-check requirements. Inspect actual results, not sampled counts.
- **When boot proof is required, use fresh start evidence from the changed
  runtime**, following the delivery repository's contract. For Kubernetes
  workers, resolve the NAMED pod after the change and verify its fresh
  "Started Worker" event. Pod-Running is never evidence; label-resolved
  boot-greps can match a dying pod. *Paid for by:* the billing-worker
  wedge hiding for 23 minutes behind a check that matched the old pod.
- **Scenario gates**: apply the delivery repository's integration/scenario
  requirements. Where its lifecycle requires a scenario suite for a multi-layer
  feature, completion requires that suite written, RUN, and green. Declaring
  done before scenarios exist is a false report. *Paid for by:* A1
  declared "proven" at 4:12 PM on three log lines; the suite that
  actually validated it (and found a books-integrity bug) arrived at
  10:11 PM.
- **Falsify agent diagnoses before relaying or acting** — reproduce the
  failure, read the primary evidence. *Paid for by:* the "account-side
  webhook asymmetry" theory that was actually our own stale subscription
  list.

## Follow-ups

- Every review finding, flagged gap, and TODO seam gets an owner: fixed
  now, tracked in the owning issue, or explicitly surfaced to Q. Nothing
  dies in an agent report; a separate document is not required.
- Fixes get re-verified at the same standard as the original work
  (tests + review + scenario when applicable) — a fix is a build wave.
- When an agent stalls (idle final message, "waiting on a monitor"),
  reconstruct its state from side effects and resume it with a directive
  — never re-dispatch blind, never let it sit.

## Supervision

- Watchers are armed IN THE SAME MESSAGE as the dispatch (side-effect
  probes: file mtimes, compile processes, runner activity). 10 minutes:
  verify liveness via side effects. ~20 minutes quiet: intervene. An
  hour is a failure of supervision, not of the agent.
- Take mechanical INVESTIGATION/VERIFICATION back into the primary thread
  when dispatch overhead exceeds the work — but never code edits: the
  primary thread orchestrates, agents write ALL code, however small
  (Q ruling 2026-07-17, after six hand-edited call sites).
- **Delegation depth and constraint propagation**: sub-delegation dilutes
  briefs — every hop loses constraints. Briefs must either forbid
  re-delegation or require the full constraint set (skill-wins clause,
  the task-commands-only tooling rule, fences, report requirements) to be
  passed VERBATIM into any child brief. *Paid for by:* a depth-3
  grandchild running raw grpcurl against the scenario-runner — hanging
  72 then 111 minutes on the identical unbounded call — while the
  task wrapper that bounds runs sat unused; 3 of a dispatch's 4.5 hours.
- Bound foreground polling and observation calls at the call site; use the
  runtime's background handle for long-running agent work. A polling timeout
  does not authorize killing the worker. Total worker deadlines require an
  explicit task budget or documented resource constraint in its runtime skill. Repeating a command that
  just hung, unchanged, is a stop-and-think moment, not a retry.
- **Supervision is a TICKER, not an alarm**: arm a periodic 10-minute
  check-in ticker in the same message as the dispatch; each tick forces
  the orchestrator to audit side effects (fresh files excluding
  worktrees, build/test processes) and act. Passive threshold-alarms
  fail two ways: shared-tree noise placates them, and they create no
  check-in behavior. *Paid for by:* a 36-minute zero-output dispatch
  under a never-firing activity-watcher.
- Shared-branch discipline: attribute foreign churn before diagnosing;
  stage commits by explicit path only; defer co-edited files to a joint
  commit and say so.

## Write it down

- Keep the current scope, decisions, findings and concise validation in the
  existing work issue/PR. Apply [work-artifacts](../work-artifacts/SKILL.md)
  before creating a maintained document. Its working-material rule governs
  logs, session histories and review archives; a work chunk or helper report
  does not require a new document.
- Status surfaces (READMEs, the build-map artifact) are trued at every
  ship, by FULL-DOCUMENT read — patch-editing a status document until
  its sections contradict each other destroys trust in true work.
  *Paid for by:* the map showing C8 at FINAL GATE four days after it
  shipped 10/10.

## Anti-pattern index (fastest self-check before any dispatch)

| Smell | The rule it breaks |
|---|---|
| Writing a brief without the skill open | Rule 0 |
| "The agent's tests pass" as done | Reviews are skill-grounded |
| Review that read part of the scope | Reading means reading |
| Shipping a wave with no review, silently | Mandatory review / say-it-out-loud |
| "Done" before scenarios exist | Scenario gate |
| Same contract described twice, differently | Dictate once, verbatim |
| Boot-check by label, not named pod | Verification |
| Status doc patched, not re-read whole | Write it down |
| Deadline invoked while hours remain | Honesty — check the clock before citing it |
| Child brief thinner than the parent's | Constraint propagation |
| Unbounded foreground call to a runner | Timeout at the call site |
| Edit script prints success it never verified | Verify the artifact, not the echo |
| Worker write paths outside its authorized workspace | Establish the worker runtime and workspace |
| Relaunching a codex "blocked"/exit-0 report as if it died | Worker recovery |

## Worker recovery

Use the installed runtime's documented recovery contract and actual job state.
An exit with "blocked" or "did not modify" is a report: inspect its evidence and
resolve the permission, source or scope gap before continuing. A missing process
or stale status requires reading retained output and checking related jobs before
cancellation or relaunch. Never duplicate a job merely because a polling call ended.

Bound retries according to the runtime's current recovery rules. When that lane
cannot proceed, report the concrete capability failure and use an available
native harness only within the assignment's existing authority. Runtime-specific
limits and incident remedies belong in maintained runtime documentation, accessible
to the recipient; private session memory is not a required process dependency.

## Running live scenarios

When the delivery repository supplies scenario groups, run them through its task runner using the group's
configured execution mode and parallelism. Do not create or require an
agent-side scenario lock. Diagnose observed failures before changing execution
settings; follow the user's explicit execution instructions.
