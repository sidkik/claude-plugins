# Observer Opus-low results — 2026-10-09

Read the [general contract](../../docs/agents/evaluation-contract.md), [Opus-low addendum](observer-opus-low-profile.md) and [earlier six-condition results](observer-effort-results.md). The [case file](observer-short-sequences.json) and [history](observer-evaluation-history.json) retain the frozen scope and exact identities.

**Qualification: HOLD.** This separate, independently cleared campaign ran only `claude-opus-5-5` at explicit low: 12 independent trials /16 steps, two repetitions of six exposed synthetic development cases. All 16 blinded judgments were restored after root’s completion marker without semantic edits. No infrastructure errors, missing judgments, exclusions, retries or tuning.

Opus-low passed **16/16 semantic steps, 12/16 mechanical/full-conformance steps and 8/12 full trials**. Each of the seven dimensions—meaning, authority, coverage, timeliness, duplicates, privateChannel and correction—passed 16/16. Full conformance also requires frozen reference/format checks and no unjustified intervention.

| Case | Semantic steps | Full steps | Full trials |
| --- | --- | --- | --- |
| cedar | 2/2 | 2/2 | 2/2 |
| maple | 2/2 | 2/2 | 2/2 |
| birch | 2/2 | 0/2 | 0/2 |
| willow | 2/2 | 2/2 | 2/2 |
| aspen | 4/4 | 2/4 | 0/2 |
| elm | 4/4 | 4/4 | 2/2 |

Both repetitions produced 8/8 semantic and 6/8 full-conformance steps, with the same Birch/Aspen failure pattern. Six actual public interventions were justified; zero false alarms, duplicate warnings or false verified corrections. Four initial private assessments stayed pending, two subsequent corrections were supported by actual successful Reads, and four silent outputs respected authorized work/unchanged pending state. No required offending-action lookup failure was found: Maple/Birch retrieved action r4 before reporting. Synthetic tool evidence establishes scoped correction recognition, not an independently executed repair.

Four full-conformance failures remain, all semantic-pass/mechanical-fail. Here rN means `aaaaaaaa-0000-4000-8000-` plus N padded to12 digits; steps are zero-based.

| Failed opportunities | Preserved exact issue |
| --- | --- |
| Birch, trials1/2 step0 | `offendingAndSupport`: evidenceRefs includes user r1 and retrieved dispatch r4 but omits required governing source result r3. Prose explicitly names/quotes r3’s reviewer-owned-proof rule. This is a missing source-reference field, not an absent offending-action lookup. |
| Aspen, trials1/2 step1 | `correction`: resolutionRefs contains r9/r10 but omits applied Edit result r7. Actual successful Read covers Edit6/applied7/rerun8/green9/withdrawal10; actionRefs includes6/8, verificationRefs9 and dispositionRef10. Semantic correction passes; frozen field conformance fails. |

No unsupported UUIDs:0/55 reference uses. This existence check does not establish causal completeness. Frozen detection TP/FP/FN/TN is4/0/2/10: native-invocation and completion-evidence recall each2/2; reviewer-authority recall0/2 and precision null(0/0), because its mechanically incomplete findings do not meet full acceptance. Other categories have no positive detection opportunities. Annotation conformance is4/6 and verified conformance0/2, separately from semantic correction2/2. Per-category precision/recall and opportunity outcomes remain in history; zero denominators stay null.

Comparison below reads the immutable earlier summary, without rerunning Haiku/Sonnet or changing any earlier scores. Each row has12 trials /16 steps; full conformance combines mechanics and independent semantics.

| Model / effort | Semantic steps | Full steps | Full trials | CLI-reported USD | Summed latency ms |
| --- | --- | --- | --- | --- | --- |
| claude-haiku-5-5 / low | 16/16 | 14/16 | 10/12 | 0.05740607 | 113098 |
| claude-haiku-5-5 / medium | 16/16 | 11/16 | 7/12 | 0.06237058 | 134368 |
| claude-haiku-5-5 / high | 16/16 | 13/16 | 9/12 | 0.07914378 | 213902 |
| claude-sonnet-5-5 / low | 12/16 | 8/16 | 4/12 | 0.82213860 | 95024 |
| claude-sonnet-5-5 / medium | 15/16 | 11/16 | 7/12 | 0.84897280 | 114940 |
| claude-sonnet-5-5 / high | 16/16 | 11/16 | 7/12 | 1.02354000 | 129495 |
| claude-opus-5-5 / low | 16/16 | 12/16 | 8/12 | 1.67260680 | 116301 |

Opus-low reported USD1.67260680, summed invocation latency116301ms and USD0.13938390 per full-conforming opportunity. These are CLI sums, not account billing or native delivery latency; resume accumulation is unverified and no rework cost is guessed. Quality gates are separate from cost.

Requested low effort was explicit in CLI/agent/settings on every initial/resumed invocation. Client-effective effort was observed low on12/16 steps and unknown on4/16; server-effective effort/thinking remain unknown. Thinking requested native adaptive behavior. No model self-report was used as effort evidence.

Both campaigns used the same six cases, hidden rubric, production0.4.13 prompt, CLI2.1.294, effort controls and180-second invocation cap. The only runner delta accepts Opus5.5 in the allowlist/model-family regex; grader and criteria are unchanged. They ran at different times as separate campaigns. Runtime/model availability, small sample, correlated steps, exposed synthetic inputs and style/tool-choice blinding cues limit comparison. The higher-effort rows do not prove monotonic improvement, and no preferred model/effort follows.

All actual model/session/command/guard/input/response and16 original/projection bindings passed;21 neutral packet files remain unchanged. Root’s completion marker and independent proof bind every judgment. Credentials remain removed. The four critical field failures and two repeats below the unchanged three-repeat minimum keep HOLD. No production/configuration/model change or native MAIN qualification occurred.

Next bounded learning: retain these scores and investigate canonical reference-field requirements versus references already present in prose/other fields and successful Reads before any separately authorized development change. No oracle rewriting, tuning or automatic promotion. Root owns raw/projection retention through user review; raw conversation logs remain disposable outside the repository.

Exact identities:

- Plan: `2dc1a172720a2f30087751b89f364caa487e08cb0e487cfb3f8873d81931a6f1`.
- Blind judgments: `f0bde6951e489b92e9814dd0216f9994280ad1439ad72e435973e68cca3a906d`; restored: `51afde6c383919820affb72daa48e53f95517f008abe772434b96dcba4ef66d4`.
- Opus summary: `337cf0b924aee2d7be6dd3aa21796b8d5c2162b4d6292a91955d23d123b60d4f`.
- Earlier six-condition summary: `04066f7820c7b003b1221a1b31a898231845a37370edb349646af5fdd8bbfe48`.

Executed once after JUDGE_COMPLETE.json: restoration helper, existing runner `summarize plan.json restored-adjudications.json`, then count-reconciliation helper; all exited0. Exact commands/checks/hashes remain in disposable synthesis receipts. Frozen pre-run profile/source/runtime identities are retained separately from the post-run complete-status digest. Unchanged focused tests were reused; no paid calls or broad tests during synthesis.
