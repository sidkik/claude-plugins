---
name: session-start
description: Prepare the current Claude MAIN session when the user asks to start an SDLC session, with readiness checks, governing sources and an observer view. Separate from installation repair and substantive work.
---

# Prepare this session

Use this in the foreground MAIN conversation. Prepare the session and return its
readiness; this invocation does not assign new work. Optional work supplied by the
user: `$ARGUMENTS`. Empty or unexpanded arguments supply no work.

1. Read [the source adapter](../../SOURCE-ADAPTER.md), [the SDLC entry](../../bundle/.claude/skills/sdlc-process/SKILL.md) and its required [orchestrator](../../bundle/.claude/skills/orchestrator/SKILL.md) before work discovery. Establish the actual working directory and applicable repository instructions; the installed plugin directory is only a source location. Apply the adapter's source precedence. Discover owning GitHub work only for the issue, continuation or task the user actually supplied. A bare session-start request needs no issue creation, tracker search, route selection or implementation. Completion: loaded sources, repository context and supplied work (or none) are explicit.

2. Run the read-only doctor from the working directory: `node <plugin-root>/scripts/setup/agent-setup.mjs doctor --client claude`. Resolve the process and status plugin roots from the native plugin list, then read the installed status plugin's `skills/sdlc-status/SKILL.md` and `README.md`. Report setup gaps separately from observer runtime coverage using [the observer skill](../sdlc-observer/SKILL.md). If setup needs repair, identify [the setup skill](../sdlc-setup/SKILL.md) as the next action within existing authority; this session-start workflow makes no installation or configuration changes. Completion: readiness reflects the doctor's actual result, with unresolved capabilities scoped to their dependent actions.

3. Establish current MAIN identity. Claude's skill-body substitution is `${CLAUDE_SESSION_ID}`; it is not a shell environment variable. Use the matching `sessionMetadata` supplied in this plugin's SessionStart hook context for `sessionId` and `transcriptPath`. An unexpanded substitution is not an ID. If both native sources are present they must agree. If the hook path is unavailable but the native ID is known, locate only the exact `<sessionId>.jsonl` filename under the configured Claude `projects` directory; require one absolute MAIN path and records consistent with that session. Never select a newest transcript, infer identity from cwd, or borrow a worker's ID. Missing, ambiguous or conflicting identity holds only same-session widget/view operations; report the exact gap and complete other readiness checks. Completion: the actual MAIN ID and transcript are matched, or their absence is explicit.

4. Inspect the widget for that exact client/session. If work was supplied, follow the loaded status skill to initialize or update its real route and evidence, then inspect the same session again; a write alone is not verification. Preserve existing work until its identity is established. With no assigned work, report **widget waiting for work**: the current status runtime requires a real GitHub issue and has no unassigned projection. Leave existing projection bytes unchanged and identify any older displayed work as unchanged, not this readiness result. Completion: real work has a verified projection, or the unassigned display limitation is stated without a fabricated issue or stage.

5. Start or reuse the existing observer live view. First inspect any viewer URL/background handle already retained in this session. Reuse it only after a bounded GET of its `state` endpoint succeeds, matches the current MAIN `sessionId`, and does not report `coverage: unavailable`. Otherwise start `node <plugin-root>/scripts/observer-live.mjs serve --transcript <absolute-main-transcript> --session <actual-main-id>` through the host's supported background-process handle. Retain its emitted browser URL, stop URL and process handle in this conversation; verify the new `state` response in the same way. Shell-quote actual paths and IDs. A server start is only viewer readiness, and `coverage: complete` describes transcript parsing, not observer coverage. Empty native observer evidence is **pending**, and unavailable transcript coverage is an explicit gap. Completion: a same-session view is verified or its concrete failure is reported; no browser is opened automatically.

6. Return **SDLC: Ready** or **SDLC: Not ready** with loaded sources, setup gaps and widget disposition. This labels preparation, not work approval. Separately show **Observer: pending / observed / unavailable**; qualify observed with its native record timestamp. Include a clickable **Observer view** URL and the stop handle (`node <plugin-root>/scripts/observer-live.mjs stop --url <returned-stop-url>`), or their exact capability gap. Pending observation does not make independent SDLC work unready. With no work, end here and wait for the user's task; with supplied work, identify its next authorized action without executing it as part of preparation.

On the next user work turn, check the retained viewer's current state before
claiming observation, then follow the governing work route. Pending evidence
does not block independent work. A matching native launch or report establishes
activity only as of that record; it does not prove this initialization turn or
every later work turn was observed. Preserve the doctor's known first-turn
limitation. Session preparation is not a native observer fix or a guaranteed
warm-up sequence.
