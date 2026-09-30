---
name: sdlc-observer
description: Verify or troubleshoot native observation of the foreground MAIN Claude session. Use when the user asks about SDLC observation or its status.
---

# Native MAIN observation

Claude setup selects the plugin's observed MAIN agent and enables the experimental observer feature for future sessions. Setup preserves the user's model, effort, tools, permissions, authentication, project instructions, and unrelated settings.

The managed observer covers MAIN only; worker delegation remains available without observer fanout. At native observer startup, a narrowly matched `SubagentStart` hook supplies the exact MAIN transcript identity and an ordered public-record baseline, excluding internal metadata and reasoning. The hook reads a snapshot up to 32 MiB and includes up to 256 KiB of public records at whole-record boundaries; exceeded limits and omitted public content are explicit. Claude may replace larger hook context with a preview and its native persisted-output path; the observer reads that exact normalized output before treating the baseline as loaded. Native output follows Claude’s retention; the plugin creates no independent archive. The observer consumes this history, then reconciles incremental digests; targeted reads resolve specific missing evidence. Incomplete or truncated history remains unknown and cannot prove an earlier prerequisite was skipped. This historical baseline does not repair native first-turn timing.

An existing custom `agent` setting conflicts with automatic MAIN observation. Preserve it and report the exact setup gap; the human chooses whether to replace that custom default. Never weaken permissions or silently start an unobserved session.

Distinguish configuration from runtime proof. Doctor's `ready` covers installation and configuration; its separate `observer` result reports runtime limitations and leaves activity `not-checked`. Claude Code 2.1.285 has a verified initialization defect: the native observer misses the first interactive MAIN turn. Report `known-missing` even when setup is correct. Setup repair or restarting that version cannot establish first-turn coverage; continue independent SDLC work. Other versions remain `unverified`, including newer releases, until evidence covers the first real interactive MAIN turn.

A matching native `observer-ref` or a delivered report with the exact native observer origin proves observer activity as of that record. Before either record, report `starting`; the compact footer uses the stricter `observer-ref` projection. Missing setup, a custom-agent conflict, or an unsupported Claude version is `unavailable`. Preserve the first-turn limitation alongside these activity states: a later record does not prove earlier coverage, and a historical record is not a live heartbeat. Observation cannot attach to an existing session, so corrected setup takes effect after a fresh session starts.

When the user requests observation visibility, start the packaged live view for one explicit MAIN transcript and expected session ID. Return its capability URL and stop handle; do not make the user copy files or configure a server. The view shows validated native launches, delivered findings, subsequent visible MAIN actions, and attributed outcome assessments. Treat no evidence as unknown, and state that recorded launch or activity does not prove every earlier turn was observed.

Assess a report only from cited MAIN record UUIDs after delivery; acknowledgment alone does not establish correction. Assessments live only in server memory until stop; native transcripts retain Claude's own retention.

Resolve the installed `sdlc-process` plugin root, then run its CLI with `node <installed-plugin-root>/scripts/observer-live.mjs`. Start `serve` with the agent's supported background-process handle and retain the emitted stop URL; the user should only need the returned browser link.

- `serve --transcript ABSOLUTE.jsonl --session SESSION_ID` prints the browser URL, assessment URL, and stop URL.
- `assess --url ASSESSMENT_URL --report UUID --outcome corrected|continued|disputed|unresolved --assessor ID --role ROLE --rationale TEXT --refs UUID,...` records an attributed assessment in memory. Use visible post-report MAIN record UUIDs for `--refs`.
- `stop --url STOP_URL` ends the view and discards its assessments.
