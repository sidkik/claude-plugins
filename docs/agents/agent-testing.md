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
Run `--check` when the change touches generated bundle files, native skills or
agents, or the `composition` policy. `tests/process_composition.py` checks the
committed native files against a fresh composition without source checkouts.

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

The maintained observer selects `claude-haiku-5-5` following the accepted matched
ten-case replay comparison. Both models met the existing acceptance table, but
both skipped the native delivery-identity read before the f3 assessment. That
shared instruction-conformance gap remains; replay acceptance does not qualify
live MAIN delivery. Grok supervisors and Codex forwarding agents retain Sonnet.

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

### Board delegation acceptance plan

Test the public seams: status CLI `write`/`record` responses, its read-only
`next-work` response, and the accountable agent's native skill invocation. Use
synthetic delivery repositories and a fake board skill that makes no board or
GitHub writes. Native verification remains ongoing; the cases below are
acceptance requirements, not passing receipts. Independent review and actual
native evidence are required before acceptance.

Materialize fixtures without model calls (destination must not exist):

```bash
node sdlc-status/tests/board-native-materialize.mjs /absolute/disposable/board-fixtures
```

Freeze candidate revisions and fixture source digests before execution; keep
candidate skill bytes unchanged during runs. The materializer creates project
skill trees in Claude `.claude/skills` and Codex `.agents/skills`, preserving
source-relative references, README, runtime and templates. `candidate-skills.json`
records native status/process paths, sources and SHA-256. Require native loading
of those exact candidates using bare project names `sdlc-status` and
`sdlc-process`; loading an older installed skill and then reading the candidate
fails acceptance. Codex need not have an installed status plugin. Disposable
skill trees are test assets, not release bundles; immutable distribution still
uses the established generator and committed source pin.

Isolate global plugins and hooks while preserving native project discovery.
Verified Claude setup lesson: enable project settings sources, for example
`--setting-sources project,local`. An empty `--setting-sources` value hides
project skills and cannot qualify a candidate run. Use isolated client
configuration; for Codex, use a copied/patched official runtime as described in
`codex-crew/tests/live-capabilities.test.mjs`. Preserve shared installs and caches.
Record client versions, runtime capabilities and resolved skill paths. Fixtures
require no GitHub/network access.

Run these cases in each harness:

| Case | Trigger | Required observation |
| --- | --- | --- |
| Initial | `write initial.json` | native `fake-board` invocation with `stage-change`, issue `https://github.com/example/delivery/issues/17`, route `delivery`, stage `IN`, outcome `null` |
| Unchanged | repeat identical write | no board request or invocation |
| Stage change | `record change.json` | native invocation with same issue/route, `stage-change`, stage `RS`, outcome `null` |
| Combined advancement | `record advance.json` | native finish `RS` with outcome `ready assessed; start not authorized` **before** native `stage-change:DE`, same issue/route |
| Repeated finish | repeat `advance.json`, then `finish.json` | no additional request or invocation for the unchanged finish |
| CLI next work | `next-work` | native invocation with `{"event":"next-work","readOnly":true}`; candidate 18, fixture-only ordering and unknown real availability; no start |
| Ordinary next work | separate `next-work-prompt.txt` session | candidate process routes the ordinary request to the configured board skill; exact read-only input, candidate 18 and evidence limits; no start |
| No skill | same sequence in `no-skill` | no board requests or invocations |
| Unavailable | same sequence in `unavailable` | actual native resolution failure for `no-such-board`, visible scoped gap and continued fixture work |
| Delivery versus cwd | all CLI commands run from `other-cwd` | selected `fake-board` from explicit delivery tracker; never `wrong-board` |

Launch from the delivery fixture for native project discovery; its CLI commands
exercise the distinct `other-cwd` tracker control. Repeat configured, no-skill
and unavailable cases. Example native status runs:

```bash
cd /absolute/disposable/board-fixtures/claude/configured && claude -p --model claude-sonnet-5-5 --setting-sources project,local --output-format stream-json --verbose "$(cat prompt.txt)"
cd /absolute/disposable/board-fixtures/codex/configured && crew-codex task --background --write --model gpt-6.1-sol --effort low --skill sdlc-status "$(cat prompt.txt)"
```

For ordinary next-work routing, use separate new sessions with
`next-work-prompt.txt`. That prompt contains an ordinary request, no CLI command
or board-skill name; the candidate process owns routing:

```bash
cd /absolute/disposable/board-fixtures/claude/configured && claude -p --model claude-sonnet-5-5 --setting-sources project,local --output-format stream-json --verbose "$(cat next-work-prompt.txt)"
cd /absolute/disposable/board-fixtures/codex/configured && crew-codex task --background --model gpt-6.1-sol --effort low --skill sdlc-process "$(cat next-work-prompt.txt)"
```

Distinguish the evidence surfaces:

- CLI `SDLC_BOARD_DELEGATE` output proves the exact request was emitted. Node
  cannot issue a native Skill call. Manually dispatching that request can test
  the emitter/executor seam; it does not prove that the model dynamically chose
  and natively invoked the configured board skill from the candidate instructions.
