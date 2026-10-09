# Observer effort comparison

Read the [general contract](../../docs/agents/evaluation-contract.md) first. This
profile applies its write → observe → execute → check phases to the unchanged
[short cases](observer-short-sequences.json), [seven-dimension Observer rubric](observer-short-profile.md)
and [runner](observer-evaluation.md). Stage: collection, independent blinded judging and synthesis complete; see
[effort results](observer-effort-results.md). All six quality gates remain HOLD. This is a two-repeat pilot; every
condition retains the existing minimum of three repetitions.

## Fixed conditions and control

Use [observer-effort-parameters.json](observer-effort-parameters.json): Haiku 5.5
and Sonnet 5.5, each at low, medium and high. Six model+effort configurations × six
cases × two independent repetitions = **72 trials / 96 steps**. Aspen and elm each
resume once in their own session. Case version 2 / file SHA-256
`89e8771394b13d171f8e08075217c547b8bcfa385b04f3902c6975a59266d783`
and production 0.4.13 agent SHA-256
`aa0a3be6e8d1e208d5619e876e3698031141ee9fec2fd01a1518347cb808f516`
are unchanged. No input, hidden rubric, prompt, acceptance threshold or production
configuration changes. Cases remain exposed synthetic development data.

Each invocation and resume passes explicit `--model` and `--effort`, matching the
disposable evaluator definition's `model`/`effort`. Disposable settings carry the
same `effortLevel`, `alwaysThinkingEnabled:true` and existing Read guard. Thinking
is requested as the client-native adaptive behavior of these models, not a fixed
token budget. Only Read in the current frozen input tree is allowed; future activity
and rubrics remain outside scope. All existing isolation controls are retained.

The runner rejects inherited effort/thinking/subagent selectors, including
`CLAUDE_CODE_EFFORT_LEVEL`, `MAX_THINKING_TOKENS`, adaptive/disable-thinking flags,
subagent model overrides and both `ANTHROPIC_EXTRA_BODY` and
`CLAUDE_CODE_EXTRA_BODY`; their absence is hashed in new controlled plans. It records exact per-step settings/arguments and agent digests,
checks the definition before launch/resume, and recomputes those bindings in scoring.
Each condition has a separate job ID, session and summary. The API rejects pooling
controlled conditions, including a model-only summary selector.

The existing PreToolUse Read guard also records native `effort.level` metadata,
with exact session binding, outside candidate Read scope. This is client-effective
effort after client downgrades. Any observed level differing from requested is an
infrastructure outcome; do not score it as a behavioral miss or retry it. An in-scope Read missing its guard receipt is infrastructure. No Read
means no such hook evidence: client-effective effort stays unknown, without adding
a Read requirement to the frozen cases. Server-effective effort and effective
thinking remain null: current public CLI completions do not attest either. Report
known/unknown client-effort coverage per configuration and step. A request flag,
source inspection or stub pass is not native/server proof.

## Source observations and limits

