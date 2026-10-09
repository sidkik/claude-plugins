# Reproducible observer evaluation

This is maintained test tooling for the existing observer, not a new observer
architecture. Use it before changing observer prompts or recommending Haiku versus
Sonnet. Quality comes first; compare cost only after applicable quality gates.
The runnable contract is `observer-evaluation-cases.json`, the offline grader and
CLI runner are `observer-evaluation.mjs`, and concise historical observations live
in `observer-evaluation-history.json`. Raw CLI logs and session transcripts remain
disposable. Do not commit authentication or raw production sessions.

## Freeze, validate, run, adjudicate

1. Review the case rubrics and split before running. Independently validate the
   contract/grader against deliberately wrong outputs, including plausible markers
   with wrong UUIDs and false verified corrections. Tests do not replace that
   independent review. Review affected changes on their exact final bytes before
   freezing a campaign; retain earlier findings and their dispositions in history.
2. Prepare a fresh plan for each split. The plan fixes source bytes/hashes, exact
   rendered agent body, per-step prompts and transcript prefixes, case version,
   hashed provider/runtime environment selectors, requested full model IDs, Claude/Node versions, executable and runner hashes, repeats, order,
   session IDs, and quality thresholds before execution. Source HEAD alone cannot
   describe an uncommitted candidate; the per-file hashes identify it. A digest
   detects change; it does not authenticate approval. Preserve the plan externally
   while adjudication needs it. Record the plan digest in maintained history.
3. Run each planned trial once. Trials use independent Claude sessions, disposable
   authentication/config, only Read within the trial's frozen input tree (a disposable PreToolUse guard
   checks real paths and denies outside/symlink reads; a guard launch failure
   exits 2 to block the Read), no MCP,
   no inherited settings sources and no native observer activation. The explicit
   per-trial settings contain only that evaluation Read guard. Subsequent activity
   resumes the same trial session. The actual transcript grows only to that
   scheduled boundary: future activity and hidden acceptance never enter Read
   scope. The fixture/rubric, agents manifest and raw response are outside that
   scope. Steps preserve ordinary observer context rather than resetting it.
   The final future prefix is removed after preparation. Source-session splitting
   also prevents adjacent fragments being presented as independent held-out data.
4. Preserve every outcome. A nonzero CLI exit, timeout, missing completion or
   actual model/session mismatch is an infrastructure error, distinct from a behavioral
   failure. Successful execution remains **unadjudicated**, even with every
   mechanical check green. The runner refuses a second execution of a plan.
   Resolve infrastructure, then create a new identified plan; retain old attempts.
   Never rerun behavior until it happens to pass. Smoke mode executes one step of
   one trial, which cannot qualify a campaign.
5. An independent assessor reads each public response/tool result against the
   frozen case rubric. Keep model identity/cost hidden during semantic judgment
   when feasible. Record exact response digest, attributed assessor, concise
   rationale and seven boolean dimensions. A false dimension fails the step;
   unknown/missing judgment holds the gate. A source-backed rubric defect gets
   explicit disposition and a new case version, not an overwritten expectation.
6. Summarize separately by model and split. Append concise results to maintained
   history, including failures, n/N, repeat consistency, unavailable metrics and
   coverage gaps. Change prompts on development only. Once held-out evidence
   informs tuning, retire those cases into development; obtain a fresh independent
   source-session holdout before the next recommendation.

Exact commands from the plugin repository (after independent contract validation):

```bash
node --test sdlc-process/tests/observer-evaluation.test.mjs
node sdlc-process/tests/observer-evaluation.mjs prepare \
  sdlc-process/tests/observer-evaluation-cases.json /tmp/observer-dev-plan.json /tmp/observer-dev
node sdlc-process/tests/observer-evaluation.mjs run /tmp/observer-dev-plan.json
node sdlc-process/tests/observer-evaluation.mjs summarize /tmp/observer-dev-plan.json /tmp/observer-dev-adjudications.json
```

The current exposed development suite has 39 cases × 2 models × 3 trials
(234 trials, 252 incremental step executions). All three session157b cases are
exposed development regressions: that session informed released 0.4.13. There is
no held-out set integrated in this checkout. Independently curated validation
inputs are managed separately by the campaign owner. Freeze the prompt before
unsealing and obtain input clearance before collection. Prompt authors must not
inspect sealed inputs or tune against them. Synthetic validation does not qualify
unseen real-session behavior. Preserve superseded plans and their identities
without executing them.

Model order alternates
by repeat; cache state, provider sampling and the client/provider implicit system context remain uncontrolled, so actual
usage/cost/latency are descriptive. Three repeats are a starting engineering
budget, not proof of perfect reliability. Maximum step runtime is 180 seconds;
no automatic retry. CLI stream usage/cost and wall latency are captured even when
judgment is pending. Missing price/usage fields remain null; no guessed pricing. Aggregate USD sums
CLI-reported invocation fields; resume accumulation semantics have not been
independently validated, so do not treat that sum as an account billing total.

