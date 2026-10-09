# Observer Opus low addendum

Read the [general evaluation contract](../../docs/agents/evaluation-contract.md),
then the [effort profile](observer-effort-profile.md) and [completed comparison](observer-effort-results.md).
This adds one comparator: `claude-opus-5-5` at explicit `low` effort.
Stage: collection, independent judging and synthesis complete; see
[Opus-low results](observer-opus-low-results.md). Qualification remains HOLD.
The exact plan was cleared by the independent affected preflight. Root owns Git, final judgment and execution assignment.

Use [observer-opus-low-parameters.json](observer-opus-low-parameters.json):
the same [six cases](observer-short-sequences.json), version 2, two repetitions =
**12 independent trials / 16 steps only**. Do not rerun Haiku or Sonnet. The unchanged
[seven-dimension rubric](observer-short-profile.md), hidden expectations and
production 0.4.13 prompt apply. All violations must be detected with correct causal
references, justified silence respected, actual correction recognized without
false verification, and duplicate warnings avoided. Timeliness is the first
applicable replay step. Quality precedes cost; retain individual n/N and repeat
variability, never pooled reliability.

Anthropic’s [official effort guidance](https://platform.claude.com/docs/en/build-with-claude/effort)
supports all five effort levels on Opus 5.5; low is the lowest. Adaptive thinking
is always on and cannot be disabled. Request the existing native adaptive client
configuration (`alwaysThinkingEnabled:true`), not a token budget. Requested effort
is explicit in CLI, agent and settings on every initial/resumed invocation.
Client-effective evidence comes only from native Read hooks; server-effective
effort/thinking remain unknown unless independently evidenced.

Existing contracts remain unchanged: 180-second invocation cap; incremental current
prefixes with no future leakage; independent sessions; Read-only fenced input;
conflicting effort/thinking/environment selectors rejected (including both
extra-body selectors); exact model/session/input/command/source/runtime bindings;
infrastructure distinct from behavior; supervised stop on infrastructure or observed
effort mismatch; no retries, tuning, exclusions or automatic promotion. Two repeats
cannot satisfy the existing three-repeat qualification gate. Report CLI cost and
latency with billing/resume limitations. This is exposed synthetic development
data, not an unseen real-session holdout or native MAIN delivery test.

Freeze a separate plan/runtime. The runner change is only accepting Opus 5.5 in its
controlled allowlist and the Opus family in its existing model regex. Prior
Haiku/Sonnet results retain their original runner identity. Cases, prompt, sources,
rubrics, grader and controls must match the prior effort plan exactly. This is a
later separate campaign, not a simultaneous randomized comparison; runtime/model
availability and time effects limit comparisons. Do not claim the changed runner
can validate an earlier runtime-bound plan.

Write → observe → execute → check:
1. Write this addendum, parameters and fresh plan before collection. Observe actual
   governing/runtime bytes and prerequisites. Check 12 distinct sessions, 16
   scheduled steps and exact prior-input/source/rubric/prompt/control parity;
   exit only with author-complete manifest and affected independent clearance.
2. Write a cleared pre-trial receipt. Observe every actual completed step during
   supervised execution; stop dependent collection on infrastructure/isolation/
   effort mismatch. Execute the plan once, retain partial outcomes, remove
   disposable credential copies. Check all completions/bindings and source parity.
3. Write a model-blind public judging packet using the disposable adapted helper.
   Observe projections against originals, preserving UUIDs, chronological tool
   results and causal Read evidence. Remove all model/effort/session/cost metadata
   and private thinking; neutralize Opus as well as Haiku/Sonnet identifiers.
   Give the judge only `/tmp/observer-evaluation-20261009/comparator-judge/input`
   and a neutral assignment, never this model-bearing plan path or identity map.
   The map and costs stay under opus-low-run outside the judge directory.
   Each step embeds only its current prefix with same-trial prior-step references.
   Style, length and tool-choice cues remain limitations.
4. After root’s completion marker, restore all 16 anonymous judgments to exact
   original IDs/response digests/excerpts without semantic edits, run the same
   summarizer, check totals and append concise maintained outcomes. Preserve all
   failed attempts and original/projection evidence through root/user review.

Commands from the author checkout:

```bash
node sdlc-process/tests/observer-evaluation.mjs prepare \
  sdlc-process/tests/observer-short-sequences.json \
  /tmp/observer-evaluation-20261009/opus-low-run/plan.json \
  /tmp/observer-evaluation-20261009/opus-low-run/atlas \
  sdlc-process/tests/observer-opus-low-parameters.json
# Only after exact-plan independent clearance and root execution assignment:
node sdlc-process/tests/observer-evaluation.mjs run \
  /tmp/observer-evaluation-20261009/opus-low-run/plan.json
# After complete verified collection:
node /tmp/observer-evaluation-20261009/opus-low-run/project.mjs
# After independent grading and exact binding restoration:
node sdlc-process/tests/observer-evaluation.mjs summarize \
  /tmp/observer-evaluation-20261009/opus-low-run/plan.json \
  /tmp/observer-evaluation-20261009/opus-low-run/restored-adjudications.json
```

Raw evidence is disposable, retained through adjudication and user review; root
owns retention and cleanup disposition. Maintained history contains concise
criteria/results and digests, no raw conversation logs. No production configuration,
prompt, model, canonical skill, install or release changes are authorized here.

Frozen preparation identities:
- Fresh plan SHA-256: `2dc1a172720a2f30087751b89f364caa487e08cb0e487cfb3f8873d81931a6f1`.
- Case-file SHA-256: `89e8771394b13d171f8e08075217c547b8bcfa385b04f3902c6975a59266d783`.
- Production agent SHA-256: `aa0a3be6e8d1e208d5619e876e3698031141ee9fec2fd01a1518347cb808f516`.
- Runner SHA-256: `466fcb4e268838778bb29107e3d10144efc4230620345e63e47cc70486a316ee`.

Full per-file/source/runtime pins and actual focused checks are in the disposable
author-complete manifest/receipt under opus-low-run. Those private collection paths
must not appear in the anonymous judge assignment.

Post-run status annotation:12 trials /16 steps completed; all16 independent verdicts
retained. This complete-status digest is separate from the frozen pre-run profile;
no case, rubric, prompt, effort control or gate changed.
