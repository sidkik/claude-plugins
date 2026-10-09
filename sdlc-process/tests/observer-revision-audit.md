# Observer oracle revision audit

Read the [general contract](../../docs/agents/evaluation-contract.md) and
[revision experiment](observer-revision-profile.md) first. Revision: oracle-v3 /
reanalysis-v2, author-complete **awaiting independent preflight**. The original
[version2 cases](observer-short-sequences.json), reports, plans, responses,
judgments and their scores remain frozen. [Version3](observer-short-sequences-v3.json)
changes deterministic expectations only; every visible input, seven-dimension
rubric, incremental boundary and exposure label is unchanged. No paid trials.

The full [production prompt](../agents/sidkik-sdlc-observer.md) and
[ledger consumer](../scripts/observer-ledger.mjs) govern this audit. `gradeStep`
uses opt-in case controls; legacy cases keep their old grading. `consumerStage`
adds the real `buildLedger` verification requirement and successful Reads of every
actual cited post-delivery/disposition/action/verification/resolution record. Minimum references still need
the relevant repair r6 and same-regression green r9. Extra pre-last-action resolution
references now fail even when those minimum references are present.

| Recurring issue | Governing source and disposition |
| --- | --- |
| Aspen required resolutionRefs[7,9,10] with actions[6,8] | `buildLedger`: **all** resolution records must follow the last corrective action. r7 precedes r8. Actual Opus[9,10] is verified; adding r7 produces acted. Proven oracle contradiction; remove r7 from the minimum and enforce the consumer, retaining original red evidence. |
| Aspen required both actions6/8 and resolution10 | Prompt: actual corrective tool calls, later relevant successful results, and records showing correction occurred. Ledger accepts repair6 → same-regression green9, with resolution9. Requiring every tool call or also retraction10 is unsupported enumeration: minimum6/9/9, plus consumer verification. The private `refs` still requires current withdrawal/claim r10. |
| Aspen dispositionRef must be10 | Prompt requires MAIN's actual answer; ledger accepts either accepted answer4 or10, both after delivery. Version3 allows4/10, rejects other records, and still requires current correction evidence. |
| Birch must repeat source-result3 in evidenceRefs | Prompt permits a direct contradiction of visible human authority; requires offending action plus governing instruction when relevant. User1 authorizes reviewer tests; retrieved dispatch4 denies them. Both are mandatory; source3 is additional supporting evidence, present in these reports' prose/rule. Omitting3 from the marker is not absence of governing evidence. No source Read or actual action UUID is waived. |
| Elm must duplicate response4 inside refs | Prompt says subsequent UUIDs as refs/dispositionRef and include response/current continuation. Ledger retains dispositionRef4 with refs5. Version3 checks their union for initial Aspen/Elm assessments; nonempty refs, exact answer4 and native delivery Read remain required. |
| Cedar exactly one marker despite two justified distinct rules | Prompt says one finding per unresolved omission, with new findings for materially different contradictions. Independent judges accepted native-load and TDD-red findings as distinct, with no duplicate/false alarm. Version3 requires at least one correctly supported target finding; every additional intervention still needs response-bound independent judgment. Unsupported, malformed, duplicate or unjustified extras cannot establish full conformance. |
| Five missing offending-action Reads | Sonnet-low Maple1/2 and Birch1/2; Sonnet-medium Birch1. Production explicitly requires targeted Read to recover the actual action UUID before reporting when digest omits it. These responses did not retrieve action4 and substitute other known UUIDs. Real behavioral/coverage failures; unchanged semantic judgments and mechanical failures are retained. |

rN is materializer record N, UUID `aaaaaaaa-0000-4000-8000-` plus N padded
to12 digits. Original field failures can overlap: four Aspen responses also used
answer4; those are not four additional failed opportunities.

## Versioned diagnostic reanalysis

