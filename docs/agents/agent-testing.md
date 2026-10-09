# Testing agent instructions

Use this when a change alters agent instructions: a skill, an agent definition
such as the observer, or a hook-delivered prompt. A passing structural check says
the package is well formed. It says nothing about what the model does.

## Pick the evidence surface

Choose the surfaces your change can affect. Each proves a different thing.

| Surface | Proves | Does not prove |
| --- | --- | --- |
| Structural | Files, manifests, generated bundle and parsers are consistent | Any model behavior |
| Behavioral replay | What the configured model reports or does on a fixed input | Live delivery, hooks timing, MAIN-session integration |
| Native integration | The real client loads and delivers the instructions in a MAIN session | Cases you did not run |

Structural, from the repository root:

```bash
node --test tests/*.test.mjs sdlc-process/tests/*.test.mjs
python3 -m unittest discover -s tests -p 'process*.py' -v
python3 tools/build-process.py --planning <planning-checkout> --core <core-checkout> --check
```

Find `<planning-checkout>` and `<core-checkout>` from `git worktree list` and the
sibling checkouts of this repository (the tracker doc names `../planning`); the
generator reads Git objects at the pinned commits in `tools/process-sources.json`.
Run `--check` when the change touches generated bundle files.

## Behavioral replay

For Claude model comparisons, select full model IDs and record the model in actual
assistant responses; aliases can resolve differently by provider or client version.
Anthropic released [Haiku 5.5](https://www.anthropic.com/claude-haiku-5-5) on
2026-10-07 as `claude-haiku-5-5`. The
[Claude Code model docs](https://code.claude.com/docs/en/model-config) require
2.1.293 or newer for it; `claude-sonnet-5-5` is the explicit Sonnet comparator.
Keep the maintained agent model until the affected behavioral comparison supports
a change. A replay result establishes only the tested cases, not live observation
or another agent's fitness.

The installed 0.4.13 observer remains configured for `claude-haiku-5-5` under
the historical matched ten-case replay decision. Both models achieved 10/10
original acceptance but 9/10 full instruction conformance: each omitted the
native delivery-identity Read before the f3 assessment. That historical decision
does not establish current qualification or live MAIN delivery. The immutable candidate-v4 baseline campaign is consolidated with the production
prompt unchanged; both models retain held quality gates in development and
synthetic validation. Corrected r4 was scored separately. These historical results
supply neither current live qualification nor a model recommendation; preserve
their exact identities and limitations in the maintained history. Grok supervisors and Codex
forwarding agents retain Sonnet.

Cases and acceptance live in
[observer-behavioral-prompts.md](../../sdlc-process/tests/observer-behavioral-prompts.md);
add or change cases there, not here.

Before defining a comparison, write and inspect the
[general evaluation contract](evaluation-contract.md), then its role specialization.
For the explicitly bounded six-sequence/two-repeat Observer pilot, use
[the short profile](../../sdlc-process/tests/observer-short-profile.md) and its hidden-rubric
case definitions. For explicit model+effort comparisons, use the
[effort profile](../../sdlc-process/tests/observer-effort-profile.md) and
[maintained effort results](../../sdlc-process/tests/observer-effort-results.md); earlier model-only
results have uncontrolled/unverified effort. For reproducible observer comparisons, follow the maintained
[evaluation procedure](../../sdlc-process/tests/observer-evaluation.md). It fixes
parameters and source identities before trials, separates detection from private
lifecycle grading, and preserves concise outcomes in
[the evaluation history](../../sdlc-process/tests/observer-evaluation-history.json).
Independent contract review and semantic adjudication remain required; historical
acceptance does not qualify revised prompts or live delivery.

1. Fix the subject. Record the source revision, the exact instruction bytes the
   evaluator runs under (the installed or copied agent file, not a paraphrase),
   the model read from its frontmatter `model` field and the
   client version.
2. Materialize a fixture into a disposable directory:
   `node sdlc-process/tests/observer-decision-materialize.mjs <fixture.json> <disposable-dir>`.
   It writes a synthetic raw MAIN transcript, runs the real `observer-start.mjs`
   SubagentStart hook for the baseline, and prints the common prompt, baseline and
   a native-style digest. It is a replay of the baseline hook; it is not proof that
   a live observer receives anything.
3. Give the evaluator only that output. Keep the acceptance column away from it.
4. Select cases: the failing case, plus the compliant, partial, superseded and
   unknown-coverage negative controls that bear on the changed rule.
5. Run the observed failure on the baseline instructions when you have them, then
   on the candidate. A fix is shown by the same case changing outcome.
6. Compare the model's actual report or actions with the acceptance column. For a
   structured report, check that each marker parses with `markers()` in
   `sdlc-process/scripts/observer-ledger.mjs` and that its fields (rule, evidence
   references, resolution) match what the acceptance allows. A reassuring summary
   or the right keywords is not a pass.
7. One success on a nondeterministic model is one observation. Report it as that,
   and record trials that diverge: an earlier run that failed a case a later run
   passed is evidence of variance, not a pass for every old trial.

## Native integration

When the change concerns skill loading or main-session delivery, run it in a real
client session and read the transcript.

- A skill-source read (opening `SKILL.md`) is not a native invocation. In Claude,
  count the skill as invoked only when the transcript shows the Skill tool call
  and its returned launch result. For a Codex worker, the mechanism is the
  structured skill input: count it only when the launch evidence shows the
  accepted input (`crew-codex task --skill <name>`, resolved name and path) and
  the turn's result; a file read never substitutes. A job launch or skill
  discovery alone is not success.
- Invocation alone does not satisfy the loading contract. Full loading also needs
  the complete packaged source read, plus the directed reference files relevant to
  the work. Check each as its own requirement in the transcript.
- A tool call is not a successful result. Cite the result record, not only the
  call.
- Use the client's documented CLI help for invocation flags; record the exact
  command you ran in the PR.

### Codex crew native skills and capabilities

When the change touches `crew-codex --skill`/`--network`, the turn-capabilities
patch or the reviewer/runtime instructions, the stub suite is not native evidence.
It proves routing, validation order and the params the patched companion builds;
it does not show that Codex injects a skill or enforces `networkAccess`.

```bash
bash codex-crew/tests/run.sh   # stubs + the node regressions; ignores the caller's crew environment
CREW_LIVE=1 node --test codex-crew/tests/live-capabilities.test.mjs
CREW_LIVE=1 CREW_LIVE_TURNS=1 node --test codex-crew/tests/live-capabilities.test.mjs
```

The first live command spends nothing: it copies the installed official plugin
into a throwaway `CLAUDE_CONFIG_DIR`, patches the copy, and checks real
`skills/list` discovery and the explicit pre-job failures. The second spends
Codex tokens and needs `gh` auth: skill injection against a control without the
flag (a token present only in the `SKILL.md`), an authenticated GitHub read with
and without `--network`, and a read-only task that cannot write beside an
authorized `--write --network` task that writes inside its disposable checkout
and not outside it, `--resume-last` keeping the required skill (and not a decoy)
and the authenticated read while `--no-requirements` drops both, and a literal
`--network` after `--` granting nothing. The resume check reads Codex's own
record of the thread (`thread/read` with turns): the accepted skill input and the
command result, not the reply wording. A resumed thread still holds its earlier
messages, so dropping requirements stops re-invocation and network but does not
erase earlier instructions or output. `--network` permits authenticated
mutations too; the harness only reads, and "no GitHub mutation" remains an
instruction fence. Record Codex and plugin versions, the command, and each
case's observed result; a skipped case is not a pass. Never run it against the
live plugin install or the shared checkout.

## Rerun scope

Reuse evidence for surfaces and instruction bytes that did not change. Rerun cases
that failed before, cases the change can affect, and any surface newly in scope. Pick
the count from what the change touches; there is no standing repeat number or extra
gate.

## Record

Transcripts and logs are disposable; do not commit them. In the owning PR or issue
state concisely: source revisions, exact commands, the model's actual output for each
case, and what the evidence does not cover.
