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

Cases and acceptance live in
[observer-behavioral-prompts.md](../../sdlc-process/tests/observer-behavioral-prompts.md);
add or change cases there, not here.

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

- A skill-source read (opening `SKILL.md`) is not a native invocation. Count the
  skill as invoked only when the transcript shows the Skill tool call and its
  returned launch result.
- Invocation alone does not satisfy the loading contract. Full loading also needs
  the complete packaged source read, plus the directed reference files relevant to
  the work. Check each as its own requirement in the transcript.
- A tool call is not a successful result. Cite the result record, not only the
  call.
- Use the client's documented CLI help for invocation flags; record the exact
  command you ran in the PR.

## Rerun scope

Reuse evidence for surfaces and instruction bytes that did not change. Rerun cases
that failed before, cases the change can affect, and any surface newly in scope. Pick
the count from what the change touches; there is no standing repeat number or extra
gate.

## Record

Transcripts and logs are disposable; do not commit them. In the owning PR or issue
state concisely: source revisions, exact commands, the model's actual output for each
case, and what the evidence does not cover.
