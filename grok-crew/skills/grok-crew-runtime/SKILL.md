---
name: grok-crew-runtime
description: Delegate review, investigation or implementation from Claude Code or Codex to the Grok CLI; launch bounded work, collect results, resume a known session or stop owned work.
---

# Delegate to Grok

When the user asks to send work to Grok, perform that delegation using the host's
shell tool. Reuse existing scope and authorization; the user need not install a
bridge, construct a prompt or repeat permission already given. This skill works
from Claude Code and Codex. It uses the installed `grok` CLI directly; an official
Claude bridge is optional. It is not a new workflow engine or a `crew-grok` binary.

## Launch and return

1. Read the governing repository instructions and applicable orchestration skills.
   Establish the bounded task, owning checkout, permitted paths/actions and return
   criteria. For review, pin the base and candidate. For implementation, use an
   isolated checkout when concurrent edits would collide. Carry the actual skill
   paths and instruction precedence into the brief. Completion: Grok can act from
   that self-contained brief without guessing the parent's conversation.
2. Check `grok --version` and `grok --help` with a short timeout. Use the existing
   authenticated CLI; if readiness is unknown, `timeout 30s grok models` is a soft
   probe, not proof a model turn will succeed. Select a model only when requested
   or required by the governing instructions. If the binary, authentication or
   permission capability is unavailable, report that specific gap and preserve the
   brief. Do not launch installation or change global settings as a substitute.
3. Write the brief to a prompt file in the host session's existing scratch area.
   Include outcome, sources, allowed edits, skill reads, tests and required report
   (findings or changed paths, evidence, unresolved blockers). Keep durable work in
   its owning repository/issue; scratch prompts and logs need no repository commit.
   Set a new UUID for a new conversation, an absolute checkout and separate stdout
   and stderr paths. Use the [launch recipes](../../README.md#launch-recipes),
   choosing read-only review or explicitly authorized implementation permissions.
   Completion: a real Grok process has been launched with a recorded session ID,
   host job handle, scope, timeout and output paths; a command proposal is not a run.
4. Supervise through the host's running-command handle, yielding promptly so the
   parent can continue independent work and respond to the user. Poll boundedly;
   inspect output or actual file changes when diagnosing a stall. The wall-clock
   timeout bounds the run; exit 124 means timeout, not completion. A denied tool or
   auth error is a concrete blocker, not permission to bypass controls. Scope any
   correction to existing authority before resuming. Completion: process exit,
   status and actual final output are collected, or interruption/blocker is explicit.
5. Read stdout and stderr and inspect the reported artifacts. Exit zero alone is
   not success. Independently verify material findings, diffs and applicable tests
   under the repository's review contract. Report the consolidated result to the
   user with the Grok session ID and remaining gaps. Do not claim a model's own
   success report proves completion.

## Continue or change direction

Use `--resume UUID` with a new prompt file after the previous process exits. Keep
its checkout and permission scope explicit. `--session-id UUID` creates a new
conversation; it does not resume one. Avoid `--continue` for delegated work because
it selects by directory rather than the job identity. Resume restores conversation;
it does not restore code unless separately requested through Grok's restore tools.

A direct headless run has no in-flight message-injection command provided by this
skill. Choose one of these actual operations:

- **Queue:** retain a follow-up, wait for exit, then resume that UUID.
- **Interrupt:** stop only the owned host job/process group, verify it stopped and
  inspect partial side effects; then resume with the corrected brief if appropriate.
- **Steer:** requires a separately verified runtime capability. Grok TUI input and
  Grok's native child-agent messaging do not address this Claude/Codex-launched job.

Do not start two prompts against the same session concurrently or kill unrelated
Grok leaders/sessions. If the host cannot establish that owned work stopped, report
that uncertainty before launching a replacement that might duplicate its effects.