- Dynamic native acceptance requires the transcript to show candidate loading,
  the model's configured-skill selection and exact event inputs, then successful
  native invocation that delivered the skill's instructions. Claude evidence is
  its `Skill` call and successful result plus the injected skill-content record
  that follows (next bullet group). Codex evidence is a real accepted structured skill input
  (`{type:"skill",name,path}`) and turn result; inspect `thread/read` with
  `includeTurns: true` where available. A file read, launch handle, fake reply
  token or reassuring prose proves neither invocation nor routing.
- Codex needs a capable native runtime. A child sandbox may be unable to launch
  an app-server or detached background job. Report that exact capability gap;
  it is not a passing case. Use the runtime's supported controls from a capable
  environment, with launch and await/result calls separate and at the same cwd.
  An acceptance-only transport bridge supplies only the evidence it actually
  demonstrates; it imposes no production transport or shim requirement.

No configured skill produces no board invocation. Unavailable native resolution
must leave a visible scoped board gap while fixture work continues. Next-work
must preserve ordering/evidence limits and never authorize start. Retain
transcripts in disposable storage and record scoped results in the owning PR;
explicit CLI next-work or manual dispatch alone cannot establish ordinary-request
routing. The entry skill owns next-work routing, so the status skill description
needs no expansion. Small independent fixtures may duplicate bounded setup;
this acceptance work does not require a shared test framework or extra refactor.

When the change concerns skill loading or main-session delivery, run it in a real
client session and read the transcript.

- A skill-source read (opening `SKILL.md`) is not a native invocation. In Claude,
  count the skill as invoked only when the transcript shows the Skill tool call
  and its returned launch result. For a Codex worker, the mechanism is the
  structured skill input: count it only when the launch evidence shows the
  accepted input (`crew-codex task --skill <name>`, resolved name and path) and
  the turn's result; a file read never substitutes. A job launch or skill
  discovery alone is not success.
- Invocation alone does not satisfy the loading contract: loading is a native
  invocation whose result delivers the full governing instructions and the
  concrete content of every reference the work makes mandatory. Check each as its
  own requirement in the transcript: the `Skill` call (or accepted structured
  skill input), its successful result, and the record that contains the
  delivered content. In Claude the content is not necessarily in the
  `tool_result`: the recorded Claude Code 2.1.305 `stream-json` session
  (`sdlc-process:sdlc-process`, claude-sonnet-5-5) returned only
  `Launching skill: sdlc-process:sdlc-process` as the `tool_result`
  (`tool_use_result: {success: true, commandName}`) and then a separate synthetic
  user record (`isSynthetic: true`, 184,972 bytes) that opens
  `Base directory for this skill:` and holds the full body, including
  `## Source adapter contract` and `Required stage completion`. The two records
  share no ID; correlate them by transcript order, skill name and base directory,
  and take delivery from the content record. A call and result without that
  following record, or a stored-transcript shape you have not read, leaves
  delivery unknown. A
  separate read of the same bytes is not required and never substitutes for the
  invocation; when invocation is unavailable, source reading is not a fallback
  load (report the capability gap). A result that only points to a source or
  reference for the reader to open is an incomplete payload and a load gap, even
  if the pointed source is later read. The sdlc-process native skills and the
  policy reviewer agent carry their pinned source, the supporting files and the
  process, record, planning, tracker and checkpoint sections named in
  `composition` (`tools/process-sources.json`) and the source adapter contract, so
  verify delivery by finding bundled markers in the result record (or the agent's
  own definition): the `## Source adapter contract` heading, a bundled dependency
  heading and a section the flow requires, such as `Required stage completion`
  or `Readiness and start rules` in the entry. The generator fails when a
  governing section is left as a link to read later. What remains linked are
  separately invoked skills (each needs its own native invocation), live project
  facts discovered from their owners, and pinned historical evidence;
  `sdlc-process/native-composition.json` lists each asset's bundled files with
  sizes and its cited sources. The sdlc-status and grok-crew-runtime skills and
  the grok-supervisor agent carry their operating contracts the same way
  (for example the `## Commands` and `## Launch recipes` headings), so no README
  read is part of their loading. An observer treats the call, result and
  subsequent content record together as the load and does not require a
  duplicate `Read` of the packaged source.
- Delivery is not permanent. Claude Code
  [re-attaches after compaction](https://code.claude.com/docs/en/skills) only the
  most recent invocation of each skill, the first 5,000 tokens of it, within a
  combined 25,000 tokens filled from the newest invocation, so older skills can
  drop entirely. The bundled references sit after the body in the large native
  skills and agents, so past the first 5,000 tokens they can be lost at
  compaction while the pre-compaction transcript still shows delivery. The
  generator does not prevent this and nothing in the transcript announces which
  rule was cut. Compaction was not exercised in this repair's native runs; treat
  delivery after a compaction boundary as unknown, and cite a later record of
  the rule being applied rather than the earlier invocation.
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
