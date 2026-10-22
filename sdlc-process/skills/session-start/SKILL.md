---
name: session-start
description: Prepare the current Claude MAIN session when the user asks to start an SDLC session, with readiness checks, governing sources and an observer view. Separate from installation repair and substantive work.
---

<!-- source: maintained in this repository, tools/session-start/SKILL.md -->

> Source precedence: apply the [source adapter contract](#apply-packaged-sources-in-the-working-repository) at the end of this skill for working-repository ownership and source precedence.

# Prepare this session

Use this in the foreground MAIN conversation. Prepare the session and return its
readiness; this invocation does not assign new work. Optional work supplied by the
user: `$ARGUMENTS`. Empty or unexpanded arguments supply no work.

1. Apply [the source adapter](#apply-packaged-sources-in-the-working-repository); its contract is included at the end of this skill. Use Claude's native `Skill` tool to invoke `sdlc-process:sdlc-process` and its required `sdlc-process:orchestrator` before work discovery; the entry may invoke its dependency, so reuse that successful invocation rather than duplicating it. Each successful invocation result must itself deliver the skill's full governing instructions and the content of every reference it makes mandatory (the entry carries its process, record, planning and tracker content); no separate `Read` of a packaged source is required and none substitutes for the invocation. A result that only points to a source for the reader to open is an incomplete payload: record it as a load gap, because opening the pointed source is source inspection and does not complete the load. A file read, grep, discovery listing or this `session-start` invocation alone does not load those dependencies. Reuse a prior successful invocation in this session only with identified evidence, unchanged sources and its delivered content still in context; after loss or truncation of that content, invoke again. If a required invocation is unavailable, denied or fails, record that exact load gap and hold its dependent action; independent read-only checks may continue. Establish the actual working directory and repository instructions, applying the adapter's source precedence. A bare session-start request needs no issue creation, tracker search, route selection or implementation. Completion: successful required invocation results with their delivered content, repository context and supplied work (or none) are explicit.

2. Run the read-only doctor from the working directory: `node <plugin-root>/scripts/setup/agent-setup.mjs doctor --client claude`. Resolve the process and status plugin roots from the native plugin list. Invoke `sdlc-status:sdlc-status` and `sdlc-process:sdlc-observer` with the `Skill` tool before their widget/view actions; each result delivers its instructions, including the status contract, and no README or source read is needed or substitutes. Apply the same delivered-content, evidence-reuse and failed/unavailable-invocation rules as step 1. Report setup gaps separately from observer runtime coverage using [the observer skill](../sdlc-observer/SKILL.md). If setup needs repair, identify [the setup skill](../sdlc-setup/SKILL.md) as the next action within existing authority; session-start makes no installation or configuration changes. Completion: required loads are evidenced or explicitly unmet, and setup readiness reflects the doctor's actual result. Doctor ready verifies setup, not skill loading. An unavailable or unrun doctor leaves setup verification unmet and prevents Ready.

3. Establish current MAIN identity. Claude's skill-body substitution is `${CLAUDE_SESSION_ID}`; it is not a shell environment variable. Use the matching `sessionMetadata` supplied in this plugin's SessionStart hook context for `sessionId` and `transcriptPath`. An unexpanded substitution is not an ID. If both native sources are present they must agree. If the hook path is unavailable but the native ID is known, locate only the exact `<sessionId>.jsonl` filename under the configured Claude `projects` directory; require one absolute MAIN path and records consistent with that session. Never select a newest transcript, infer identity from cwd, or borrow a worker's ID. Missing, ambiguous or conflicting identity holds only same-session widget/view operations; report the exact gap and complete other readiness checks. Completion: the actual MAIN ID and transcript are matched, or their absence is explicit.

4. Inspect the widget for that exact client/session. If work was supplied, follow the loaded status skill to initialize or update its real route and evidence, then inspect the same session again; a write alone is not verification. Preserve existing work until its identity is established. With no assigned work, report **widget waiting for work**: the current status runtime requires a real GitHub issue and has no unassigned projection. Leave existing projection bytes unchanged and identify any older displayed work as unchanged, not this readiness result. Completion: real work has a verified projection, or the unassigned display limitation is stated without a fabricated issue or stage.

5. Start or reuse the existing observer live view by following the procedure in [the observer skill](../sdlc-observer/SKILL.md) for the MAIN ID and transcript from step 3; a native start is `node <plugin-root>/scripts/observer-live.mjs serve --owner-main --transcript <absolute-main-transcript> --session <actual-main-id>`. Retain its emitted browser URL, stop URL and process handle in this conversation. Shell-quote actual paths and IDs. A server start is only viewer readiness, and `coverage: complete` describes transcript parsing, not observer coverage. Empty native observer evidence is **pending**, and unavailable transcript coverage is an explicit gap. Completion: a same-session view is verified or its concrete failure is reported; no browser is opened automatically.

6. Return **SDLC: Ready** only when the required skill invocations above succeeded with their instructions delivered (or have valid same-session reuse evidence), and preparation has no required capability gap. Otherwise return **SDLC: Not ready** with each unmet requirement and its dependent action. List native load results (with whether each delivered its instructions) separately from source inspection, setup gaps and widget disposition. This labels preparation, not work approval. Separately show **Observer: pending / observed / unavailable**; qualify observed with its native record timestamp. Include a clickable **Observer view** URL and the stop handle (`node <plugin-root>/scripts/observer-live.mjs stop --url <returned-stop-url>`), or their exact capability gap. Pending observation does not make independent SDLC work unready. With no work, end here and wait for the user's task; with supplied work, identify its next authorized action without executing it as part of preparation.

On the next user work turn, check the retained viewer's current state before
claiming observation, then follow the governing work route. Pending evidence
does not block independent work. A matching native launch or report establishes
activity only as of that record; it does not prove this initialization turn or
every later work turn was observed. Preserve the doctor's known first-turn
limitation. Session preparation is not a native observer fix or a guaranteed
warm-up sequence.

On continuation, pivot or dispatch when a relevant source changed, reconcile the
installed/discovered revision with the actual path and source bytes returned by
the successful native skill invocation. Retain that invocation's result, and
that it delivered the instructions, as the load evidence. A plugin list,
update, doctor result or source read alone cannot establish that this session
reloaded. Reinvoke affected skills, whose results deliver the current content,
or state the exact load gap and hold only dependent activity; a source read does
not fill the gap. Reuse unchanged
loads with their identified evidence. Reconcile affected criteria before the
next dependent recommendation; build authority, ticket acceptance and readiness
remain separate. Maintain the widget at substantive events under the loaded
status contract, verifying a successful same-session update and inspection before
the next normal reply or dependent action. Report actual display failures and
capability gaps honestly; unchanged turns and pending tools need no heartbeat.

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
instruction and template files that body requires, the shared process,
specification, record, planning and tracker content that its flows make mandatory
(the whole process where the source directs reading it), and this contract.
Invoking one delivers all of that: the `Skill` result (or the agent's own
definition) is the content, so loading needs no separate read of any source file
and a read never substitutes for the invocation. Links that remain point to
separate assets or facts: other skills (invoke each by its name when the work
reaches it), live project facts such as tracker configuration, issue state,
ownership and repository documents (discover them from their owners when the
action needs them), and pinned historical evidence or the governed-context
proposal's identity (its governing sections are carried here). `native-composition.json`
lists every asset's bundled files with sizes and these cited sources. If a rule the
work needs is not in the delivered content, report a scoped load gap; do not
claim coverage of a rule you did not receive, and do not fill the gap from a
source read as if it were a load.

1. Establish the actual working repository and its Git remotes. Read its
   `AGENTS.md`/`CLAUDE.md`, configured `docs/agents/issue-tracker.md` when present,
   and applicable engineering instructions. The plugin installation directory
   is a source location, never the work's repository or checkout.
2. Natively load the SDLC entry and its required orchestrator dependency before
   route selection. Apply current user authorization and source precedence from
   the host. If a repository distributes a different shared-process revision,
   identify that conflict and its effect before the dependent action; installing
   a plugin does not silently revoke the repository's instructions.
3. The bundled tracker supplies Sidkik's GitHub mechanics. Resolve the owning
   delivery issue from its full URL and actual work scope. Planning documents
   belong to `sidkik/planning`, including single-repository work launched in a
   delivery checkout. Before writing them, natively invoke
   [work-artifacts](../work-artifacts/SKILL.md), whose result delivers the
   planning storage/publication convention. Delivery implementation, maintained technical
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