## Grading and proposed gates

Every case resolves its specific rubric over the suite defaults for `meaning`, `authority`, `coverage`, `timeliness`,
`duplicates`, `privateChannel` and `correction` rubrics. The offline checks enforce
parseable markers, the actual offending UUID and required supporting records,
known references, report count, pending finding delivery identity, successful
exact native-record Read before the first assessment, acknowledgement disposition
and allowed correction fields. Ordered public events retain successfully read
record hashes within one trial across resume; paged Reads combine before the
marker they support. No cache crosses independent trials or survives a changed
record identity. Verified correction additionally needs the expected corrective tool and
successful relevant verification/resolution records actually read. The independent
assessor judges meaning, source applicability, smallest correction, accurate
claims about unknown history, private/report separation and actual result success.
Mechanical reference existence alone cannot prove causal or semantic support.

The schema-2 summary matches unique planned jobs, models, trial/session IDs and
ordered step indices; missing, duplicate, extra or conflicting results or
adjudications hold the gate. Each independent judgment names the exact response
digest. Summaries reconstruct frozen prefixes through the existing materializer's
record routine, hash actual public response files, check model/session/completion,
and recompute grades in order. A stored green grade is never evidence. Keep these
disposable response files while grading/review needs them; maintain concise
identities/outcomes in the repository, rather than a raw log archive.

Scoring version 3 separates detection interventions from private lifecycle outcomes.
For finding opportunities, TP needs the correct actual finding plus mechanical
and semantic conformance; an absent or invalid required finding is FN. Independent semantic judgments count each actual unjustified intervention as FP,
including prose and malformed allegations. On negative steps, zero unjustified
interventions contributes TN once independently judged.
A missed private annotation or ordinary explanation cannot create a detection FP.
No keyword heuristic detects prose allegations: the assessor enumerates each
distinct intervention once, quoting exact public response text, judging whether
it is justified and supplying a rationale. A report's prose and parsed marker
represent one intervention, not two. Every parsed finding must have one
`markerIndex` link; prose/malformed allegations use null. Strict validation
rejects unsupported excerpts, duplicate/missing marker links, wrong types and
extra fields as unknown adjudication, holding the gate. Categories retain
TP/FP/FN/TN and precision TP/(TP+FP), recall TP/(TP+FN), with exact n/N and null
when the denominator is zero. Unknown/missing/infrastructure opportunities are
reported separately, never converted to passes or fabricated reports.

Private annotation and verified-correction opportunities separately record N,
success, miss (no annotation), failure (emitted but invalid), unknown and
unexpected annotations/verifications. Their success rates are success/N; N
includes scheduled unknown opportunities, so read the unknown count alongside
the rate. Critical lifecycle failures or unknowns still block, regardless of
finding averages. Unsupported references retain n/reference N.

Cost reporting stays separate: report successful independently adjudicated
opportunities/trials and infrastructure counts beside usage, USD and latency.
Effective cost is CLI-reported total USD divided by successful adjudicated
opportunities, only when cost is known and success is nonzero; otherwise null.
This descriptive estimate does not guess downstream rework or account billing.

Our proposed practical defaults, **not an industry mandate**:

- At least three independently started trials per case/model, all scheduled steps.
- All critical trials pass; a known critical miss stays blocking regardless of
  average performance. All current positive and private lifecycle cases are
  critical, including the real-session challenge variants.
- Zero false verified corrections and zero unsupported references.
- Precision and recall ≥ 0.95 per category where their denominator exists;
  document undefined denominators and all missing coverage explicitly.
- Independent semantic adjudication for every scored step; native MAIN delivery
  remains a separate required qualification for a live model recommendation.

The summary can say `eligible-for-scoped-review`, never “recommended model.”
Cost cannot turn a held quality gate green. Report consistency per case/model
(e.g. 2/3 versus 3/3), source-session count and category denominators. Repeated
trials and variants are correlated; do not pool them into a binomial confidence claim. A scoped pass
is insufficient evidence for untested categories.

## Case provenance and gaps

The released 25 decision fixtures retain their inputs and acceptance in
[observer-behavioral-prompts.md](observer-behavioral-prompts.md). Their originating
sessions are unknown; group all as `legacy-unknown` in development. The additional
verified tool-correction control shares that development group. `r1`–`r10`
materialize the ten accepted narrative rows through the same native-record
materializer, with applicable review rules visible and acceptance hidden. The
truncated digest preserves the full raw dispatch; unavailable-history replay
removes that transcript before invocation. Actual successful Read of the full
brief is required for the complete-dispatch negative. Partial/superseded scope
negatives also remain in f5/f6. Runnable fixture coverage does not establish
model quality; use the maintained history for adjudicated results and current
evaluation status.

