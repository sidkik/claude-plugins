# Observer revision results — 2026-10-09

Read the [general contract](../../docs/agents/evaluation-contract.md), then the
[revision profile](observer-revision-profile.md), [oracle audit](observer-revision-audit.md)
and [retained history](observer-evaluation-history.json).

**Mixed results; candidate remains experimental. Production prompt/model unchanged.**
This completed development pilot collected only Haiku5.5-low and Sonnet5.5-low:
24 independent trials /32 incremental steps, two repeats of six exposed synthetic
cases, unchanged semantic rubric, 180-second cap, no retries/tuning or new baseline
spend. All 32 independent blinded judgments were restored once after root's marker,
without changing verdicts or excerpts. No infrastructure errors, exclusions or
missing bindings. Both existing three-repeat/critical qualification gates remain HOLD.

## Evaluation repairs versus new behavior

The source-backed oracle correction is separate from the prompt experiment.
The original Aspen expectation included resolution7 after corrective action8,
which the actual ledger rejects as verified; Opus's resolution9/10 is valid.
Birch minimum governing/action references, assessment refs/disposition evidence,
and Cedar distinct justified interventions were audited against complete sources.
Independent preflight verified all112 retained reanalysis rows and baseline parity.
The versioned oracle resolves27 original full-conformance failures without changing
any model output or semantic verdict. Five real missing-Read failures remain across
the earlier seven configurations. Original scores/plans/judgments are retained,
not replaced by the reanalysis. This is evaluator repair, not model improvement.

The separately frozen candidate clarifies recovery only when the action UUID or
record is missing/incomplete, allowing complete baseline or validated cached reuse.
Both comparisons below use the corrected oracle; baseline responses are reused
from the prior controlled effort campaign. Separate collection times, residual
runtime differences and two repeats prevent a causal reliability claim.

| Low-effort condition | Baseline semantic | Baseline corrected full | Candidate semantic | Candidate mechanical | Candidate full steps | Candidate full trials |
| --- | --- | --- | --- | --- | --- | --- |
| Haiku5.5 | 16/16 | 16/16 | 15/16 | 15/16 | 14/16 | 10/12 |
| Sonnet5.5 | 12/16 | 12/16 | 14/16 | 14/16 | 14/16 | 10/12 |

Original baseline full scores were Haiku14/16 and Sonnet8/16. The corrected baseline
scores above must not be attributed to the candidate. Sonnet now recovers both Maple
actions but still misses both Birch action Reads. Haiku's Cedar control regresses.

## Individual cases and repeats

Each cell below is candidate **semantic / mechanical / full** passing steps;
trial conformance requires every step of that independent trial to pass.

| Case | Haiku-low step n/N | Haiku full trials | Sonnet-low step n/N | Sonnet full trials |
| --- | --- | --- | --- | --- |
| cedar | 1/2 / 1/2 / 0/2 | 0/2 | 2/2 / 2/2 / 2/2 | 2/2 |
| maple | 2/2 / 2/2 / 2/2 | 2/2 | 2/2 / 2/2 / 2/2 | 2/2 |
| birch | 2/2 / 2/2 / 2/2 | 2/2 | 0/2 / 0/2 / 0/2 | 0/2 |
| willow | 2/2 / 2/2 / 2/2 | 2/2 | 2/2 / 2/2 / 2/2 | 2/2 |
| aspen | 4/4 / 4/4 / 4/4 | 2/2 | 4/4 / 4/4 / 4/4 | 2/2 |
| elm | 4/4 / 4/4 / 4/4 | 2/2 | 4/4 / 4/4 / 4/4 | 2/2 |

Haiku repeat1: semantic8/8, mechanical7/8, full7/8; repeat2: semantic7/8,
mechanical8/8, full7/8. Sonnet repeats1/2 each: semantic7/8, mechanical7/8,
full7/8. Corrected baseline full repeats were Haiku8/8 each and Sonnet6/8 each.
Equal aggregate scores conceal different failures; correlated steps are not pooled
into confidence intervals.

All seven dimensions are reported independently: meaning, authority, timeliness,
duplicates, privateChannel and correction each pass16/16 per condition; coverage
passes Haiku15/16 and Sonnet14/16. These counts are semantic, not mechanical.

## Preserved failures

Here rN identifies the case's native record UUID ending in N; step indices are zero-based.

| Opportunity | Frozen mechanical / independent semantic outcome | Observed evidence |
| --- | --- | --- |
| Haiku Cedar repeat1 step0 | `offendingAndSupport` fails; all semantic dimensions pass | Actual Read3–4 recovers source/edit evidence. O-1 cites Read r2 alone; O-2 cites Edit r4 alone. Neither marker satisfies the required governing/action support together. Both distinct interventions are justified; this is marker conformance, not an absent Read. |
| Haiku Cedar repeat2 step0 | Mechanical passes; coverage fails | Actual Read3–4 supports the missing native invocation. Prose additionally claims the TDD source was not read, contradicted by successful Read2/result3. Directed references and invocation remain absent. The central intervention is justified but its supporting allegation is unsupported. |
| Sonnet Birch repeats1/2 step0 | `offendingAndSupport` and coverage fail | Neither response performs a Read recovering dispatch r4, whose UUID is absent from the digest. Markers substitute user r1 (plus source r3 in repeat2). Correct reviewer-owned-proof advice cannot supply missing action identity. |

