---
id: orchestration-governed-context-spec
type: spec
status: draft
owner: planning
representation: snapshot
source_repository: sidkik/core
migration_status: transferred
canonical: https://github.com/sidkik/planning/blob/main/docs/work/agent-orchestration/workstreams/context/governed-context.spec.md
initiative: https://github.com/sidkik/core/issues/507
migrated_from: docs/work/agent-orchestration/knowledge-foundation.md
work_item: https://github.com/sidkik/core/issues/512
source_revision: 56283b026a0c02b4c7ee63eecf59e6945e969e27
captured_at: 2026-10-07T19:58:36Z
---

# Agent knowledge and artifact governance foundation

Current process input: the [operating-process draft](../../process/orchestration.process.md) has been reconciled with accepted September 10 direction. Earlier process hashes in evidence refer to the [historical snapshot — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-08ca39189ec6), not a validation of the new draft. The assessment contracts below remain draft where no scoped decision has accepted them. The supporting-state owner’s [Bernstein return](https://github.com/sidkik/core/issues/516#issuecomment-5623035755) remains historical input. [Current direction](https://github.com/sidkik/core/issues/516) is a separate supporting-system build definition informed by reusable product lessons; the integrated Bernstein POC remains held.


Proposal begun 2026-09-06; readiness-gate preparation extended 2026-09-09. Optimize for agents consuming and maintaining knowledge across sessions, repositories and machines. This defines proposed context-service behavior used by the [orchestration process](../../process/orchestration.process.md). The [primary handoff — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-b2f5fcbd4e4b) links the completed OpenViking POC and its bounded evidence; the dated candidate investigations below do not reopen that POC. A Sidkik readiness evaluator is still proposed, not a capability demonstrated by retrieval success.

## Intended outcome

An agent starting wayfinding can ask for the applicable architecture, terminology, contracts, prior decisions, current work, available execution resources and relevant skills. The response identifies authoritative versions, evidence, conflicts, freshness and missing coverage. An agent submitting a spec receives a machine-readable assessment of missing or invalid artifacts, plus review findings that require judgment.

Markdown may remain a useful authoring format, but paths and full-text file hunting should not be the discovery contract. Build one logical knowledge service over source-owned records. Search indexes and summaries are rebuildable projections; accepted requirements and approval evidence retain their canonical sources.

## Organize by entities, artifact types and authority

The useful objects are domains, services, APIs/contracts, repositories, teams, work items, decisions, skills, evidence and execution resources. Give each a stable identifier and typed relationships, such as `governed-by`, `provides-api`, `consumes-api`, `implements`, `verified-by`, `supersedes`, `affects` and `blocked-by`. These relations do not require a dedicated graph database initially.

| Information | Canonical source proposal | Agent use |
| --- | --- | --- |
| Shared standards and control definitions | One designated organization-owned versioned source | Governing requirements and applicable skills |
| Domain architecture, ADRs and vocabulary | Owning repository, tied to domain/entity IDs | Ownership and design constraints |
| API/code structure | Protobuf/code at exact repository revisions; generated analysis | Actual interfaces and candidate impact |
| Intake, workflow, intended scope and durable work results | GitHub parent/child issues and their review/decision records | GitHub is the core work system of record; labels and records have process-defined meaning and do not alone grant execution authority |
| Current execution state | Orchestration-owned durable work/attempt/transition records and allocation-owner records; manual operation retains explicit receipts on the owning work record until these services exist | Current progress, waits, conditional advances and allocation claims, rechecked at the authoritative owner when an action depends on them |
| Specs | One declared source per spec; immutable snapshot when approved/dispatched | Acceptance contract; never two competing editable copies |
| Spikes, scenarios, reviews and builds | Versioned reports plus immutable private artifacts | Reproducible evidence and limitations |
| External knowledge | Original publisher URL/version, retrieval date and cited evidence | Provider facts, with source-specific revalidation |
| Agent memories and session notes | Separate experiential records with run/source references | Leads and lessons awaiting verification or promotion |
| Workspace templates and runtime availability | Versioned templates plus timestamped observations from the runtime owner | Environment needs, leases/capacity and availability |

Keep three distinctions explicit: what was approved, what the code currently does, and what was observed in a particular environment. They can disagree. Surface the disagreement instead of deciding that the newest passage or highest search score wins. Historical design rationale remains retrievable as history; a superseded policy does not govern new work.

Current core already has [a context map — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-db5cdc66533a), [domain terminology — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-91ed8d600d86), [accepted ADRs — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-d44f3103174b) and [generated skill synchronization — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-2202d019ddd6). These are inputs to register rather than recreate. Inspection found no project CODEOWNERS file in the searched roots, and the inspected PR/check-in workflows focus on test evidence. This is a bounded observation, not a complete governance audit or verification of hosted repository rules.

## Artifact metadata and lifecycle

Use the [work-artifacts skill](../../../../../.claude/skills/work-artifacts/SKILL.md) for the canonical document fields and lifecycle. The proposed service additionally needs applicability/entity links, audience/classification, source revision/digest, ingestion watermarks and substantive verification dates. Readiness findings such as needs-review remain assessments against a revision, not a rewrite of its history. The service must resolve approval evidence from trusted records and preserve source ownership across projections.

## Readiness and ownership

This is a planning-owned draft for Sidkik's governed-context integration, not the OpenViking product POC's implementation spec. The [OpenViking owner — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-2f362d13c4c7) controls its current package, infrastructure and experiment records. Concrete API seams, quantitative bounds and criterion IDs for a delivery block remain to be settled before this proposal can be dispatched.

## Agent interface

Proposed small read-oriented API/MCP surface:

- `context_for_work`: assemble governing records and evidence for a work item and declared scope.
- `search_knowledge`: bounded lexical/semantic discovery filtered by type, applicability and audience.
- `read_artifact`: retrieve an exact source revision or section with provenance.
- `related_entities`: traverse typed dependencies with source and coverage information.
- `work_affecting`: retrieve current work for the same contracts/domains from the work tracker.
- `assess_readiness`: return control results and unresolved review requirements for a candidate spec revision.

These names are interface sketches, not implemented tools. The service derives reader identity from authentication. Discovery across the ecosystem may require broad read permission; that does not grant implementation authority outside approved scope.

Return compact structure first: artifact IDs, kind, status, source/version, relevant excerpts, applicable controls, conflicts, missing evidence and source-sync watermarks. Fetch more detail on demand. Include required policies through explicit applicability rules, not only top-ranked similarity matches. If required context cannot fit, paginate or declare incompleteness; silently dropping a governing rule is unacceptable.

Search should combine exact identifiers, structured filters, relationship traversal and semantic relevance where it helps. Protobuf names/error codes need exact lookup. Inferred code edges are candidates with provenance, not proof of complete RPC/event/Temporal impact. Current issue state and runtime leases need direct freshness checks when dispatch depends on them; absence from an old index is not proof no other work exists.

A context packet records which source, skill and policy revisions informed a decision. It should be reproducible and support invalidation when those dependencies change. Raw third-party text and session memories are evidence inputs, not executable instructions or approved skills.

### Minimum work-context packet

This section refines the proposed agent-facing response shape; it does not add another canonical spec or grant admission authority to retrieval. Field names remain logical concepts pending the selected protobuf/API contract. The [work-state record — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-8071b72b6564) owns the admission, readiness, dispatch and advance decisions that consume this context.

| Response part | Required meaning for the receiving agent |
| --- | --- |
| Work and scope | Stable work/parent identity, work kind, requested action and exact governing contract/scope revisions. Reference the existing admission/decision record; do not infer an admission from a work title. |
| Governing sources | Applicable artifact IDs, canonical locators, exact revisions/digests, source type and approved/draft/historical standing with the trusted receipt where applicable. Distinguish intended behavior, current implementation and observed evidence. |
| Applicability and coverage | Why each governing rule applies; which required source families were assessed; source-specific synchronization/observation markers; bounded omissions and missing coverage. A successful search is not proof that all governing context was found. Disclose absence/denial details only to an audience authorized to see them. |
| Skills | Selected approved skill identities/revisions, the work condition that triggers each and its expected output. A skill's presence or a statement that it was read is not proof its workflow or checks were performed. Refer to actual output evidence when claiming invocation completion. |
| Criteria and proof | Criterion IDs and expected-result sources, available evidence references with tested revisions/boundaries, and required observations still missing. The packet can establish that a red was observed without claiming green, full QA or independent review. |
| Findings and next resolution | Conflict or gap ID, affected criterion/action/revision, pass/fail/unknown assessment where justified, accountable resolver, and the smallest observable resolution. Distinguish a product decision, missing fact, bounded feasibility question and allowed implementation choice. |
| Current execution references | Links to the authoritative work/attempt/allocation observations needed for the requested action, with their source versions and freshness limits. The receiving coordinator rechecks them at dispatch; a cached context response neither reserves resources nor extends a grant. |

The response is incrementally readable: return identities, coverage and blocking findings first, then exact source content on authorized request. An agent can request the missing part without repeating unrestricted repository discovery. Required context exceeding response bounds stays visibly incomplete; pagination is not an excuse to mark a partly evaluated packet ready.

### Assessment report versus permission to advance

`assess_readiness` returns a revision-bound report against the [seven process controls](../../process/orchestration.process.md#readiness-and-start-rules). It identifies which results are structural/policy checks and which depend on semantic review. A candidate report cannot approve its own governing sources or create the trusted receipt it cites. The authoritative transition owner separately evaluates the report, applicable authority and current work version before recording readiness or an advance.

### Human decision on proposed architecture

The [user's architecture-review direction](https://github.com/sidkik/core/issues/514#issuecomment-5608339950) requires agents to present a concrete proposed architecture and obtain the user's acceptance, rejection or requested revision. The proposal includes the problem and constraints, recommended design, alternatives/tradeoffs, affected contracts, material feasibility evidence and unresolved limitations. Agent critique can improve the proposal; it does not accept the architecture on the user's behalf.

The accepted decision identifies the proposal revision and any conditions. Dependent work cannot pass architectural readiness while that decision is absent or its conditions unresolved. Accepted parent intent alone is not approval of a proposed architecture. Reuse existing accepted architecture; clarify the boundary between applying established patterns and introducing architectural decisions through the owning scope decision. The policy-agent checkpoint below verifies this decision before dependent advancement.

### Proposed readiness gate: producers, outputs and assessment

The workflow mapping identifies the producers and recipients of readiness inputs; the control matrix follows under [Readiness controls](#readiness-controls).

### Workflow handoffs: producers, durable records and recipients

This draft mapping connects the context packet to the feature and bug workflows. It specifies what each receiving role needs; linked process/decision sources retain ownership of the obligations. The rows are logical checkpoints, not a new GitHub status list or implemented state machine. Refinement, architecture and specification can iterate, and already applicable decisions are reused. Only the next bounded implementation block needs complete readiness, not the entire parent feature.

The [accepted planning-repository convention](../../process/planning-repository.process.md) owns document publication, branches, commit references and writer handoff. In the intended workflow, the issue is the entry point to the current proposal, accepted source revisions and decision/review records. The first six primary-owned process/package drafts now live in the shared planning repository under the [completed cutover receipt](https://github.com/sidkik/core/issues/517#issuecomment-5625801674); other owners retain unmigrated records. Existing issue-owned repair briefs remain valid where sufficient. GitHub durable records convey the work; supplemental live attempt/wait/ownership state is the separate supporting-state assignment. OpenViking can discover and retrieve sources but cannot supply missing authority or determine current ownership.

Before each proposed advancement, a policy agent assesses the applicable history, sources and evidence as specified in [policy checkpoints](#policy-agent-checkpoints-across-the-process). Missing required review/evidence holds the affected advance. A policy pass establishes compliance for that action; it does not substitute for a human decision, author implementation evidence or allocate capacity. Each handoff identifies source revisions, phase/action, findings, accountable resolver and next step. A new accountable session acknowledges the actual handoff; helpers report to their owner.

| Checkpoint and producing role | Durable output and where the recipient finds it | Receiving role and condition for advancement |
| --- | --- | --- |
| Intake: triage/coordinator | GitHub request with actor/problem, observed or desired behavior, work kind, relevant existing intent and ownership. Ambiguity is recorded as a question. | Refinement or diagnosis receives the classified request. A reporter need not provide a complete specification or reproduction. Intake alone grants no implementation readiness. |
| Feature refinement: accountable planning session with the human | Intent/scope and acceptance examples in the owning planning record, with human decisions linked from the work issue. Research, prototype or spike records answer bounded material unknowns where needed. | Architecture/specification preparation receives the accepted intent, constraints and unresolved findings. A technical suggestion is not an approved architectural decision. |
| Proposed architecture: planning/architecture owner with relevant specialist input | A reviewable proposal, alternatives/tradeoffs, affected contracts/consumers, evidence and limitations at a named planning revision. | The human accepts, rejects or requests revision. Architecture-dependent readiness consumes that exact decision and its conditions. Reuse already accepted architecture; internal implementation choices remain within delegated authority. |
| Feature specification and delivery preparation: planning owner | Applicable behavior spec, verification approach, safe delivery blocks and real dependencies. The issue links the document revisions; child issues reference the applicable contract/criterion subset. | Required human agreement on verification boundaries and delivery breakdown is captured or reused. Agent assessment verifies the packet supports the agreed scope. The accepted combined preparation review below groups these human checks; architecture acceptance is not silently inferred from this review. |
| Bug diagnosis and repair preparation: investigator/coordinator | Accepted expected behavior, occurrence evidence, focused reproduction/red result and bounded repair/verification brief in the issue or linked record. Distinguish observed occurrence, suspected cause and reproducibility. | Coordinator uses standing regression authority for a qualifying repair. A confirmed defect that cannot be reproduced requires the already-agreed human decision on a specific alternative verification plan. Changed intended behavior or newly proposed architecture returns the affected decision to the human. Routine repair does not acquire the feature-document sequence. |
| Readiness assessment: context/assessing role and accountable coordinator | Revision-bound results for the applicable [readiness controls](#readiness-controls), source/decision references and disposition of required findings. | Coordinator records Ready only when the contract and applicable authority are sufficient. Publishing documents, creating child issues and skill-generated labels do not establish Ready. |
| Selection and start: authorized coordinator | GitHub work order/dependencies and accepted contract references, plus a dispatch record identifying the work attempt, accountable implementer, actual code repository, input revisions, resource allocation and escalation route. | Implementer acknowledges the dispatch and validates applicable inputs. Start requires current authorization, completed blockers and available allocated resources in addition to Ready. Use the accepted native ordering and skip rules; reordering does not change in-flight work. |
| Implementation and QA: implementer, with its own helpers | Code change and criterion-linked red/green or approved alternative-verification evidence, build and required live happy/negative/boundary QA at identified code/environment revisions. Return through the owning implementation issue/PR. | Independent Standards/Spec reviewers receive the fixed comparison base, tested revision, contract and evidence. Missing required QA stays with the implementer; submitting a PR does not transfer that responsibility. |
| Independent review and integration: reviewers, implementer and integration owner | Findings/dispositions, corrected implementation and affected verification, plus checks/evidence applicable to the integrated revision. | Completion is reviewed, validated, deployable main. Changes introduced by concurrent integration require affected reassessment; prior green evidence is not automatically applicable to a different result. Detailed concurrency rules remain with the trunk-integration decision. |
| Release handoff: completed implementation owner to release management | Integrated source/build identity, deployment/activation/migration/recovery notes and acceptance/review evidence, linked from the completed work. | The human retains release timing and promotion. A queued or completed implementation is not an automatic production deployment, and deployment is not added to the implementation-completion gate. |

#### Accepted combined preparation review

[User decision, 2026-09-10](https://github.com/sidkik/core/issues/512#issuecomment-5624888589): after the applicable human architecture decision, present one review packet containing the specification and acceptance criteria, verification plan, and delivery breakdown with independently deliverable tickets, dependencies and proposed order. Agents review first and surface unresolved findings. The human can accept or request changes to each part in one conversation; record exact accepted revisions. Changes affecting an accepted part trigger review of that affected part. Reuse applicable prior approvals. Small work need not have multiple tickets, and qualifying bugs keep their agreed shorter preparation path.

This resolves the presentation of `to-spec` verification-boundary and `to-tickets` breakdown reviews. It does not approve a particular packet, grant new authority, establish readiness or dispatch work. The overall process and other proposed controls remain draft.

#### Walkthroughs of the connected packet

- **Feature with a Core contract and Web Platform consumer:** the planning owner publishes one proposal and records the human architecture decision. The specification and delivery plan identify each repository's contract obligations and blocking edges. Each implementation issue receives the same applicable accepted planning revision and its own criteria; one child does not infer the other's completion from a shared parent label. This is a cross-repository process example, not expansion of the current core-only POC acceptance scope.
- **Invitation refusal regression:** diagnosis establishes the accepted invitation behavior and defect evidence. The repair receives its focused red check or a specifically human-approved alternative verification plan, relevant context and environment needs. It converges at the common readiness/start gates without demanding a new feature architecture proposal for an unchanged accepted design. Its implementer still owns complete relevant QA before independent review.
- **Planning convention accepted during this initiative:** acceptance settles the document/branch/handoff decision. The accountable session records that decision and continues the remaining process plan. The user later separately authorized creating and using the repository now to review the process. The document-organization item owns this scoped setup and coordinated migration; approval of the convention alone was not that authorization. Supporting-system implementation still requires its own readiness and authority.

### Readiness controls

The two existing intake routes remain distinct. The [process's bug-intake contract](../../process/orchestration.process.md#bug-intake-establish-the-defect-then-preserve-redgreen) governs defect evidence and regression admission; the matrix below does not replace it with feature discovery.

| Intake route | Preparation before implementation readiness |
| --- | --- |
| New feature or changed intended behavior | Establish accepted intent, refine behavior, present proposed architecture for the user's decision, resolve material unknowns, synthesize the applicable spec and split delivery work only when needed. Reuse already accepted architecture where applicable. |
| Bug restoring accepted behavior | Triage and investigate the observed violation; retain accepted expectation, occurrence evidence and a focused reproduction/red check; define the bounded repair, relevant impacts and verification/environment needs in the existing issue or repair brief. Reuse applicable context and standing regression authority. A routine repair does not require a new feature spec, Wayfinder map or ticket decomposition. |

For a confirmed defect that bounded diagnosis cannot reproduce, preserve the already-accepted human approval requirement for a specific alternative verification plan. A report awaiting confirmation remains investigation work; the reporter is not required to write the reproduction. If proposed repair changes intended behavior or creates obligations outside accepted scope, route those choices through refinement and the applicable human authority. Both routes retain implementer-owned build/full applicable live QA, independent code review and deployable-main completion after implementation starts.

This matrix makes the existing seven controls assessable for the next bounded implementation block. It remains a draft elaboration, not blanket acceptance of every control detail. Logical records can be sections of the owning GitHub issue and linked canonical artifacts; seven checks do not require seven documents. Use the [process's actual skill routing](../../process/orchestration.process.md#select-the-skill-flow-from-the-actual-situation), subject to subsequent user decisions. Preparation is performed by the accountable refinement session and its helpers; a policy agent reviews compliance before the coordinator records the next work disposition. The requirement applies across the process, as defined below.

| Existing control | Producing step and applicable skills | Required output before Ready | What assessment establishes |
| --- | --- | --- | --- |
| 1. Intent and authority | Intake/triage; refinement under established parent delegation | Owning issue, accepted behavior/outcome, exclusions and the actual admission/delegation source | References resolve to the applicable scope; the proposed work restores or delivers that intent. An AI-authored brief alone is not an authority receipt. |
| 2. Observable behavior | Refinement through grilling/Wayfinder as needed; `to-spec` synthesizes resolved choices | Criterion IDs, actors/preconditions/triggers, observable outcomes, applicable failure/boundary cases and public verification seams | Independent implementations cannot choose contradictory user-visible behavior and both comply. Expected results follow accepted intent rather than the author's invented oracle. |
| 3. Architecture and affected contracts | Targeted code/context exploration; architecture proposal and human decision where architecture is proposed or changed | Affected interfaces/consumers, relevant constraints, the applicable accepted architecture revision and human decision, compatibility approach and any outside-parent disposition | Agent assessment cannot approve proposed architecture. The applicable human decision and conditions must be satisfied; unapproved behavior changes and unresolved affected consumers block the relevant work. Final changed-code compatibility evidence comes later. |
| 4. Feasibility | Targeted research, interaction prototype or realistic technical spike when warranted | Each material unknown has supporting evidence, a decision, an explicit exclusion or a bounded follow-up owner | No unresolved feasibility question can invalidate this block's acceptance, permissions or integration. Library docs or mock results cannot prove a claim requiring a real dependency. Internal implementation choices remain available to the implementer. |
| 5. Verification and environment viability | Verification planning using test/scenario and environment skills where applicable | Criterion-to-observation plan, relevant fixtures/tools, and evidence for an existing usable or demonstrated provisioning path | Required checks can actually be performed under the declared execution model. A currently unavailable slot can delay a ready item; an unproven required environment capability blocks readiness. |
| 6. Safe delivery block | Architecture/refinement and `to-tickets` when decomposition is needed | Child criterion scope, true dependency edges, safe intermediate main behavior and applicable compatibility/configuration/migration/activation/recovery notes | This block can integrate safely with its declared prerequisites. Later blocks need not be fully designed, but unspecified later work cannot be required to make this block safe. Actual dependency completion is rechecked at start. |
| 7. Current packet and findings | Assemble the context manifest and selected skill outputs; structural/policy checks plus semantic review | Exact governing revisions, actual preparation outputs, assessment findings and their disposition, and any existing authorized scoped exception | Required records are present and applicable to the assessed revision. Merely naming or reading a skill does not prove its output. Required fail/unknown findings prevent Ready. |

Each control result records `pass`, `fail` or `unknown`, the assessed work/contract revision, evidence references, the assessor and rationale. A failed or unknown required check identifies its smallest corrective action, accountable resolver and observable resume condition. Subsequent evidence reassesses the affected controls and dependent assumptions; unchanged applicable evidence is reused. The context service supplies the report; the authorized coordinator records readiness against its revision. Neither the author nor the assessor can invent an approval source or waive a control outside delegated authority.

Readiness consumes the preparation artifacts above. Feature implementation's passing tests, build, live QA and independent code review are later results, produced by the established delivery process. A regression additionally carries the existing reproduction/red evidence or the already-defined specifically approved alternative-verification plan. A spike has its own learning contract and need not pass the implementation gate for the feature it investigates.

Completed POCs are cited only where their tested conditions establish a required capability. There is no blanket requirement to finish every supporting-system POC before any work can be Ready. Conversely, naming a proposed future system is not a viable execution path when the block depends on a capability that has not been established. The supporting-state session owns the technical realization of assessment/transition/report interfaces; it does not redefine these process obligations.

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
Reconcile changed inputs and reassess affected controls. Routine posting of
investigation findings, corrected hypotheses, receipts or previously assessed results within the authorized step does not require a publication assessment.
Posting to GitHub alone creates no checkpoint. Assess the substantive action when
findings are used to advance work, change an applicable control or clear a policy hold.
Use one compact result in the existing issue/PR; apply the work-artifacts retention
rule rather than committing the review's working history.

**Review inputs.** Identify the current step and proposed next step, work/attempt where one exists, accountable actor, applicable policy and skill revisions, accepted human decisions, source/artifact revisions, prior checkpoint results, intervening actions and evidence, and unresolved findings. Separate accepted human intent and scope decisions from author claims about the implementation, evidence or correction. The decisions govern the review; an accepted brief or implementation freedom is not proof that the implementation or proposed approach is correct. Treat an assertion that a finding is fixed as a claim to falsify. The reviewer reads the underlying relevant history and outputs; the author's latest summary or checklist is insufficient. Missing history coverage stays explicit. Apply policy appropriate to the actual step: proposing architecture requires a reviewable proposal, while advancing work dependent on that architecture requires the user's decision. A paused feature can still perform the authorized investigation needed to resolve its finding.

**Review responsibility.** A policy agent checks whether required steps actually occurred in the applicable order, whether their outputs support the proposed advance, and whether authority and prior decisions were preserved. For bug work, apply the process's current-behavior and already-fixed routes: challenge a proposed repair unsupported by a current defect, and require a stated material gap for additional environment or replay requirements. Assess whether the next action follows from the evidence, not merely whether each reported fact is accurate. Mechanical checks should verify what they can; semantic review must assess meaning and evidence adequacy. Implementation QA and independent Standards/Spec code review retain their own responsibilities under the [orchestrator review rules](../../../../../.claude/skills/orchestrator/SKILL.md#reviews--mandatory-skill-grounded-code-reading). Policy review verifies those obligations were met; it does not supply missing tests, select product intent, accept architecture for the human, invent additional policy or waive a requirement. Recommended separation is a reviewing agent distinct from the worker whose step is assessed; exact runtime identity and allocation belong to the supporting-state design.

**Advisory observers.** A native observer can report a suspected departure during the accountable session's work. Treat the report as a prompt to inspect its governing source and underlying evidence, then correct a supported finding within current authority. It is not human consent, a new approval requirement, or a substitute for the independent revision-bound checkpoint assessment. An observer cannot grant permission to change configuration or policy. A report lacking a digest or visible history identifies a coverage gap; it does not establish that an earlier required action never occurred. Retrieve the relevant history before making that claim, and retain a required unknown only where unavailable proof is required for the proposed action. A correction that resolves an actual policy hold still follows reassessment below. A delivered observer message demonstrates notification, not acceptance or course correction; those require the receiving session's observed actions.

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

## Compliance and review

Assume internal engineering controls for the initial proposal; no named external compliance framework has been selected. Model each control with an ID, scope/applicability, required artifact/evidence, evaluator, severity, review authority and exception policy. This lets an agent query exactly what is missing.

Three complementary checks:

1. Structural validation: artifact registration, valid metadata, resolvable references, source hashes, required sections, acceptance IDs and source links.
2. Policy evaluation: required artifacts by work type, applicable skill versions, approval evidence at the candidate revision, current dependencies, evidence coverage and explicit exceptions.
3. Semantic review: does the spec solve the accepted problem, contradict an ADR, miss an affected consumer, or assert evidence that does not prove its criterion?

Schema checks cannot judge architectural adequacy. An LLM reviewer cannot establish approval by asserting that a document looks complete. Record findings and dispositions against the reviewed revision; feed mechanical failures and unresolved required findings into the readiness gate.

Conftest/OPA can evaluate normalized JSON/YAML facts with testable rules. Extract Markdown frontmatter/sections into a validated representation first; do not assume a configuration-policy engine understands free-form prose. Begin with a small validator if enough; introduce Rego when shared rules justify it. [Conftest](https://www.conftest.dev/), [OPA policy testing](https://www.openpolicyagent.org/docs/policy-testing)

GitHub can enforce required checks and configured reviewer requirements, including handling stale approvals. Verify enabled rules and identities in the actual repository; CODEOWNERS alone does not enforce review, and one of several listed owners may satisfy its default requirement. Custom multi-owner/domain approval needs explicit policy. Keep checks protected from edits that would let a candidate approve itself. [Code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

Examples of useful failures: a feature spec lacks negative-path criteria; an ADR reference is superseded; evidence tested an older acceptance revision; a claimed approval has no matching trusted receipt; a protobuf change has no affected-consumer disposition. An exception needs an authorized owner, rationale, scope and any expiry; it is not a free-form waiver written by the implementing agent.

## Staying current across teams and machines

Use source-change ingestion plus periodic reconciliation. Ingestion records the upstream revision, validates metadata, indexes only the permitted content, updates relationships and signals affected owners/work. One owner maintains the canonical content; the platform maintains schemas, ingestion and retrieval contracts. Each active work item has an accountable owner for its artifact set.

Automatic extraction should maintain facts that can be derived reliably: source locations, contract symbols, references and work status. Agents can propose documentation changes when code and descriptions diverge. Review retains responsibility for rationale, intended behavior, exceptions and accepted architecture. This reduces manual duplication while preventing automatic inference from becoming policy.

Shared services provide durable metadata and content/artifact storage, incremental indexing and authenticated retrieval. Per-agent local caches remain disposable and revision-keyed. Redis may carry ingestion work and invalidation notifications with durable recovery. Reserve Temporal for processes needing durable waits or multi-step recovery; no workflow per document chunk or embedding is required.

Access enforcement covers search snippets, titles, full text, graph neighbors, cached summaries and assets. Apply source access changes to indexes and cached responses under a defined bound; recheck authorization on final reads. Separate source deletion from lawful historical evidence retention according to the chosen policy. Never index provider tokens or workspace secrets as knowledge resources.

Resource discovery should distinguish declared capability from current availability: a Tilt template describes supported isolation; a runtime observation describes an actual workspace and expiry; the scheduler owns claims/capacity. A knowledge result never reserves a resource or proves a native provider has remaining allowance.

<a id="agent-oriented-candidate-evaluation"></a>

## Historical agent-oriented candidate evaluation — 2026-09-06

Compare agent context and retrieval components directly. Neither MCP availability nor an agent marketing label proves provenance, current permissions or approval controls.

User direction, 2026-09-06: prioritize enterprise readiness and richer shared context over a lightweight implementation; use OpenViking unmodified. OpenViking is now the recommended lead candidate for qualification. Production suitability remains untested; the earlier lean-first ranking is superseded.

| Candidate | Why evaluate it | Required proof / position |
| --- | --- | --- |
| [QMD — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-fad3ed39cc09) | Agent-oriented structured document retrieval, local search models, MCP | Optional retrieval benchmark or fallback; no longer the first-choice foundation given the user's richer-context priority. |
| [GrepAI — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-d7dbaddb8686) | Native agent code-search tools, compact results and Go/TypeScript call tracing | Complement for code discovery; isolate worktree indexes and verify graph omissions, especially generated protobuf, events and Temporal. |
| [OpenViking — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-75f384b5554c) | Shared resources/memory/skills, tiered context and native agent interfaces | Lead candidate, deployed unmodified behind a Sidkik integration boundary. Qualify concurrency/recovery, exact provenance, protected ACL configuration and suppression of unapproved memory/skill promotion. |

QMD and GrepAI have MIT licenses in inspected sources. OpenViking's pinned main source is AGPLv3 despite an Apache-2.0 footer on its documentation. Its documentation/source also contain configuration differences that make version-pinned tests necessary. These observations are in the linked reports; no blanket deployment permission or security guarantee is inferred.

Sourcebot has relevant remote code/MCP interfaces, but current MCP is paid and the main distribution is FSL source-available. GitNexus has relevant agent graph tooling but a current PolyForm Noncommercial license. Keep them as conditional comparisons, not assumed free/open-source commercial foundations. Their licenses and feature boundaries are cited in the code-discovery investigation.

The earlier [catalog comparison — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-4e04accbaa6d) and [enterprise-search comparison — source locator](https://github.com/sidkik/planning/blob/56283b026a0c02b4c7ee63eecf59e6945e969e27/docs/work/agent-orchestration/items/core-gh-517-document-organization/source-navigation.research.md#source-e4db6d193e05) are background. The user's explicit agent-first preference supersedes a portal-led selection: BookStack and Open WebUI are not finalists for the foundation. Backstage may later supply entity metadata if needed; human navigation is not the acceptance criterion. Source code availability and community/enterprise entitlements must be checked separately for every candidate.

No subscription is assumed to pay for embedding, reranking, query expansion, OCR or automatic memory-extraction APIs. Use local models or avoid those stages, then measure quality, resource consumption and outbound inference. An advertised OAuth adapter is not proof a provider authorizes subscription reuse in that backend.

The root session read the five research reports in full and independently opened key primary documentation/source/license references. Results remain desk research. No software was installed and no quality, cost, concurrency, access-revocation or freshness guarantee was measured.

## Acceptance targets and incremental adoption

The eventual integration proof should answer: can a fresh agent receive the right approved context, with source fidelity and bounded freshness, and can a readiness evaluator reject an intentionally incomplete spec?

Use a small cross-repo corpus: one core domain and its web contract consumer, a governing ADR, a superseded decision, a conflicting draft, one active work item, a scenario report and relevant skills. Test OpenViking with exact-symbol and conceptual questions; a lean retrieval benchmark is optional. Operate the upstream service through supported APIs/configuration and keep Sidkik's approval, source-manifest and agent-delegation controls in its own integration service.

Set the operational acceptance contract before this spike: expected concurrent agents and writers, availability, recovery point/time objectives, revocation delay and upgrade/rollback requirements. OpenViking documents multi-instance deployment and backup replication, but its multi-write storage limitations explicitly identify missing distributed metadata locking for concurrent processes writing the same primary backend. Do not infer safe active-active Kubernetes operation from replication or a Helm chart. Prove the chosen topology with interrupted ingestion, pod loss, restoration and upgrade scenarios. [Deployment](https://docs.openviking.ai/en/guides/03-deployment), [multi-write limitations](https://docs.openviking.ai/en/concepts/14-multi-write-storage)

Success must demonstrate required-rule recall; correct distinction between approved/draft/historical claims; source-version fidelity; visible missing/conflicting information; update/deletion/revocation behavior; bounded response size; independently maintained shared access from two sessions; and a machine-readable rejection for missing/stale evidence. Test that a proposed memory cannot promote itself into an approved skill. Record latency, indexing lag, resource use and zero paid inference calls under the chosen configuration. Choose numerical thresholds before execution.

Use qualification evidence to select the integration boundary and implement the smallest artifact schema, source adapters, read API and readiness controls. Register the existing canonical architecture and one active feature first. For `docs/work`, classify records as active work, reusable evidence or historical scratch; promote verified knowledge through review and preserve links. A bulk file move or blanket ingestion of every note would not establish the required authority model.

After selection, this becomes an additional gate in the process: accepted intent → context packet and gaps → targeted decisions/spikes → spec and control assessment → approved handoff with pinned evidence. The current shared Markdown session registry remains a manual bridge until the shared work/context services exist.