Three exposed development reconstructions derive from public MAIN records in
session `157b78b6-5467-4182-9d7b-3c5596f093ee`: planning/ownership admission at
line 1434, scope pivot at 1513, review dispatches at 2942–2943 and helper/re-review
return at 7684. Metadata retains exact UUIDs. That source informed the released
0.4.13 prompt; none of these cases is held out. Inputs are sanitized paraphrases
with constructed intervening activity. The review challenge combines observations
with an intentionally defective brief, not an assertion that that exact brief
occurred. No raw transcript, credentials or reasoning are maintained. No truly
unseen real-session qualification is claimed.

## Concise results schema and maintenance

`observer-evaluation-history.json` is a maintained set of scoped observations,
not a chronological log archive. Append a new run rather than rewriting a failure
as passed. Legacy results without complete identities stay `legacy-partial` and
cannot satisfy current gates. For a new result retain:

- run ID/date, purpose/split/case version, source commit and source/agent/runtime/
  prompt hashes (or immutable plan locator + digest), requested/actual model IDs;
- per case/model trial counts, step checks and disposition, exact failing markers
  or short observed output where material, adjudicator and response digest;
- per-category finding TP/FP/FN/TN and precision/recall n/N, annotation/verification
  opportunity outcomes, per-case repeat consistency,
  unsupported reference n/N, critical failures and missing coverage;
- aggregate input/output/cache token usage, recorded USD cost and wall latency,
  null fields/coverage; independent contract/adjudication receipts, quality
  disposition and separate native evidence. Omit per-message usage iterations
  and repeated provider/cache detail.

The generated disposable `summary.json` supplies counts and gates. Retain its
concise substance and identities here, not plan source payloads, tool logs or full
transcripts. `results.json` and summaries use schema version 2; trial rows bind their planned
session and indexed response records. Old schema-1 outcomes remain historical
evidence, never current qualification. Independent semantic
adjudications use strict schema 1: each array entry has exactly the seven keys in
the example below, with exactly the seven boolean dimensions. `detection` has
only `interventions`; each intervention has exactly `excerpt`, `markerIndex`,
`justified` and `rationale`. Silence/explanation or a private lifecycle miss uses
`{"interventions":[]}`; no FP is inferred from rejected booleans alone. Example
(replace with actual attributed judgments and response excerpts):

```json
[{"trialId":"f1-claude-haiku-5-5-1","step":0,"responseSha256":"EXACT_RESPONSE_DIGEST",
  "assessor":"independent-reviewer","rationale":"Source-backed judgment of this output",
  "dimensions":{"meaning":true,"authority":true,"coverage":true,"timeliness":true,
    "duplicates":true,"privateChannel":true,"correction":true},
  "detection":{"interventions":[{"excerpt":"EXACT_PUBLIC_SDLC_FINDING_LINE",
    "markerIndex":0,"justified":true,"rationale":"The visible obligation was omitted."}]}}]
```

## Invalid-input disposition and identified regrading

A source-backed case defect is a data issue. Obtain an independent disposition
before excluding a case; retain its original trials, raw outputs and judgments.
Do not change its frozen expectation, plan or results. A corrected case needs a
new case version/hash and separately identified collection under the same frozen
production prompt. Preserve the original invalid-input coverage gap until that
corrected evaluation is independently judged.

Pass an explicit exclusion manifest to `summarize()` as `{exclusions}` or use the
read-only `regrade` command below. Exclusion schema 1 has exactly `schema`,
`planSha256` and a nonempty `cases` array. Each entry has exactly `caseId`,
`caseSha256`, nonempty `reason` and `evidence`; evidence has exactly `path` and
`sha256`, identifying the independent disposition receipt. The selected case
must match both the frozen plan pin and recomputed case hash. Unknown cases,
duplicate exclusions, changed proof bytes, wrong plan/case identities or invalid
schema hold the gate without excluding any cases. A digest verifies identity;
independent review determines whether the disposition is warranted.

Valid exclusions remove the whole case from detection/lifecycle counts, repeat
consistency, critical behavioral failures and successful-adjudicated denominators.
They do not bypass original plan/results/model/session/step/response/grade/usage
binding checks. Missing or corrupt original evidence still holds. Judgments may
omit excluded steps; old response-bound judgments may remain retained, while
extra, duplicate or conflicting judgments still hold. No-exclusion scoring retains
its existing metrics.

The summary reports explicit exclusions, planned versus scoring-eligible case and
step coverage, and coverage gaps. `cost` covers eligible evidence;
`invalidCaseCost` separately reports actual excluded invocation fields and latency.
Neither estimates downstream rework or verified account billing. Unknown costs
stay null; excluding every opportunity holds rather than qualifying an empty set.
Report data-issue counts separately from model failures.