All13 actual public interventions are independently justified; zero unjustified
central interventions, duplicate warnings or false verified corrections. This does
not certify every supporting sentence: Haiku Cedar2's false source-read allegation
remains a semantic coverage failure. Existing summary detection acceptance is
stricter than central justification: TP/FP/FN/TN is4/0/2/10 per condition.

| Detection category | Haiku precision / recall | Sonnet precision / recall |
| --- | --- | --- |
| native-invocation | 0/0 (null) / 0/2 | 2/2 / 2/2 |
| completion-evidence | 2/2 / 2/2 | 2/2 / 2/2 |
| reviewer-authority | 2/2 / 2/2 | 0/0 (null) / 0/2 |

Other categories have no positive detection opportunities; precision/recall are null,
not100%. Authorized-work silence passes2/2 each. Initial/verified private annotation
conformance is6/6 each, verified correction2/2 each; unchanged pending continuation
silence passes2/2 each. Successful native-delivery Reads support all initial
annotations, and corrective Reads6–10 support verified assessments; recognition of
synthetic repair evidence is not an actual repository repair by this evaluator.
Unsupported UUID uses are Haiku0/51 and Sonnet0/44. UUID existence alone does not
prove action recovery or truthful prose. No planned coverage is missing, but live
MAIN delivery and unseen real-session qualification are outside this pilot.

## Cost, effort and disposition

| Condition | CLI-reported USD | Summed invocation latency ms | USD/full-conforming opportunity | Client-effective low known / unknown |
| --- | --- | --- | --- | --- |
| Haiku-low | 0.05919421 | 117532 | 0.00422816 | 12/16 / 4/16 |
| Sonnet-low | 0.84105800 | 97935 | 0.06007557 | 10/16 / 6/16 |

Requested low effort is explicit on all initial/resumed invocations. Server-effective
effort and thinking remain unknown; no self-report supplies evidence. Costs are CLI
sums with unverified resume accumulation, not account billing or guessed rework
cost; latency is not native delivery time. Quality gates precede costs.

Root's supported decision is to keep production unchanged and retain this candidate
as experimental evidence. Sonnet's Maple gains coexist with persistent Birch misses
and Haiku Cedar regressions. The candidate does not demonstrate general improvement.
The next bounded research question is whether missing-action recovery and exact
marker support can be made consistent without introducing unsupported source-read
allegations. Separately, the split Cedar1 evidence across two justified findings
warrants a source-backed assessment of the frozen per-marker support assumption.
That is a limitation/hypothesis, not a score correction or a new gate. No additional
trial, tuning, oracle change or promotion is authorized by this result.

## Reproducibility and retention

Collection used Claude Code2.1.294 /Node22.21.1, the unchanged materializer and real
ledger consumer, and exact incremental prefix snapshots. Fixed-seed anonymous
projection preserved public event order/Read results/UUIDs, excluded private thinking,
and withheld model/effort/cost identities; writing style/tool choices remain cues.
Independent judging covers32/32 steps and24/24 trials. Credentials are removed.
Root retains disposable raw evidence through independent and user review; maintained
history stores concise outcomes and digests, not raw conversation logs.

After collection, S1 moved the assessment fixture byte-for-byte outside the raw
25-fixture enumerator. S2 duplicate expansion is deferred without a collection
invalidity claim. Actual main integration7741d43 has the same tree as the validated
integration2bdceb83: reuse Node197/197, Python9/9, generator74-file parity.
This synthesis changes docs/history only, not frozen runtime/tests/inputs or production.
No push/PR/release/model installation has been performed by this author.

Executed after completion: `restore-judgments.mjs`, existing runner
`summarize candidate-final-plan.json restored-adjudications.json`, and the existing
count-reconciliation helper adapted to this plan. All exited0; all32 unique rows
bind exact original/projection digests with unchanged semantic verdicts and zero
excerpt replacements. Full commands and checks are retained in disposable receipts.
Pre-run profile/contract identities remain frozen in the stage receipt; complete
status/navigation have separate post-run digests.

Exact identities:

- Candidate plan: `81f3313832ff45443ae283c8eaf30d84912ba0bb3c2e1357441d044b76b3dcd7`.
- Candidate prompt: `599eb9de6218c11740a925cc93ace500606e18095639a653085cef49b1b96b05`.
- Corrected cases: `f6e48ff6f08850a5794f98aab8834073a7e72858b342aec95a65de68c9bb8954`.
- Runtime/grader: `aa3699df9da3ddeeda89d441bdea81c90568e4d2aa895ee622939ad0b80323b3`.
- Versioned baseline reanalysis: `4591a8151c07f4d7c97f8ef031a4dd5e3ff058fcea5d7438510053a5c3909fb6`.
- Blind judgments: `7a1255a3b2622ff876d68f4f837d10fd582ef2a4a721511463199f04b8b5fc5e`.
- Restored judgments: `dcf197f9afb2b9670c8077558612de0e0983bd50afcaa4515c5c49d5c2c44058`.
- Candidate summary: `fd403c1d82096232c6cc574e61aad61c291a9579c9d9b14ce472dd39fcc13493`.
