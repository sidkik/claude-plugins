# Evaluation contract

Use this contract before evaluating a model, agent, skill or prompt. Write the
general experiment contract first, inspect its governing sources and prerequisites,
then write the role profile and challenge inputs. Execution follows independent
preflight on exact bytes. An evaluation's deliverable is evidence and limitations;
model selection, installation and live qualification require their own authority.

## Define the experiment

Name the purpose and decision the observations could inform. Identify the unit as
model + exact skills/sources + prompt + tools/permissions + runtime/provider
configuration. Changing any component creates a separately identified condition.
Record actual model IDs, source revisions and byte hashes, client/executable and
runner identities, case version, environment selectors and allowed side effects.
An installed version and a source read do not prove native skill invocation.

Challenge design must identify provenance, exposure, source-session groups and
coverage. Use realistic short sequences, relevant instructions and both violations
and legitimate work. Natural excerpts may be fresh synthetic constructions; label
them truthfully rather than claiming unseen real-session holdout. Split actual
session data by source session, keeping related fragments together. Write hidden
expectations before execution: applicable rule, correct offending/support records,
first applicable step, allowed intervention, expected silence and correction state.
Future activity remains unavailable until its scheduled step.

Write observable success criteria and measures per challenge, including what would
falsify the desired behavior. Separate deterministic shape/reference checks from
independent semantic judgment. Record individual n/N, missing coverage and repeated
trial consistency. Repetitions start separate sessions; sequential steps resume
only their own session. Related prompts and repeated trials remain correlated;
a pooled percentage is not a reliability confidence interval.

## Effort and thinking are part of the unit

Freeze each condition as actual model ID + requested effort + thinking configuration,
as well as prompt/tools/runtime. Require explicit supported effort for a new effort
comparison; omitted effort is uncontrolled, not evidence of a default. Record client
resolved/effective effort only from runtime metadata, and server-effective effort
only from provider evidence. Unknowns stay null. Never infer effort from model
self-report, verbosity, thinking-token counts or presumed API defaults.

Inspect precedence before freeze: environment, session flags, active agent/skill
fields, saved settings, managed/organization caps and model/provider defaults may
interact. Reject or remove conflicting selectors in the disposable invocation,
record exact arguments/settings and repeat the same controls on resume. Pin thinking
mode separately from effort: these controls differ, and an API capability does not
prove that a client exposes it. Capture effective evidence when available and state
its scope (for example, client hook resolution is not server attestation).

Report each model+effort condition separately; do not pool costs or outcomes across
efforts. Label historical uncontrolled/unverified attempts without changing their
frozen evidence, scores or original identities. A corrected comparison is a new
identified experiment, not a reinterpretation of an earlier run.

## Perform each phase in order

Each row is a phase. Its four actions occur in the stated order. Observe means
inspect actual sources, inputs, tool results or behavior; an assertion by the author
or evaluated agent cannot satisfy it. Record unknown prerequisites as unknown.

| Phase | Write | Observe | Execute | Check / exit evidence |
| --- | --- | --- | --- | --- |
| General contract | Purpose, unit, scope, criteria, measures, resource bound, retention and promotion limits | Governing skills/process, existing tooling and prior scoped evidence | Resolve the contract against those sources; make corrections within authority | Every required field is explicit; conflicts and unknowns have dispositions before role design |
| Role profile and inputs | Role assertions, natural sequences, hidden rubric, provenance and step boundaries | Full applicable rules, complete raw dispatches/results and every input at each prefix | Materialize with the existing producer and inspect actual public records and candidate-visible paths | Assertions are supported, negatives otherwise compliant, rubric/future records hidden; no trials yet |
| Preflight and freeze | Independent review brief, immutable manifest, model/repeat/order/config parameters | Runner API, source parity, permissions/auth prerequisites and deliberately wrong grader examples | Independent assessor validates inputs/grader; prepare a new identified frozen plan | Exact contract/input/runtime hashes reviewed, all prerequisite concerns dispositioned, scheduled trial/step counts verified |
| Collection | Attempt identity, fixed schedule and stop rules | Recheck frozen bytes and actual runtime prerequisites immediately before start | Run each scheduled trial once, retaining incremental boundaries and all outcomes | Actual model/session/completion and public output files match each job; changed condition or infrastructure is separately classified |
| Adjudication | Anonymous label map held by coordinator, fixed semantic rubric and attributed response-bound judgments | Full public outputs and successful tool results at each scheduled boundary | Independent blind assessor grades all conditions on one scale; deterministic grader recomputes checks | Every scored judgment has exact response digest, evidence/rationale and required dimensions; ambiguous or missing evidence stays unknown |
| Synthesis and retention | Concise history: per-case outcomes, n/N, costs, source/run/response identities and gaps | Actual summaries versus judgments and underlying relevant results | Accountable owner reconciles disagreements and records scoped conclusions | Failures/invalid attempts retained, quality considered before cost, cleanup condition met or evidence explicitly retained; no automatic promotion |

Independent preflight is required before collection; this contract does not appoint
the author as its own assessor. Validate graders with reachable wrong references,
false correction, unjustified intervention, missing annotation and invalid input,
starting from valid bound evidence. Reuse inspected unchanged proof with its scope.
A tooling pass is not a behavioral observation.