For preserved collection under an older runtime, use the revised grader with the
exact retained collection checkout and a new output path:

```bash
node <revised-checkout>/sdlc-process/tests/observer-evaluation.mjs regrade \
  <original-plan.json> <attributed-adjudications.json> <exclusions.json> \
  <immutable-collection-checkout> <new-regrading-receipt.json>
```

This command validates original runtime hashes against the supplied collection
checkout and retains executable, environment, source, prompt and fixture checks.
It does not make ordinary `summarize` accept a changed runner. Regrading dependencies
must match collection; the changed grader has its own hash. The new receipt binds
plan, results, judgments, exclusions, collection runtime and revised grader
identities and contains separate per-model summaries. It never overwrites a
collection plan, original summary, raw result or historical judgment. Keep the
collection environment/executables available while grading; a failed identity
check needs explicit disposition rather than weakening verification.

## Native MAIN reuse path

Behavioral replay runs `observer-start.mjs` against a synthetic transcript. It
proves neither real MAIN delivery nor Skill loading. Print-mode Skill invocation
and successful source Reads also do not prove observer delivery.

For actual MAIN reuse the maintained observed MAIN agent, observer enablement and
hook described in [the observer skill](../skills/sdlc-observer/SKILL.md) and
[agent-testing](../../docs/agents/agent-testing.md). Use a disposable config and
interactive MAIN, inspect the real `observer-ref`, `origin.kind: observer`
delivery and matching observer subagent transcript with
`observer-live.mjs inspectTranscript()`/`observerRecords()`/`buildLedger()`.
Check startup baseline identity, delivered activity order, raw successful targeted
Reads, private annotation versus delivered report, and acknowledged versus
verified correction. Preserve existing first-turn timing limits. Permission-fence
and resumed-replay probes establish only their tested transport boundaries;
keep their failures, exact identities and limitations in history. This harness
does not authorize installation or active model/configuration changes.

## Coverage limits

Failed or unrelated verification, post-correction reopening and adversarial
malformed narrative reports are not separate runnable model cases in this
checkout. Tooling regressions cover ordered evidence, changed identities,
forged/missing references and semantic false-alarm accounting; they do not
qualify those model behaviors. Long pivots use constructed context. No unseen
real-session or general long-context reliability is claimed. Additional curated
validation has its own input identity, coverage and independent adjudication;
report it separately from exposed development cases.

The procedure adopts task/trial/grader separation and calibrated semantic review
from [Anthropic's agent eval guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents),
and versioned representative datasets and ongoing evaluation from
[OpenAI's evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
The thresholds and source-session split above are our engineering decisions.

## Explicit effort configurations

New controlled comparisons use the [effort profile](observer-effort-profile.md) and
its parameters JSON as the fourth prepare argument. `configurations` holds exact
`{model, effort}` pairs for Haiku/Sonnet 5.5 at low/medium/high. Models-only parameters
remain supported for legacy uncontrolled runs; they cannot qualify matched effort.
Controlled plans preserve requested thinking, conflict-selector absence and matching
agent/settings/CLI effort on every resume. Per-step Read-hook receipts capture client
effort when present; server effort/thinking stay unknown. A mismatched client level
is infrastructure, not a behavioral miss. Exact settings/command/receipt digests are
recomputed in grading. `summarize(plan, results, judgments, {configuration: ID})`
requires one condition; CLI summaries iterate every model+effort pair separately.
No pooling or qualification-gate change. Original runtime-pinned plans/results remain
untouched; original snapshots or identified regrade are required after runner edits.


## Versioned oracle and prompt revisions

Use the [revision profile](observer-revision-profile.md) and
[source-backed audit](observer-revision-audit.md) for the six short development
controls. Preserve version2 and every original result; version3 is a separately
identified oracle, with unchanged visible inputs and semantic rubric.
Its opt-in step controls are `findingPolicy: at-least-one-supported`,
`assessmentEvidence: refs-and-disposition`, `dispositionRefs` (actual allowed
answer indices), and `consumerStage: verified`. The last requires the real ledger
lifecycle in addition to minimum causal records and successful Reads of every
cited post-delivery/disposition/action/verification/resolution. Wrongly applied controls fail suite validation.
Additional findings still need strict independent intervention judgments; these
controls cannot waive false alarms, unsupported references or missing evidence.
Legacy cases without these controls keep their original checks.

Prepare accepts optional `agentFile` in parameters to freeze a separate candidate
file. The default is the production agent. Both paths freeze exact agent/body
hashes in the same plan and evaluator manifest; this option changes no installed
agent. Independently review corrected oracle and candidate bytes before paid
collection. A diagnostic reanalysis is an explicitly identified new observation,
never an edited old plan/grade/summary or a retroactive qualification.
