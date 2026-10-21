# Grok Crew

This plugin supplies a delegation skill for **Claude Code and Codex**. It
launches the installed Grok CLI for reviews, investigations and authorized edits,
collects its output, and resumes known sessions. No custom broker or official
Claude bridge is required. Read [the skill](skills/grok-crew-runtime/SKILL.md).

The host needs shell execution, an installed/authenticated `grok`, and a
background/yielding command runner. The skill's recipes use Bash; GNU `timeout`
is optional only when a justified total runtime limit exists. A manifest makes the skill package loadable;
it does not install the CLI, authenticate it or automatically install in Codex.
Claude users can install `grok-crew@sidkik-plugins` from the existing Sidkik
marketplace. In Codex, load this package through the configured plugin mechanism. Reading the
skill's source is not a load when native discovery is unavailable; report that gap.

## Supervisor agent

In Claude Code the plugin also supplies the visible `grok-crew:grok-supervisor`
agent (Sonnet, low effort, orange). It natively loads the runtime skill, launches
the real Grok CLI from the parent's brief, supervises the exact session until it
exits and returns the job, session and log paths with observed evidence. It adds
no broker: the skill remains the single source for flags, polling, progress
inspection, resume and stop rules, and the parent still verifies Grok's findings.

## Launch recipes, progress inspection and limits

These are the runtime contract, so the skill owns them and delivers them in its
own invocation result: the launch recipes (read-only, authorized implementation
or reviewer-owned proof, resume), exact-session progress inspection with the
bounded `events.jsonl` and `chat_history.jsonl` reads, and the verified CLI
interface and its limits. They are not duplicated here.
See [the skill](skills/grok-crew-runtime/SKILL.md#launch-recipes).

Use [behavioral trials](tests/behavioral-prompts.md) for fresh host-session checks.
They are evaluation inputs, not a claim that every host integration has passed.
