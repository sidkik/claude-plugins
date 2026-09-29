---
name: sdlc-observer
description: Verify or troubleshoot native observation of the foreground MAIN Claude session. Use when the user asks about SDLC observation or its status.
---

# Native MAIN observation

Claude setup selects the plugin's observed MAIN agent and enables the experimental observer feature for future sessions. Setup preserves the user's model, effort, tools, permissions, authentication, project instructions, and unrelated settings.

An existing custom `agent` setting conflicts with automatic MAIN observation. Preserve it and report the exact setup gap; the human chooses whether to replace that custom default. Never weaken permissions or silently start an unobserved session.

Distinguish configuration from runtime proof. Only a matching native `observer-ref` in the current session transcript proves the observer was active as of that record. Before the first record, report `starting`. Missing setup, a custom-agent conflict, or an unsupported Claude version is `unavailable`. A historical record is not a live heartbeat. Observation cannot attach to an existing session, so corrected setup takes effect after a fresh session starts.
