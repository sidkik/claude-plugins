---
name: orchestrator
description: How the primary thread orchestrates agent work in this repo — skill-grounded dispatch briefs, mandatory code reviews (reading code, never scanning), adversarial reviews for complex areas, verification of every self-report, follow-up discipline, and supervision. Load at the START of any session that will dispatch agents, and re-read before every dispatch wave.
when_to_use: Any multi-agent build — before writing the first dispatch brief, before accepting any agent report, before declaring any chunk done.
---

<!-- source: https://github.com/sidkik/planning @ 09243483254a746e1fef504f1e5ad959d484eaa3 .claude/skills/orchestrator/SKILL.md sha256:2bc1209e43d6acff56788a926299825b9c5765a83ab5049b9bf5053304d506ee -->

> Source precedence: apply the [source adapter contract](#apply-packaged-sources-in-the-working-repository) at the end of this skill for working-repository ownership and source precedence.

# Orchestrator

The orchestrator's job is not speed of dispatch — it is being the quality
gate agents cannot be for themselves. Every rule here was paid for on
chad/154 (2026-07-07/08); the failure that bought it is named inline so
the rule is never re-litigated.

## Rule 0 — load the governing skills BEFORE writing briefs

Use the [SDLC entry's loading contract](../sdlc-process/SKILL.md#follow-the-work):
a required load is a native invocation whose result delivers the full governing
instructions and mandatory reference content, so no separate read of the source is
needed. A file read alone never satisfies a required skill load, and a pointer-only
result is an incomplete payload. Record unavailable invocation or an incomplete
payload as a scoped capability gap, including in delegated worker returns. At
continuation, task pivot and before each dispatch wave, apply that contract's loaded
identity, path and revision comparison, then refresh applicable constraints against
current inputs. Carry verified load evidence or the exact dependent gap into the
brief; reuse an identified successful invocation while its delivered content
remains in context, and load again after actual loss or truncation of that content.

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
  ordered list of skill names and `.claude/skills/<name>/SKILL.md`
  (+PATTERNS etc.) source paths covering every layer
  the task touches. Invoke each required skill through the available native
  mechanism; its result must deliver the full instructions and mandatory
  reference content. Native evidence is the Claude `Skill` call with its success,
  or for a Codex worker an accepted structured skill input with its result (crew:
  `task --skill <name>`); a file read substitutes for neither. The worker's return
  or transcript carries the native-invocation evidence and states that the result
  delivered the instructions; a job launch or skill discovery alone is not
  success, and a pointer-only result is a load gap. If unavailable,
  report the scoped load gap and hold the governed action. Route that action to an authorized capable
  worker when available; a source read alone cannot clear the hold.
  The lane's report must state, per file changed,
  which skill rules it was verified against. An inlined convention
  digest is not a substitute; digests drift and under-specify.
- *Paid for by:* the accounting-worker rebuild brief dictating
  "workflows call activities directly" — the skill's NAMED legacy
  anti-pattern — which the agent dutifully built. Found by Q, not by me.

## Establish the worker runtime and workspace

Natively load the installed delegation runtime skill before launching a worker
(for example, `codex-crew:crew-runtime` or `grok-crew-runtime`) under the entry
contract, and consult its documentation for commands as needed. Reading
the source provides instructions when native invocation is unavailable, but does not satisfy a required load. Report that gap under the entry contract. Its commands and capability
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
A brief for work that needs a live local environment names the allocated
environment's custody pointers, or tells the worker to follow the
[local environment rules](#local-runtime-environments-select-own-validate-and-clean-up) to reuse or create one,
and forbids deleting an environment the worker does not own.

Before changing a running worker's assignment, inspect its current state and the
runtime's supported controls. Use verified steering when available; distinguish
an in-flight change from a message queued for a later turn. If stopping/relaunching
is required, inspect partial edits first and give the replacement the complete
end-state, current history and applicable constraints. Confirm the resulting state;
sending a command alone does not prove that a worker received it.

## Dispatch briefs

- **Fences**: explicit file/tree boundaries per agent; parallel agents
  never share a writable file. Shared-file edits are named, surgical,
  and reported. Before launch, compare every lane's actual write set, including
  generated outputs and shared configuration, with active writers. Resolve overlaps
  by assigning one writer and sequencing consumers, or by isolating candidates
  for the integrating owner; an unresolved overlap holds that dispatch.
  In a shared working tree, name one owner for Git/index/branch mutations and
  serialize them with affected lanes quiescent and their edits accounted for.
  A rebase or pull --rebase affects the whole checkout, so it cannot be a lane's
  automatic response to a rejected push while peers are writing or validating.
  Allocate full-suite verification against a stable combined candidate or an
  isolated pinned candidate. Record the tested revision plus any uncommitted
  patch, command/result and concurrent changes; attribute failures to the actual
  tested inputs before assigning repairs or claiming a lane passed. A run whose
  inputs changed requires affected verification on a stable candidate. Completion:
  write ownership, Git coordination and verification inputs are established in
  the brief and checked against actual lane state before launch or redirect.
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
  [code-review](../code-review/SKILL.md).** Preserve its
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
  Classify each finding as a material blocker or advisory with its violated
  criterion or authority, smallest fix and verification. A reviewer may pass
  conditionally on an exact mechanical edit plus a verification predicate; the
  worker's recorded predicate result on the final revision satisfies it, while
  a semantic change or a FAIL without such a pass is reassessed
  ([convergence rules](#converge-reviews-decisions-and-publication)).
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

The reviewer fetches its own GitHub context (PR, issue, checks) and runs the
execution its evidence needs. Tool, network and authentication capability is
distinct from file-write authority: a read-only reviewer may still read GitHub
and run read-only commands. Crew's `task --network` technically permits any
authenticated network request, mutations included; the review authorizes reads
only. "No GitHub mutation, no production repair" is an authority and
instruction fence the reviewer follows, not a guarantee the sandbox enforces.
The primary arranges the capability in the reviewer's lane but does not fetch
for it or finish its proof; the reviewer owns its context and evidence. A
capability the lane cannot supply is reported with its exact reason; the primary
repairs the lane or routes a capable reviewer, and never does the held
review's work. A path fence in a brief is likewise an instruction; the sandbox
settings are what enforce.

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

## Bundled required dependencies

The instructions above require the following pinned files. They are included here so this invocation loads them; separately invoked skills are not.

<!-- source: https://github.com/sidkik/planning @ 09243483254a746e1fef504f1e5ad959d484eaa3 docs/work/agent-orchestration/process/orchestration.process.md#converge-reviews-decisions-and-publication sha256:e5a0cdbffd1b9eef8d80f07da4104b9adffe3ceebb1f0f4e1c8565ec57afbff6 -->

### Converge reviews, decisions and publication

Convergence ends repeated work when its stated condition is met. It sets no numeric limit on reviews, tests or questions, and it never waives a required check.

- **Batch coherent changes.** Group related brief or spec changes into one candidate, then assess and publish it once. An ordinary decision, bookkeeping or investigation update joins the candidate it belongs to; committing or posting it does not make it an independent checkpoint. A checkpoint under the [planning convention](#publish-a-reviewable-checkpoint) is a coherent candidate for an actual advancement, never each edit or message.
- **Classify each finding.** Record a class, the violated acceptance criterion or authority, the smallest fix and the verification that shows it. A *material blocker* violates an accepted criterion, authority or required evidence and holds its dependent action. An *advisory* finding has no such violation; record its disposition and continue. A finding that names no violated criterion or authority is advisory.
- **Conditional pass.** An independent reviewer may pass on an exact, deterministic mechanical edit (file, location, old and new text) paired with a verification predicate (command or check and expected result). The predicate names the assessed revision and exits non-zero unless the diff from that revision to the final pushed revision is exactly the specified edit (or the named generator's output), with no other file, hunk or uncommitted change; the recorded hash is the pushed revision, so any later commit voids the result and anyone can rerun it. The accountable worker applies exactly that edit, runs the predicate on the final revision and records the revision, command and result. That evidence satisfies the condition without another model assessment. Return to independent reassessment: a semantic change, new behavior, authority or evidence, any edit that differs from the specified one, a failed predicate, and a FAIL that carries no conditional pass. Diff size decides nothing: a one-character edit that changes meaning is semantic, and a large generated edit with a deterministic predicate can be mechanical.
- **Consolidate and stop.** Another instance of a defect class already targeted follows the orchestrator's [recurrence rule](SKILL.md#reviews--mandatory-skill-grounded-code-reading). The review concludes when every blocker's verification has passed and every advisory has a disposition. A fresh full review is not required.
- **Reuse accepted decisions.** An accepted human decision answers its question for in-scope work. Ask again only when new concrete evidence materially contradicts it or shows it insufficient for in-scope user-visible behavior; state the evidence delta and hold only the dependent work. Facts, engineering choices and test-seam execution are agent work, not questions. When the user says to stop asking, stop; do not infer a new product decision from frustration, and report a genuine blocker once, holding only its dependent work. Existing authorization persists.
- **Bound grilling here.** Grilling and grill-with-docs end when every prerequisite-ready human choice has an answer or a reported blocker. Check the decision record for a settled answer before each question. The imported skills stay unchanged; this adaptation sits above them.
- **Observer.** The [advisory observer](#policy-agent-checkpoints-across-the-process) flags re-asked settled questions, semantic-free review restarts and publication churn. It accepts executed reviewer-specified mechanical verification and flags a semantic change presented as mechanical, a missing predicate result or an unsafe self-clear. Human direction governs within its scope.

<!-- source: https://github.com/sidkik/planning @ 09243483254a746e1fef504f1e5ad959d484eaa3 docs/work/agent-orchestration/process/orchestration.process.md#local-runtime-environments-select-own-validate-and-clean-up sha256:e5a0cdbffd1b9eef8d80f07da4104b9adffe3ceebb1f0f4e1c8565ec57afbff6 -->

### Local runtime environments: select, own, validate and clean up

This section owns the process rules for work that needs a live local Tilt environment. The delivery repository owns the operations; for Core, use its [named Tilt environments guide](https://github.com/sidkik/core/blob/main/docs/development/tilt-environments.md) (`tilt-config env`, with `task tilt:env -- <command>` as its building wrapper) and the repository's environment skills. Verify command syntax in the current guide or `--help`, not from this process. Automation passes structured argv to the built CLI rather than interpolating a task shell string. Local work needs no cloud authentication or remote provisioning; remote qualification is separate work and holds only remote actions.

1. **Discover, never presume.** Resolve the editing checkout, existing environments (`env list`, `env inspect`), their owners and the shared capacity policy from the machine and delivery repository. A fixed checkout, workspace, namespace, person or environment roster is an observation to confirm, not a process input. A name is neither ownership nor isolation: identity comes from the owner ID and checkout/target the CLI records. Owned allocation is the default. Use a shared or peer environment only under an existing explicit authorization, scoped to what it names; that use creates no ownership or cleanup custody, and it never implies authority to stop, remove or repoint the environment.
2. **The editing worktree is not the running source.** An environment runs from the checkout recorded at creation. Before live validation, verify the actual mapping from that checkout to the runtime, that the candidate source or image is what runs, and fresh startup of each named service, using the repository's environment skill.
3. **Reuse before creating.** Reuse an environment this work owns when its recorded checkout, target and services fit. Otherwise create a new independently named one through the existing CLI with an explicit checkout and target and only the services needed, including their required dependencies. Creation, start and stop honor the shared capacity registry and reservations; never use an alternate registry, raise a limit silently or launch workloads outside the tool.
4. **Record custody in the existing work record.** Keep one pointer entry per environment: owner, checkout and revision, environment name, target and namespace, services, and the immutable ownership identifiers the CLI reports. No separate tracker. Update it at create, handoff and cleanup under the [record procedure](#retain-local-environment-custody).
5. **Custody outlives the session.** Pause, resume and handoff carry the environment's pointers and its status (running, stopped, retained). A session or agent exit, a merged PR or task completion grants no authority to delete a resource; cleanup authority comes from ownership and the work's closeout.
6. **Close out by supported owned cleanup or a retained disposition.** `stop` ends the live loop but retains resources and capacity; a successful owned `remove` releases them. A retained environment names its owner, reason and next action, and keeps its checkout, because recovery needs it. A complete retained disposition satisfies the environment's closeout obligation and does not hold the work's closeout open; resources and capacity stay reserved, recovery stays owned, and nothing claims reclamation. Closeout is CL-2's cleanup obligation and the [workspace cleanup procedure](#finish-triage-and-clean-up-the-workspace).

Readiness control 5 and RS-2 rely on the discovered allocation, not on an environment name or a recorded label.

<!-- source: https://github.com/sidkik/planning @ 09243483254a746e1fef504f1e5ad959d484eaa3 docs/agents/sdlc/records.md#retain-local-environment-custody sha256:62e69bc17f62d34ced9dc034d724d3b2aa2f0efcc94c7b22cd38c10ba1146934 -->

### Retain local environment custody

When work allocates a live local runtime environment, its rules live in the [local environment process](#local-runtime-environments-select-own-validate-and-clean-up). Keep one entry in the existing work record: owner, checkout and revision, environment name, target and namespace, services, the immutable ownership identifiers the tool reports, and status (running, stopped, retained). Take the values from the tool's inspection output rather than memory, and update the entry at create, pause/resume, handoff and cleanup. The entry is a recovery pointer, not authority to delete: the recipient of a handoff inspects the environment and acknowledges custody before acting on it, and a session exit leaves the resource and its entry in place.

<!-- source: https://github.com/sidkik/planning @ 09243483254a746e1fef504f1e5ad959d484eaa3 docs/agents/sdlc/records.md#finish-triage-and-clean-up-the-workspace sha256:62e69bc17f62d34ced9dc034d724d3b2aa2f0efcc94c7b22cd38c10ba1146934 -->

### Finish triage and clean up the workspace

Complete workspace cleanup before returning a completed triage or delivery result.
For each task checkout this session owns, verify its work disposition, Git status,
PR/merge state and worktree users. Return reusable checkouts to current `main` by
fast-forward after preserving all required work. Remove disposable task worktrees
and local/remote task branches once their work is integrated (including a verified
squash merge) or the investigation needed no retained changes, and they have no
remaining owner or continuation use. Keep the established runtime source checkout;
it is not a disposable worktree. For each local runtime environment the session
owns, run the supported owned removal, which releases its resources and capacity,
or record it as retained with owner, reason and next action, which satisfies this
obligation under the [environment closeout rule](#local-runtime-environments-select-own-validate-and-clean-up);
`stop` alone leaves both resources and capacity held. Keep the checkout an
environment was created from until it is removed, since recovery needs it.

Preserve dirty files, unpublished/unmerged work, another session's checkout and
branches needed for an open PR or ongoing implementation. Retain any ref still
needed to retrieve a pinned source or evidence revision. If cleanup cannot safely
finish, name the retained item, reason, owner and next action in the completion
receipt; an unresolved triage or active handoff is a continuation, not cleanup
permission. Reuse existing authority for routine cleanup, and report the resulting
branch/checkout state rather than waiting for the user to request it.

<!-- source: https://github.com/sidkik/planning @ 09243483254a746e1fef504f1e5ad959d484eaa3 docs/work/agent-orchestration/process/planning-repository.process.md#publish-a-reviewable-checkpoint sha256:b7e354fac2120e8e7b2e81e4144baf7d33402ecd6653b815cae3b1e0027d7442 -->

### Publish a reviewable checkpoint

1. Read the owning issue, current candidate and accepted-source pointers. Confirm the accountable owner and whether this is a new change, helper contribution or continuation. Branch names and issue assignees alone do not establish an exclusive session claim.
2. For a new change, fetch current main and create the named branch in an isolated workspace. Record the starting commit and declared dependencies. For a continuation, use the receiving procedure below instead of starting from main.
3. Edit the owning records, keeping proposed changes visibly draft and preserving earlier decision evidence. Commit a coherent checkpoint locally and obtain the applicable policy assessment of that immutable candidate before remote publication. The reviewer may inspect the local committed content; if required evidence or review access is missing, hold publication. Push only the assessed revision after clearance, then verify the remote commit is retrievable before another session depends on it. A local commit, filesystem path or unpushed branch is not remote publication.
4. Open/update the document PR targeting main, link the work issue and state whether it publishes a draft, amends a document or records acceptance. Draft PR status is distinct from draft document status. A PR can become ready to merge while its document remains draft.
5. Complete relevant specialist reviews and policy coverage against the same exact source commit and dependencies. Reuse the publication assessment when it explicitly covers the proposed integration and its inputs remain applicable; verify outstanding conditions instead of commissioning a duplicate assessment. The owner consolidates findings, applies corrections and obtains affected reassessment. Appending visible commits preserves review context; do not rewrite a published review history as routine cleanup. Concurrent contributors use separate changes; the integrating owner reviews the combined meaning even for a clean text merge.
6. Publish to main only after applicable publication checks. Verify the landed content and update the issue's current-document/PR pointers. Preserve the last accepted content revision and decision pointer separately from the newest draft. Human architecture acceptance remains a specific trusted decision; merging alone does not provide it. A metadata-only acceptance update must still demonstrate that the accepted content is unchanged from the decision's subject.

Use meaningful checkpoints, not a PR per message. Batch coherent brief or spec changes into one candidate; decisions, bookkeeping and investigation updates ride with it and are not independent checkpoints merely because they are committed or posted. This governs step 3: assess the batched candidate once. When that assessment is a conditional pass on an exact mechanical edit, applying the edit and recording the verification predicate on the final revision satisfies the condition, so push that revision without a second assessment; any other change to the candidate needs reassessment under the [convergence rules](#converge-reviews-decisions-and-publication). An unresolved candidate can remain in its open PR while review proceeds; publish coherent drafts early so long investigations do not require a permanent shared branch. Initial setup must give document PRs appropriate checks and validate actual merge/identity rules. Current Core CI and shared human credentials are not proof that this path is already configured.

<!-- source: https://github.com/sidkik/planning @ 09243483254a746e1fef504f1e5ad959d484eaa3 docs/work/agent-orchestration/workstreams/context/governed-context.spec.md#policy-agent-checkpoints-across-the-process sha256:91d0b32ce1bde1334362b264fc59a56c02d8c03e02e5f77a89698d5a7b4da7b9 -->

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

**Review responsibility.** A policy agent checks whether required steps actually occurred in the applicable order, whether their outputs support the proposed advance, and whether authority and prior decisions were preserved. For bug work, apply the process's current-behavior and already-fixed routes: challenge a proposed repair unsupported by a current defect, and require a stated material gap for additional environment or replay requirements. Assess whether the next action follows from the evidence, not merely whether each reported fact is accurate. Mechanical checks should verify what they can; semantic review must assess meaning and evidence adequacy. Implementation QA and independent Standards/Spec code review retain their own responsibilities under the [orchestrator review rules](SKILL.md#reviews--mandatory-skill-grounded-code-reading). Policy review verifies those obligations were met; it does not supply missing tests, select product intent, accept architecture for the human, invent additional policy or waive a requirement. Recommended separation is a reviewing agent distinct from the worker whose step is assessed; exact runtime identity and allocation belong to the supporting-state design.

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
   [work-artifacts](../work-artifacts/SKILL.md), whose result delivers the
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
