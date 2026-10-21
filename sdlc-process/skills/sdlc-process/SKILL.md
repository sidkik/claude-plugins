---
name: sdlc-process
description: Guide new work, bug reports, planning, continuations and delivery through Sidkik's Pocock-based SDLC. Discover the owning work, preserve decisions, choose the applicable existing skill and establish the next authorized action from an ordinary user request.
---

<!-- source: https://github.com/sidkik/planning @ 00a15fb8682612b6d8fbe9e603b561d42f8688b7 .claude/skills/sdlc-process/SKILL.md sha256:dcd98622faa76cf9272966b44bcaaf782f415124e0e212a01d87fd8ba82b7283 -->

> Source precedence: apply the [source adapter contract](#apply-packaged-sources-in-the-working-repository) at the end of this skill for working-repository ownership and source precedence.

# Follow the work

First, load [orchestrator](../orchestrator/SKILL.md) before selecting the route or investigating the work and its evidence. **Loading a skill requires a successful native skill invocation plus a full read of its packaged source and the references it directs for the current action.** In Claude, use the `Skill` tool with the available qualified skill name. For a delegated Codex worker the native mechanism is Codex's structured skill input (`{type:"skill", name, path}`; crew: `crew-codex task --skill <name>`). Claude evidence is the `Skill` call and its success; Codex evidence is the accepted structured input and its result, never a file read. The request must resolve to exactly one enabled skill at the worker cwd, and a plugin-qualified request keeps that qualified identity through resume and redirect; a missing, disabled or ambiguous skill holds the dependent launch. Launch or discovery alone is not success: the worker's return or transcript must show the native invocation evidence and the full source and reference reads. Discovery, grep, `Read`, `cat`, and opening `SKILL.md` are source inspection, not invocation. Record the actual invocation result; a requested or failed call is not a successful load. If native invocation is unavailable or restricted (including a host without that tool), report the exact capability gap and the inspected sources separately. Source inspection can support independent authorized work, but cannot satisfy a required load or justify a readiness claim; hold only the dependent action. Completion: required invocation and source-read evidence are established, or the unmet load and its dependent action are explicit. Loading this dependency does not require spawning agents.

At continuation, a task pivot or dispatch, verify each applicable skill's loaded qualified identity, resolved path and source revision/digest against the required source or installed release under the repository's source-precedence rules. Keep the invocation evidence and comparison in the existing continuity/work record. A plugin installation update alone does not reload a skill in the current session. Reuse an earlier successful invocation and full reads when the applicable bytes remain unchanged and compatible; a newer package version alone does not require reload or restart. When relevant governing instructions changed, natively load the applicable revision and read its source and directed references before dependent work. If that revision cannot be natively loaded, report the required identity/path/revision, the actually loaded identity/path/revision and the exact capability or resolution gap. Preserve existing work and scoped human authority, hold only actions needing the changed instructions, and carry them to a fresh capable session or authorized worker with the existing continuity record. Source reads cannot substitute for that load. Completion: each applicable load is verified or its exact gap and dependent hold are explicit.

This skill connects the existing Pocock activities to the [canonical process](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md). It is the session entry procedure, not another planning methodology. Consult the [tracker configuration](../../bundle/docs/agents/issue-tracker.md) and the process sections relevant to the current action. Reuse established context and unchanged sources; a new user turn does not restart session preparation or require rereading the entire process. For a read-only request to find the next work item, apply tracker ordering, ownership and availability checks, then report the candidate and evidence limits. Readiness/start and repair requirements become applicable when proposing or performing those actions; selecting an item alone neither requires those checks nor authorizes implementation.

For recorded issue route/stage changes, stage finishes and read-only next-work
requests, apply the canonical [repository board delegation](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#repository-board-delegation).
Resolve configuration in the delivery repository; the configured skill owns board
facts and actions. Its absence does nothing; an unavailable invocation is a scoped
board gap while authorized work continues.

## Required execution

Following the applicable process is mandatory. Establish the [route-specific stage checklist](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#required-stage-completion) and required skill load/application results before the governed work. The entry dependency above establishes `orchestrator` before route selection or evidence investigation. Retain every required criterion, including missing evidence; phase prose and skill names cannot mark a stage complete. Update the existing work record and any status projection from criterion results, with their source revisions and assurance.

Recover omitted authorized work. If a required criterion cannot be satisfied, pause its dependent action and explain the exact blocker and needed human resolution; continue independent authorized work. Apply the canonical correction/reassessment rule before another recommendation. Ask one prerequisite-ready question at a time under the Sidkik interview adaptation; investigate technical facts yourself. Reuse accepted decisions and batch coherent changes under the [convergence rules](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#converge-reviews-decisions-and-publication); ask again only on materially new evidence.

## Establish the current task

1. Read the user's desired outcome, scope and supplied sources. Locate matching work in GitHub and the owning document index before creating records. A new description need not include an issue. Discover its repository/initiative from evidence; ask only if ownership is materially ambiguous. Keep investigation moving while that answer is pending. The process's original initiative examples do not assign unrelated work to Core or its decision map.
   Starting in Core or another delivery repository is valid. Before writing a planning document, natively load [work-artifacts](../work-artifacts/SKILL.md) under the entry loading contract and read its linked [planning storage/publication convention](../../bundle/docs/work/agent-orchestration/process/planning-repository.process.md). Establish the artifact's repository and appropriate isolated checkout through that skill even for single-repository work; cwd and existing delivery files are not placement precedent. Keep code-context work independent while any planning-checkout/publication gap is held.
2. Read the actual current issue history, candidate documents and relevant decisions, following named pointers in full. Distinguish accepted intent/design, new suggestions, current implementation and observations. Pin relevant source identities, revisions/digests, standing and gaps in the existing work record. Use OpenViking for discovery when available; retrieve canonical sources before relying on a claim. An absent context service does not prevent direct source reading.
3. Establish whether this is new work, an active continuation or a reviewed return. Check accountable ownership and existing claims. Use the [continuity procedure](../../bundle/docs/agents/sdlc/records.md) before taking writing ownership from another session. A fresh session cannot claim a shared branch merely by finding it.
4. Name the current phase, its unresolved question and smallest authorized next action. Reuse the user's existing authorization and applicable scoped human decisions. Draft documents can support discussion, proposal writing and expressly authorized bounded work; their draft label does not erase those decisions. Record unknown authority as unknown for the affected action. Marking the whole process accepted requires its separate revision-bound adoption receipt.
   Distinguish authority to build the scoped behavior, approval to publish the specific ticket/packet, and readiness/start evidence. Trace each to its actual decision or criterion in the existing record. A missing publication approval or readiness result does not erase established build authority; build authority alone supplies neither publication approval nor readiness. Ask only for a genuinely unresolved scoped human choice.

Completion: the session can explain what this work is, which sources govern it, what remains unresolved and what action is currently justified. Do the resulting work; do not stop at presenting a route.

## Compose Pocock from the actual situation

Use [ask-matt](../ask-matt/SKILL.md) for source inspection when needed to identify the applicable flow; inspecting a router is not executing the selected flow. Sidkik's installed workflow skills are model-invocable, so the user's ordinary request is enough: **load the selected flow yourself** with its qualified installed name (for triage on Core #546, `sdlc-process:triage` with the issue URL) under the entry loading contract, then perform it within the user's authorization and the flow's own human decisions. Do not ask the user to type a slash command, and do not read-and-follow a skill as a substitute for invocation. Loading a flow supplies its instructions only; it grants no authority, answers no human decision and permits no external write the user has not authorized. If the native tool reports that only the user can invoke a skill (a third-party or host restriction), report that exact gap with the copyable slash command using the installed qualified name and current work reference, wait for the user's invocation, hold only the dependent flow and keep the selected issue and decisions for resuming. If no valid invocation is exposed, state the missing capability rather than inventing a slash command. Completion: the selected flow has actual invocation evidence, or the exact restriction or capability gap is reported and the dependent action held.

| Situation | Load and perform | Completion boundary |
| --- | --- | --- |
| Raw incoming issue | [triage](../triage/SKILL.md) and its brief | Verified intake disposition and next recipient; complete [workspace cleanup](../../bundle/docs/agents/sdlc/records.md#finish-triage-and-clean-up-the-workspace) when triage finishes. Synthesized delivery children need no repeat triage. |
| Bounded repo-backed idea | [grill-with-docs](../grill-with-docs/SKILL.md), [grilling](../grilling/SKILL.md), [domain-modeling](../domain-modeling/SKILL.md) | Resolve prerequisite-ready choices with the human and preserve the agreed vocabulary/decisions. Research facts yourself or through a bounded helper. |
| Uncertainty exceeds a session | [wayfinder](../wayfinder/SKILL.md) and its dependencies | Chart a destination and native tracker decision map, or resolve the next claimed frontier decision. Preserve chart/resolve separation and its one non-research decision per session limit. Hand a clear map to synthesis. |
| A missing fact or design observation | [research](../research/SKILL.md) or [prototype](../prototype/SKILL.md) | Retain evidence that answers the named question. A reliability experiment uses the process's technical-spike contract and actual dependency; prototype polish rules do not establish production fitness. |
| Reported broken behavior | [triage](../triage/SKILL.md), then [diagnosing-bugs](../diagnosing-bugs/SKILL.md) only for a named unresolved diagnostic gap | Apply the process's [bug-intake contract](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#bug-intake-establish-the-defect-then-preserve-redgreen): verify current behavior and related integrated fixes first. A supported already-fixed disposition goes to authorized closeout. Use [VE-BUG1–3 and RS-BUG1](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#reproduction-complete-and-ready-for-repair) to distinguish reproduction complete from ready for repair. Once reproduction completes, carry it forward; further minimization or ranked hypotheses are not prerequisites. A routine bug needs no feature map; specific alternative verification retains its own approval requirement. |
| Resolved intent/design | [to-spec](../to-spec/SKILL.md), then [to-tickets](../to-tickets/SKILL.md) when decomposition is needed | Synthesize criteria and public verification seams; prepare safe vertical delivery slices with genuine blocking edges. Present the agent-reviewed combined preparation packet for the human's decision on exact parts/revisions. |
| Authorized delivery assignment | [implement](../implement/SKILL.md), [tdd](../tdd/SKILL.md), delivery-repository specialist instructions | After readiness and start checks, implement at agreed seams; produce applicable build, red/green or alternative-verification and live QA evidence. Live QA on a local runtime environment follows the [local environment rules](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#local-runtime-environments-select-own-validate-and-clean-up). |
| Completed implementation seeking review | [code-review](../code-review/SKILL.md) and the [orchestrator review contract](../orchestrator/SKILL.md#reviews--mandatory-skill-grounded-code-reading) | Independent Standards and Spec findings against the fixed base, exact diff and criteria/evidence, with reviewer-owned proof where feasible. Missing implementer QA returns to its owner before this gate. |
| Session/harness/directory boundary | [handoff](../handoff/SKILL.md), [phase-boundary guidance](#bundled-agents-skills-ask-matt-phase-boundaries-md), [continuity procedure](../../bundle/docs/agents/sdlc/records.md) | Exact offered bytes and explicit receiving acknowledgment, with unanswered questions, writing ownership and [local environment custody](../../bundle/docs/agents/sdlc/records.md#retain-local-environment-custody) retained. |

The [Sidkik adaptations](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#invocation-evidence-and-sidkik-adaptations) govern generic publication, integration-branch and automatic ready-label defaults. Documents and handoffs use work-artifacts, with substantial human review in a document PR; issue comments hold concise decisions and receipts. Configured GitHub operations replace local/beads fallbacks. Vertical slicing covers the actual accepted repository scope, including frontend only where that scope requires it.

## Advance with evidence

Before an actual advancement, use the [checkpoint boundaries](../../bundle/docs/work/agent-orchestration/workstreams/context/governed-context.spec.md#policy-agent-checkpoints-across-the-process) to name the proposed action and obtain an independent [sdlc-policy-review](../sdlc-policy-review/SKILL.md) assessment. An ordinary question, agreement receipt, progress/blocker report or authorized correction within the current step is not a new checkpoint. A decision resolving a policy hold or changing an applicable control requires affected reassessment before dependent work. Apply the already-loaded [orchestrator](../orchestrator/SKILL.md), including its dispatch refresh rule, and use the [reviewer definition](../../agents/sdlc-policy-reviewer.md) as its brief. Supply underlying history and exact artifacts, not just your account of compliance. Reading sources and performing already-authorized refinement or corrective work within the present step do not each create a new process transition.

Apply the process's [stage and projection boundaries](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#required-stage-completion) when continuing from triage or updating the widget, and its [bug-intake scope](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#bug-intake-establish-the-defect-then-preserve-redgreen) when delegating reproduction work. These distinguish investigation, status bookkeeping and actual repair execution.

Record the assessment and disposition before acting. A missing reviewer or required evidence holds the affected transition; record the unavailable capability and continue independent authorized work. Reuse a prior assessment for unchanged applicable inputs and actions it explicitly covers, with a stated basis. A bounded readiness/start or publication/integration sequence can share one assessment under the checkpoint contract; verify its outstanding conditions before each action. A reviewer cannot assess its own assessment recursively or authorize human choices. Record the accountable session's actual action and resulting state; a pass alone is not proof the action occurred.

When a checkpoint was missed, retain that omission in history and assess the next affected advancement against the actual work, current evidence and prior scoped human decisions. Preserve completed work and unchanged build authority while correcting missing evidence or briefs within the authorized step. A later assessment cannot retroactively mark the missed checkpoint passed. Name the affected hold and resume condition; obtain affected reassessment before advancing, without requesting repeated blanket build approval. A new human decision is needed only for an unresolved authority choice, changed scope/architecture or permitted exception that actually requires it.

Use the canonical [readiness and start rules](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#readiness-and-start-rules): assess each required contract control, then separately check native order, completed blockers, current authorization and actual allocated resources. At every new selection reconsider higher work and record unavailable-item skip reasons. Reordering changes future selections only; it leaves in-flight work, including waits, intact.

For proposed or changed architecture, present a concrete proposal with alternatives, impacts and evidence for the human's revision-bound decision. Internal implementation choices remain within delegated scope. A completed preparation packet or agent endorsement supplies neither architecture approval nor permission to start.

## Continue through changes and completion

Apply [change handling](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#revisions-and-refinement-during-work) when a source, answer or implementation changes: identify affected criteria/consumers, preserve prior evidence and pause dependent work only. Routine failures and rebasing the implementation branch onto current main are implementer repair work within accepted scope; main wins. Fundamental architecture, behavior or outside-scope changes require the revised human decision. Correct findings and repeat affected policy/QA checks before continuation.

Follow the [reporting contract](../../bundle/docs/work/agent-orchestration/process/orchestration.process.md#human-decision-requests-and-accountable-reports) through the [shared record procedure](../../bundle/docs/agents/sdlc/records.md). Consolidate helpers into the accountable session's return. Complete delivery only when reviewed and validated integrated main is deployable with the required evidence/dispositions. Complete [closeout](../../bundle/docs/agents/sdlc/records.md#close-out-delivered-work), including [workspace cleanup](../../bundle/docs/agents/sdlc/records.md#finish-triage-and-clean-up-the-workspace) and any owned local environment, in the same authorized delivery sequence and prepare its release handoff; the human controls release timing/promotion. An agent exit, merge, deployment request or green unit suite alone does not establish that completion.

## Bundled required dependencies

The instructions above require the following pinned files. They are included here so this invocation loads them; separately invoked skills are not.

<a id="bundled-agents-skills-ask-matt-phase-boundaries-md"></a>
<!-- source: https://github.com/sidkik/planning @ 00a15fb8682612b6d8fbe9e603b561d42f8688b7 .agents/skills/ask-matt/PHASE-BOUNDARIES.md sha256:a8aa20158609ef39e2b308b6ba0660c91066838d07a867202e63a7744a88a3ed -->

### Phase boundaries

A **phase** is a chunk of work inside a session: the grilling, the implementation, the QA. The definition is fuzzy on purpose: a phase ends when you think *"ok, we're done with that"*.

The **phase boundary** is the gap between two phases, and it is the only place this decision belongs. Mid-phase there is no decision to make: continue, or split the work that's left into subagents. Compacting mid-phase makes the agent lose the thread.

#### The five options

| Option       | What it does                                                    |
| ------------ | --------------------------------------------------------------- |
| **Continue** | Stay in the session. No context switch at all.                    |
| **`/clear`** | Empty the context window and start from nothing.                  |
| **`/handoff`** | Write a portable markdown file and seed a session anywhere with it. |
| **Subagent** | Send the task to its own context window and get a report back.     |
| **`/compact`** | Compress this context and seed a fresh session with the summary.  |

#### The tree

Work top to bottom at the boundary. The first **yes** wins.

**1. Can you continue in this session?** Two things make the answer yes: the next phase needs this phase as a **primary source**, or you have enough [smart zone](https://www.aihero.dev/ai-coding-dictionary/smart-zone) left (~150k tokens) for the next phase to fit. Grilling → implementation is the standard yes: the implementation wants the reasoning verbatim, not a summary of it. Continue costs nothing and loses nothing, so rule it out before anything else.

**2. Is the context irrelevant to what comes next?** Is everything in this session (the exploration, the decisions, the dead ends) disposable? If so, **`/clear`**. It is the cheapest move on the board: it takes no time and hands back the whole window. `/clear` also isn't terminal: the old session stays resumable.

The cost of getting this wrong is one-way. Clear a *relevant* context and you lose the **why** behind what you built, and no amount of reading the diff back gets it returned.

**3. Do you need to hand off?** `/handoff` is narrow. You need it only when you are:

- swapping to a **new harness** (Claude → Codex),
- moving to a **new directory** or repo,
- sending the work to a **colleague**,
- or forking a side task you found **mid-phase** without derailing what you're doing.

That list is the whole clause. What `/handoff` buys is **portability**: a file that travels. If nothing is travelling, you don't need it.

**4. Can the task be done AFK?** Is it scoped tightly enough to run with you away from the keyboard, no steering? Then send it to a **subagent** and leave this session untouched. Automated review is the standard case: the agent reads the diff and reports, and you aren't needed while it does.

**5. Otherwise, `/compact`.** Relevant context, same harness, same directory, and you need to stay in the loop: this is where the tree lands, and it lands here often. Pass it an instruction (`/compact we're going to QA this area`) so the summary keeps what the next phase needs.

`/compact` is the **default, not the first reach**. It sits at the bottom because the four questions above it are all cheaper or more precise. The failure mode when people start here is a fresh session that is confidently wrong about a decision the summary flattened.

#### Primary and secondary sources

Every move except **Continue** turns a **primary source** into a **secondary source**: the session as it happened, replaced by a summary of it. The trade is always the same shape:

| Source                            | Information | Noise | Room to move |
| --------------------------------- | ----------- | ----- | ------------ |
| Primary (Continue)                | Full        | Lots  | Little       |
| Secondary (`/compact`, `/handoff`) | Lossy       | Less  | Lots         |

This is why question 1 comes first. You only pay the lossiness when staying costs more than it saves.

#### These are judgement calls

The questions are not objective: each has taste in it, and the same boundary can go two ways on two days. The value is in asking them **in order**, at the boundary rather than in the middle of the work.

## Source adapter contract

<!-- source: maintained in this repository, sdlc-process/SOURCE-ADAPTER.md -->

### Apply packaged sources in the working repository

The bundle is a generated, revision-pinned distribution of shared instructions.
Its source manifest records each upstream repository, commit and byte digest.
Update the canonical source, then regenerate the package; native skills and
agents are generated outputs and are never edited directly. Managed planning
documents retain their canonical owner and become provenance-bearing snapshots
in this distribution.

Native skills and agents contain their instructions; they are not pointers. Each
has the pinned source's frontmatter, its full pinned body, the supporting
instruction and template files that body requires, and this contract.
Invoking one loads all of that: the `Skill` result is the packaged source, so a
separate read of the same file adds nothing and never substitutes for the
invocation. Links that remain are not bundled: other skills (invoke them), and
canonical process, specification and record documents under `bundle/`
(read the sections the current action relies on). `native-composition.json`
lists every asset's bundled files and retained links with sizes. Report a
retained rule you needed but could not read as a scoped load gap; do not
claim complete coverage of a rule you did not read.

1. Establish the actual working repository and its Git remotes. Read its
   `AGENTS.md`/`CLAUDE.md`, configured `docs/agents/issue-tracker.md` when present,
   and applicable engineering instructions. The plugin installation directory
   is a source location, never the work's repository or checkout.
2. Read the packaged SDLC entry and its required orchestrator dependency before
   route selection. Apply current user authorization and source precedence from
   the host. If a repository distributes a different shared-process revision,
   identify that conflict and its effect before the dependent action; installing
   a plugin does not silently revoke the repository's instructions.
3. The bundled tracker supplies Sidkik's GitHub mechanics. Resolve the owning
   delivery issue from its full URL and actual work scope. Planning documents
   belong to `sidkik/planning`, including single-repository work launched in a
   delivery checkout. Before writing them, natively invoke
   [work-artifacts](../work-artifacts/SKILL.md) and read its linked planning
   storage/publication convention. Delivery implementation, maintained technical
   documentation, implementation evidence and implementation-session continuity
   retain their delivery owner; a sufficient small repair brief can remain
   issue-owned. This does not reassign implementation issues to planning.
   Discover the actual configured owner before creating work.
4. Resolve engineering instructions through their configured canonical owner.
   Follow the working repository's explicit ownership/migration configuration
   and applicable user decisions for architecture, testing and local-development
   rules, specialist briefs and maintained governing references. When that owner
   is an engineering plugin, use its canonical sources or exact installed bundle
   for those instructions. From any starting repository, route contributions to
   the plugin-owned sources to the owner's authorized checkout; generated bundles,
   native skills and agents remain distribution outputs.
   For Core's explicitly adopted migration, `sidkik/core-plugins` owns these
   engineering instructions under `core-engineering/source`. Legacy Core copies
   of migrated instructions cannot silently override that authority; report
   conflicts before dependent work. This scoped migration preserves unrelated
   repository instructions and does not require other repositories to depend on
   the private plugin.
   The working delivery repository retains implementation code and tests,
   runtime/configuration and live environment, tool and operational facts.
   Observe its write boundaries and the source owner's separate write boundaries;
   a starting directory does not authorize writes to another checkout. Runtime
   commands come from the installed crew runtime documentation and skills.
   Report missing source access or capabilities for the affected action; a plugin
   does not grant permissions or authenticate a CLI.
5. Preserve Pocock's pinned sources and Sidkik's deliberate invocation-only
   adaptation: the Pocock workflows are model-invocable, so invoke the selected
   flow natively from the user's ordinary request; loading grants no authority
   and decides nothing for the human. For a skill still restricted to the user,
   follow the SDLC entry's handoff: provide the actual installed slash command
   with the current work reference and wait for the user's invocation. Source
   inspection may identify that command; it cannot replace invoking or
   authorize executing the flow. If no valid invocation is exposed, report the
   capability gap and hold only dependent work. Sidkik's process
   and tracker adaptations govern local-tracker defaults. Optional flows named
   by the broader Pocock router but absent here remain unavailable until their
   actual source is installed; never claim to have applied a missing skill.

Historical research and decision pointers are immutable upstream links. They
supply provenance when relevant; installed local sources supply required process
steps. A private GitHub link still requires access. This package provides agent
instructions, not authenticated enforcement or a workflow engine.