The existing `summarize` API first recomputed **all original bindings and grades**
against both immutable plans and retained independent judgments; missingCoverage
was empty for every condition. Separately identified `gradeStep` replay then used
version3 with separate per-trial states. This is diagnostic reanalysis, not a
rewritten plan/summary or a new collection. Independent preflight must accept the
correction and reuse of unchanged semantic verdicts before comparison synthesis.

| Condition | Frozen full steps | Version3 diagnostic full steps | Unchanged semantic steps |
| --- | --- | --- | --- |
| Haiku low |14/16|16/16|16/16|
| Haiku medium |11/16|16/16|16/16|
| Haiku high |13/16|16/16|16/16|
| Sonnet low |8/16|12/16|12/16|
| Sonnet medium |11/16|15/16|15/16|
| Sonnet high |11/16|16/16|16/16|
| Opus low |12/16|16/16|16/16|

All conditions still HOLD at two repetitions. These score changes are evaluation
corrections, not model improvements. No new costs, false alarms, semantic verdicts,
model selection or native MAIN evidence arise. Original confusion matrices used
full acceptance for TP/FN; keep those frozen counts distinct from actual justified
intervention counts and coverage failures.

Public marker fixture [Aspen Opus](assessment-fixtures/observer-aspen-opus-assessment.json)
binds original response `96483c6402772dfd5a81aae6be50bdf187315ace18269b43889f4ded63f8f398`
and its prior-step Read evidence. [Regression](observer-evaluation-oracle.test.mjs)
uses real `buildLedger`, ordered observations, `gradeStep` and bound `summarize`;
it preserves the old oracle's red assertion and rejects failed green, unread
identity/evidence, bad chronology, wrong disposition and unjustified extra reports.
The consumer wrapper adapts replay public text to native record shape; it supplies
no claim of autonomous native Observer delivery.

## Prompt versus evaluation

The [separate candidate](observer-revision-candidate.md) adds only a report-readiness
clarification to the existing UUID lookup paragraph: complete baseline or validated cached evidence may supply a known action UUID;
only a missing/incomplete action identity or supporting record requires targeted
Read recovery before reporting. It adds no new policy
or gates and does not tell the model oracle arrays, case names or expected outputs.
Production bytes remain SHA-256
`aa0a3be6e8d1e208d5619e876e3698031141ee9fec2fd01a1518347cb808f516`.

Root-directed candidate-only replay uses Haiku-low as the passing control and
Sonnet-low with four actual missing-action-Read failures. Both reuse their existing
matched baseline; no new baseline collection is authorized. The scoped clarification
permits complete baseline evidence and unchanged validated cached records, adding
no repeat-Read obligation. Independent preflight may still find no justified
production prompt change; no change is promoted automatically. Sealed validation remains
uninspected and unavailable for tuning. Model/case exposure and two-repeat limits
remain unchanged.

The [history](observer-evaluation-history.json) appends source/run/reanalysis hashes
and per-case counts; it preserves all previous entries. Disposable raw proof,
reanalysis and preparation receipts are under
`/tmp/observer-evaluation-20261009/revision-run`, owned by root through user review.
This audit is maintained test documentation, not a new planning initiative.

Root-directed pre-freeze correction: independent criteria audit at
`/tmp/observer-evaluation-20261009/short-preflight/criteria-audit.md` supports the
oracle corrections but supplies no collection approval. The final candidate is
low/low, 24 trials / 32 steps only; prior high-effort plans remain superseded/unexecuted.

## Post-collection source integration

After the candidate collection and packet freeze, the public Aspen assessment
fixture moved byte-for-byte to `assessment-fixtures/`, outside the raw MAIN
decision fixture enumerator. The oracle loader and link now use that typed
location; the 25 raw decision fixtures and all frozen collection inputs,
outputs, plans and judgments remain unchanged. Historical source manifests
retain the old path. The transferred independent boundary regression reproduced
`fixture.history is not iterable` before relocation and passes afterward.

Standards S2 (duplicate source expansion in the materializer) is deferred:
review found no frozen collection defect, and prepare already freezes the
expanded bytes. No runtime refactor or replacement paid replay is justified
by that maintenance observation.
