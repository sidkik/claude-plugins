---
name: sdlc-status
description: Update or inspect this session's SDLC terminal projection when work starts, scope or phase changes, reviews return, a human decision is needed, or work stops.
---

Read [the plugin setup and state contract](../../README.md) before the first update. Locate `scripts/status.mjs` relative to this installed plugin; use Node 18 or later.

1. Establish the current CLI and session identity. Use its actual session ID for Claude/Grok. If unavailable, use an explicitly arranged launch token shared with the renderer. Codex uses the launch token. Never choose a repository-wide ID or another session's projection.
2. Read the owning GitHub work, current authorization and actual results. Write only the current display projection with `write --client CLIENT --session ID`, passing JSON on stdin through a quoted heredoc or structured process input. Completion: issue, reported phase, applicable skills/checks, next authorized action and human decision needs accurately reflect the current work.
3. Attribute skills as loaded/applied/pending and results to their reporting actor. Applied skills and passed/failed checks require concrete references. Reviewer attribution reports the referenced review; it does not authenticate the reviewer. Questions are questions, not approval. Tool success does not establish acceptance or human authorization.
4. Run `inspect --client CLIENT --session ID` after an update to check the user-visible account and references. Answer process questions from the owning records. Report unknown when the evidence or identity is unavailable.

Update at substantive changes, not every clarification. Keep failed and pending checks visible until their disposition changes. The projection is not an advancement gate, durable decision receipt or universal compliance claim. Do not refresh it simply to suppress a stale warning. Resume against actual work before reporting a fresh state.