Official [API effort docs](https://platform.claude.com/docs/en/build-with-claude/effort)
confirm both models support the requested levels. Effort controls overall work;
thinking configuration is separate. API defaults are not assumed for this replay.
Official [Claude Code model docs](https://code.claude.com/docs/en/model-config) describe
CLI effort controls, settings/default precedence and caps. For these models the
client uses adaptive reasoning; client settings cannot disable their thinking.
This differs from some direct API thinking controls and is not a supported-setting
failure for this profile's adaptive configuration.

Official [subagent docs](https://code.claude.com/docs/en/sub-agents) document agent
effort overriding session effort while environment overrides take precedence.
This runner executes an agent as the main print-mode session (`--agent`), not a
native background Observer. Local CLI 2.1.294 help exposes `--effort`; embedded
source shows effort parsing, environment resolution, adaptive model handling and
hook effort metadata. Official [hook docs](https://code.claude.com/docs/en/hooks#common-input-fields)
identify `effort.level` as the level in effect in tool context. Managed/organization
caps may still constrain the request despite empty settings sources. Hook metadata
can reveal that at Read boundaries, but cannot establish server-effective effort
or the level at a boundary with no Read. No paid native probe was made in preparation.

Earlier model-only results were effort-uncontrolled/unverified. Their frozen counts
remain unchanged; they are not matched effort baselines for this sweep. No claim of
native MAIN delivery, unseen real-session qualification or model selection follows
from this comparison. Existing pstack research pins/adoptions remain as recorded
in the general contract; there is no new pstack installation or invocation.

## Phase evidence and exits

| Phase | Write | Observe | Execute | Check / exit |
| --- | --- | --- | --- | --- |
| Definition | General effort contract, six-condition parameters and this profile | Official controls/precedence, CLI help/source and prior uncontrolled evidence | Resolve client versus API thinking differences without changing cases | Requested controls explicit; effective evidence scope and unknowns recorded |
| Preparation | Exact sources/runtime/config manifest and fresh plan | All six frozen cases, settings/agent arguments, hidden rubric and incremental boundaries | Offline regression tests; existing prepare/materializer only | 72 unique sessions, 96 steps; unchanged prompt/cases; no execution-started receipt |
| Preflight | Independent review of exact final runner/tests/docs and plan digest | Actual supported settings, guard effort transport, grouping, legacy compatibility and blinding feasibility | Root arranges affected independent review | Required defects dispositioned; final frozen plan/source receipt before collection; no paid call before clearance |
| Collection | One fixed attempt, supervisor and stop receipt | First actual completed trial, native hook effort metadata and binding/isolation checks | Run once under cleared plan | Retain all 96 outcomes; mismatch/infra/unknown separately reported; no tuning or retries |
| Judging | Anonymous six-condition mapping, fixed shuffled order/seed, response-bound rows | All current public outputs/Reads, causal prefixes, actual governing rules and unchanged rubric | Independent blinded assessor grades seven dimensions plus actual detection interventions | 96 unique projection-bound rows restored without changing verdicts |
| Synthesis | Per-condition n/N, failures, repeat consistency, unknown effort coverage and costs | Deterministic summary versus independent judgments and receipts | Root checks source-backed conclusions and records concise history | Three-repeat gate retained; no automatic tuning, model promotion or native MAIN claim |

Maximum invocation duration is unchanged at 180 seconds: 96 × 180 = 17,280 seconds
of scheduled invocation time plus preparation/inspection. The sequential runner
continues subsequent trials after infrastructure outcomes; the coordinator supervises
and stops dependent collection under the general contract. Preserve partial outcomes.
No extra smoke campaign, retry-until-green, full qualification or budget extension.
Cost is CLI-reported only, with resume accumulation/account-billing caveat; quality
comes first. Cost per successful adjudicated opportunity is null at zero/unknown.

## Commands after independent preflight

From the author checkout (prepare performs the already authorized read-only HEAD
inspection). Prepare is not paid collection; use a fresh path after any source fix.
The final plan below must never be rerun or silently rewritten. Earlier unexecuted
review and superseded plans remain retained separately.

```bash
node sdlc-process/tests/observer-evaluation.mjs prepare \
  sdlc-process/tests/observer-short-sequences.json \
  /tmp/observer-evaluation-20261009/effort-run/final-plan.json \
  /tmp/observer-evaluation-20261009/effort-run/final-atlas \
  sdlc-process/tests/observer-effort-parameters.json
# Only after independent preflight and a final frozen stage receipt:
node sdlc-process/tests/observer-evaluation.mjs run \
  /tmp/observer-evaluation-20261009/effort-run/final-plan.json
# Only after anonymous grading and exact original-ID/digest restoration:
node sdlc-process/tests/observer-evaluation.mjs summarize \
  /tmp/observer-evaluation-20261009/effort-run/final-plan.json \
  /tmp/observer-evaluation-20261009/effort-run/restored-adjudications.json
```

Use the previous bounded projection approach, adapted to plan-derived counts and
six stable anonymous model+effort labels: the disposable `project.mjs` in effort-run
prepares `judge/input` only after complete collection. Root keeps identity/costs and
original/projection digests outside that directory. Fixed seed 20261009; labels are
shuffled across configurations and trials. Remove effort, model, session, provider,
usage and cost metadata; alias model/effort-bearing paths consistently. Preserve
UUIDs, public text/tool events, successful Read content and current per-step snapshots,
never raw reasoning or live links to future prefixes. Style and tool-choice cues
remain limitations. Judge uses the unchanged strict schema, anonymous trial IDs and
projection digests; coordinator restores exact original bindings/excerpts only after
completion authorization. Never alter a verdict to satisfy mechanical checks.

Legacy plans without configurations retain model-only grading and their original
uncontrolled status. Their runtime hashes remain strict: the new CLI does not claim
to accept an old frozen runner. Use the original immutable runtime snapshot, or the
existing explicitly identified `regrade` path with its collection runtime and an
explicit empty exclusion manifest; preserve every original plan/output/summary.
Raw diagnostics stay disposable but retained through adjudication and root/user
review. Credential copies are removed by the runner's campaign-level finally block.

Post-run status annotation: 72 trials / 96 steps completed under the frozen pre-run
profile; all 96 judgments bind and retain independent verdicts. The complete-status
digest is separate from the pre-run profile SHA-256 in the stage receipt/history.
No definition, acceptance criterion or gate was changed.
