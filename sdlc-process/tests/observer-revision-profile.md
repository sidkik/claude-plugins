# Observer revision experiment

Read the [general evaluation contract](../../docs/agents/evaluation-contract.md) first.
This development experiment separates evaluation defects from prompt defects before
collecting new evidence. Status: complete; independently cleared collection and judging finished.
See [revision results](observer-revision-results.md) for the mixed outcome and root
disposition to retain the candidate experimentally. This post-run status does not
change the frozen pre-run profile in the stage receipt. Production instructions, model/configuration and all original
plans, responses, judgments and results remain unchanged.

## Write → observe → execute → check

1. **Write:** freeze this experiment's scope before oracle repair or trials. Six
   existing short sequences, two independent repeats, `claude-haiku-5-5` low and
   `claude-sonnet-5-5` low. Keep incremental boundaries, hidden seven-dimension
   semantic rubric, permissions, effort controls and 180-second invocation cap.
   **Observe:** inspect the complete production prompt, real ledger consumer,
   materializer, frozen cases and actual public responses. **Execute:** reproduce
   the Aspen contradiction with `buildLedger`; audit recurring field failures.
   **Check:** each change has a source-backed reason and regression; missing Reads
   and unsupported correction evidence remain failures.
2. **Write:** a separately versioned corrected oracle and minimal candidate prompt
   clarification, with exact original/corrected hashes and a field-level disposition.
   **Observe:** inspect candidate against applicable skill guidance and all six
   controls. **Execute:** deterministic regressions and independent affected
   preflight. **Check:** root accepts exact inputs/grader/candidate and the evidenced
   baseline reuse before paid execution. No author assertion clears preflight.
3. **Write:** an immutable candidate plan and stage receipt, referencing the retained baseline.
   **Observe:** actual runtime, source/configuration/effort parity and auth availability
   without credentials. **Execute:** once per scheduled trial, no retry or tuning;
   stop dependent collection on infrastructure, binding or effort mismatch.
   **Check:** every model/session/prefix/Read/response binds its scheduled condition;
   preserve partial and failed attempts.
4. **Write:** anonymous condition mapping and fixed common-scale judging packet.
   **Observe:** every public output and causal Read result, with future steps hidden.
   **Execute:** independent blinded judging; restore exact identities only after
   root's completion marker. **Check:** unique response/projection-bound judgments,
   per-case n/N, seven semantic dimensions, mechanics and actual ledger lifecycle
   remain separate. Root owns judgment and the eventual reviewed PR.

## Budget and reuse

The existing matched baseline is reused: Haiku-low/Sonnet-low, six cases, two
repetitions (24 retained trials /32 steps). Root's independent preflight verified
all 112 versioned reanalysis rows and baseline parity. Haiku-low is the passing
control; Sonnet-low contains four actual missing-action-Read failures in Maple/Birch.
The candidate is the only new collection: **24 trials / 32 steps**, at most 5,760
scheduled invocation seconds with the unchanged 180-second cap. **No new baseline
spend**, Opus, higher effort, retries or tuning. If a frozen parity prerequisite
changes, hold collection for root's disposition instead of spending replacements.
A versioned oracle-only reanalysis is new scoring, not new collection or
retrospective qualification.

Cases are exposed synthetic development controls, not held-out qualification.
The three-repeat/critical gate remains HOLD regardless of pilot improvement.
Cost is CLI-reported with resume/billing limits; quality precedes cost. Report
repeat variation individually. No native MAIN qualification, automatic promotion,
model switch, merge or release follows. Raw evidence remains disposable, retained
by root through independent review; maintained revision history contains concise
source-backed dispositions, never raw conversation logs.

## Preflight inputs

Existing controlled plan: `/tmp/observer-evaluation-20261009/effort-run/final-plan.json`
(`3e98e2a2ad564501dcb4d5e18822932e9a387a11cfe30841252c97293ee20d5e`).
Existing comparator plan: `/tmp/observer-evaluation-20261009/opus-low-run/plan.json`
(`2dc1a172720a2f30087751b89f364caa487e08cb0e487cfb3f8873d81931a6f1`).
Inspect the versioned correction record and focused regression alongside the
candidate clarification. The prepare API defaults to production; explicit `agentFile` selects and freezes
separate candidate bytes. This preparation never substitutes a candidate into an
old plan. See the [source-backed audit](observer-revision-audit.md). Runtime and
preflight manifest identify the opt-in oracle controls; legacy grading is preserved.

## Preparation commands

These commands prepare only; they launch no model call. The final candidate plan
contains 24 trials / 32 steps at low effort for both models. All earlier newly
prepared baseline/candidate plans are superseded and remain unexecuted.

```bash
node sdlc-process/tests/observer-evaluation.mjs prepare \
  sdlc-process/tests/observer-short-sequences-v3.json \
  /tmp/observer-evaluation-20261009/revision-run/candidate-final-plan.json \
  /tmp/observer-evaluation-20261009/revision-run/candidate-final-atlas \
  sdlc-process/tests/observer-revision-candidate-parameters.json
# Only after exact independent clearance, stage receipt and supervised stop checks:
node sdlc-process/tests/observer-evaluation.mjs run \
  /tmp/observer-evaluation-20261009/revision-run/candidate-final-plan.json
# After completed independent anonymous judging and exact restoration:
node sdlc-process/tests/observer-evaluation.mjs summarize \
  /tmp/observer-evaluation-20261009/revision-run/candidate-final-plan.json \
  /tmp/observer-evaluation-20261009/revision-run/restored-adjudications.json
```

Reuse the existing projection/restoration approach with anonymous prompt+model+effort
labels, fixed shuffled order and identity map held outside judge/input. All public
outputs/tool results/current prefixes and the unchanged seven semantic dimensions
are supplied; future prefixes and candidate identity remain hidden. Root restores
only IDs/digests/aliases after the completion marker. Do not alter judgments to fit
a field expectation.

The old collection runtime cannot be verified by this changed runner's run/summarize
CLI. The versioned diagnostic reanalysis validates original collection bindings via
the existing exported summarize API before applying the corrected oracle, and pins
both collection runtimes and this grader. It does not overwrite frozen summaries.
Independent preflight must accept that reanalysis/reuse explicitly; raw proof and
script hashes are retained in its manifest.


Earlier prepared plans retain their original source identities and no execution
receipts. Their Sonnet-high condition and universal-Read candidate are superseded
by the root-directed low/low, conditional-Read candidate; they must not execute.
The final plan and manifest are frozen only after these corrections and checks.
