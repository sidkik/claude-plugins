---
name: orchestrator
description: How the primary thread orchestrates agent work in this repo — skill-grounded dispatch briefs, mandatory code reviews (reading code, never scanning), adversarial reviews for complex areas, verification of every self-report, follow-up discipline, and supervision. Load at the START of any session that will dispatch agents, and re-read before every dispatch wave.
when_to_use: Any multi-agent build — before writing the first dispatch brief, before accepting any agent report, before declaring any chunk done.
---

Read and follow [the packaged source](../../bundle/.claude/skills/orchestrator/SKILL.md) in full, and read the references it directs for the current action before performing the flow; report an unavailable required source as a scoped load gap. Before applying it, read [the source adapter](../../SOURCE-ADAPTER.md) for working-repository ownership and source precedence. This wrapper supplies discovery; it does not replace the source instructions.