## Blind, classify and stop

Keep expectations outside candidate tool scope. Use project-shaped excerpt paths,
organic work requests and no chain-eliciting self-report requests. The coordinator
alone keeps the anonymous label/model mapping. Judges see public text/tool events,
case rules and expectations, with model/cost/session-directory labels removed;
preserve record UUIDs, event order and successful Read content needed for grading.
Keep an exact original response digest beside each sanitized projection. Report any
residual model or experiment cues and their scope. Production-required instructions
remain visible; blinding cannot alter the subject's governing behavior.

Infrastructure errors (launch/auth/timeout/model or session mismatch) are separate
from behavioral failures. Successful execution starts unadjudicated. Source-backed
invalid input needs independent disposition, an exact case/run hash and explicit
excluded coverage/cost accounting; original trials and judgments remain evidence.
Corrected inputs get a new version/plan. Binding errors hold scoring. Never change
a rubric after seeing outcomes or silently remove a model failure.

Set trial count, maximum invocation duration and permitted side effects before the
first trial. Stop at the scheduled budget, a changed frozen identity, compromised
isolation, unavailable prerequisite or source-backed invalid condition. Preserve
partial outcomes; resume only under a disposition covering the affected action.
Behavioral failure remains a valid result, not a reason to retry until green.
No automatic budget extension or tuning is implied.

The existing runner continues to the next trial after an infrastructure error. The coordinator supervises emitted trial outcomes and retained results, stops dependent collection on an infrastructure or binding/isolation failure, and preserves partial outcomes for disposition. This is a supervised stop rule, not an automatic campaign abort.

## Retain and learn

Raw public transcripts, prompts and CLI logs are disposable but retained until all
scheduled outcomes are adjudicated, affected review is resolved and concise history
with recoverable identities is verified. Then the coordinator may remove disposable
raw artifacts; retain them with an owner/reason while any finding or judgment needs
review. Remove temporary credential copies when the campaign invocation ends, regardless of outcome; the existing runner cleans its disposable authentication config in the campaign-level finally block. Never commit credentials, hidden reasoning or raw production conversations.
Maintain aggregate usage, CLI-reported cost and latency with explicit unknowns and
billing caveats. Quality failures cannot be averaged away by cheap execution.

Learning can justify a separately authorized development change. Freeze a new
contract before evaluating it; retire any tuning-exposed holdout into development.
A pilot neither promotes a model nor qualifies native delivery. Existing failed,
superseded and invalid attempts keep their original dispositions.

## Research basis and local additions

Research only: pstack was fetched, not installed or natively invoked. The
[mirror eval playbook](https://github.com/backnotprop/pstack/blob/3a604672c46cd8187d2b19980eae0a34f9f91138/skills/poteto-mode/playbooks/eval.md)
and [arena skill](https://github.com/backnotprop/pstack/blob/3a604672c46cd8187d2b19980eae0a34f9f91138/skills/arena/SKILL.md)
were read at mirror revision `3a604672c46cd8187d2b19980eae0a34f9f91138`, alongside
the declared [upstream eval](https://github.com/cursor/plugins/blob/ccb5507cec1546dc88135c1139c811e6c59115ba/pstack/skills/poteto-mode/playbooks/eval.md)
and [upstream arena](https://github.com/cursor/plugins/blob/ccb5507cec1546dc88135c1139c811e6c59115ba/pstack/skills/arena/SKILL.md)
at `ccb5507cec1546dc88135c1139c811e6c59115ba`.

Adopted: criteria before execution, hidden rubric, natural tasks, anonymous common-
scale independent judging, full-output reading and transcript-backed verification.
Local additions: explicit write/observe/execute/check exits, immutable source/runtime
binding, incremental causal scope, repeat accounting, infrastructure/invalid-input
handling, durable concise history and promotion boundaries. We retain the existing
sequential runner; pstack's parallel fan-out, configured default models, grafting and
promotion flow are not adopted. Its absolute filename/prompt word ban is a research
ideal, not grounds to remove production-required instructions; profile preflight
must identify concrete residual cues. SDLC authority and review rules still govern.

## Recorded profile outcomes

The [Observer short profile](../../sdlc-process/tests/observer-short-profile.md) and
[pilot results](../../sdlc-process/tests/observer-short-results.md) apply this contract.
These post-run navigation links do not change its frozen criteria.

The [Observer effort profile](../../sdlc-process/tests/observer-effort-profile.md) and
[effort results](../../sdlc-process/tests/observer-effort-results.md) record the separately
controlled model+effort pilot; all qualification gates remain HOLD.


The [Observer revision profile](../../sdlc-process/tests/observer-revision-profile.md)
and [source-backed oracle audit](../../sdlc-process/tests/observer-revision-audit.md)
separate corrected evaluation assumptions from candidate prompt behavior. Original
outcomes remain frozen. The [revision results](../../sdlc-process/tests/observer-revision-results.md)
record the completed, independently cleared low/low experiment and versioned
reanalysis; mixed behavior keeps the candidate experimental and production unchanged.
