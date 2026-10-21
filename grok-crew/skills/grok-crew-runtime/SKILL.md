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
   and stderr paths. Use the [launch recipes](#launch-recipes),
   choosing read-only inspection or the authorized isolated-test/implementation
   permissions described below.
   Completion: a real Grok process has been launched with a recorded session ID,
   host job handle, scope, bounded poll interval, output paths and any justified
   job deadline with its source; a command proposal is not a run.
4. Supervise through the host's background/yielding handle with short bounded
   polls, continuing independent work and user updates. A poll timeout yields
   control; it does not kill the job. Use a total-runtime kill limit only from an
   existing explicit task budget or concrete documented resource constraint;
   preserve it without automatic extension. Follow [exact-session progress
   inspection](#check-progress-in-the-exact-session): compare recent
   tool calls/results with the pinned task's outstanding milestones. Quiet plain
   stdout, elapsed time, a PID or fresh reasoning/phase events do not establish a
   stall or productive progress. Distinguish pending permission, an outstanding
   tool and repeated errors; investigate the actual gap before intervention.
   Completion: process exit, status and actual final output are collected, or the
   precise interruption/blocker and partial work are accounted for. A deadline
   expiry is interrupted work, never a successful review.
5. Read stdout and stderr and inspect the reported artifacts. Exit zero alone is
   not success. Independently verify material findings, diffs and applicable tests
   under the repository's review contract. A supervising agent verifies execution (session identity, call/result
   correlation, terminal evidence); the parent still verifies substantive findings.
   Report the consolidated result to the
   user with the Grok session ID and remaining gaps. Do not claim a model's own
   success report proves completion.

## Reviewer-owned regression proof

Carry the complete governing review checklist and human scope into the brief;
coordinator assumptions are claims to test. Preserve substantive new findings
and applicable standards when a re-review is bounded to a correction.

For a governing code review permitting regression proof, select the isolated
workspace/acceptEdits mode at dispatch, with allowed test paths and commands.
Grok writes and runs the smallest focused regression needed for a behavioral
concern in that separate clean checkout at the pinned candidate. For WIP, pin
the base plus exact patch identity and apply that patch to the isolated checkout.
The primary prepares isolation and verifies the return; it does not write the
reviewer’s proof. Name allowed test/fixture files and authorized commands. Keep
production code unchanged; exclude shared worktree writes and live environment
changes. Use the workspace/acceptEdits recipe under [launch recipes](#launch-recipes) for
this authorized test mode. Those settings permit workspace writes, not a test-only OS boundary: the
file fence remains an instruction. Explicit human read-only/no-execution limits
win; retain unverified concerns and explain the precise capability gap instead
of bypassing the restriction.

Return each finding as a proven behavioral defect (candidate revision, proof
patch/path, exact command, expected behavior and observed assertion failure), a
static finding (source and violated criterion), or an unverified behavioral
concern (missing evidence/capability). Build/setup failures are not reproductions.
Duplication and other inspectable static violations need no artificial red test.
Stop once the test discriminates the claimed bug; retain the proof for the
implementer’s repair and subsequent green verification without applying it to the
delivery branch. Retract or revise a claim contradicted by its reproduction.

## Continue or change direction

Use `--resume UUID` with a new prompt file after the previous process exits. Keep
its checkout and permission scope explicit. `--session-id UUID` creates a new
conversation; it does not resume one. Avoid `--continue` for delegated work because
it selects by directory rather than the job identity. Resume restores conversation;
it does not restore code unless separately requested through Grok's restore tools,
and does not guarantee capture of an interrupted tool result. Inspect actual
calls/results and partial side effects before repeating work.

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

## Launch recipes

The accountable agent fills these values from the task and writes the actual
brief, rather than asking the user to assemble shell commands. `grok_prompt` is an
existing absolute prompt-file path; `grok_run` is an existing private session
scratch directory; `grok_checkout` is the chosen absolute checkout. Generate a
fresh UUID using the host's UUID facility and retain it as `grok_session`.

Read-only review or investigation, submitted through the host's background/yielding
command facility with a bounded initial yield and a retained job handle:

```bash
if grok \
  --cwd "$grok_checkout" --session-id "$grok_session" \
  --prompt-file "$grok_prompt" --no-subagents \
  --permission-mode plan --sandbox read-only --output-format plain \
  >"$grok_run/stdout.log" 2>"$grok_run/stderr.log"; then
  grok_exit=0
else
  grok_exit=$?
fi
printf '%s\n' "$grok_exit" >"$grok_run/exit-code"
```

A **poll timeout** bounds how long the host waits before yielding control; it does
not terminate Grok. Use short host waits (for example 10 seconds) and an active
supervision cadence that keeps the user informed. Do not run this as an unbounded
blocking foreground call. If the host cannot return a background handle, establish
that capability before launch.

A **job deadline** kills work. Add `timeout --kill-after=10s "$grok_budget"`
before `grok` only when an existing explicit task budget or a concrete documented
resource constraint supplies that limit. Retain its source and remaining budget;
there is no default total runtime limit. A healthy review taking longer than a
poll interval is not a reason to kill it. Preserve explicit user budgets without
automatic extension; report the affected work when one expires. Exit 124 from
GNU timeout means interrupted work, not a completed review.

For authorized implementation or [reviewer-owned regression proof](#reviewer-owned-regression-proof)
in a separate checkout pinned to the reviewed candidate, use the same invocation with
`--permission-mode acceptEdits --sandbox workspace`. Carry exact allowed files and
commands in the brief; permit necessary shell commands using narrowly scoped
`--allow` rules supported by the installed CLI, for example
`--allow 'Bash(node --test grok-crew/tests/example.test.mjs)'` for that actual test.
Do not use blanket auto-approval to work around a denial. If a command still needs
interactive approval, report the exact blocked operation and apply the host's
normal authorization handling. The workspace profile allows writes within its
checkout plus Grok state/temp; a prompt's path list is an instruction, not an OS
security boundary.

To continue, write the next brief and use `--resume "$grok_session"` **instead of**
`--session-id "$grok_session"`. Preserve the chosen permission/sandbox flags and
use new output files so the previous result remains available. Do not overlap runs
for the same session. The headless CLI invocation does not itself provide a steer
channel; interruption requires stopping and checking the owned job before resume.


## Check progress in the exact session

Quiet `--output-format plain` stdout is expected while work runs. At each
supervision check, inspect the host handle, stderr and the exact session's recent
events plus tool calls/results. Compare these with the pinned task's outstanding
milestones: for example, which named claims have acquired source evidence and
which review obligations remain. A PID, fresh timestamp, phase changes or reasoning
activity establish liveness only; they prove neither productive progress nor
completion. Repeated errors, an unanswered permission request and an outstanding
tool each need their own diagnosis. Let useful work continue within actual limits.

Installed Grok 1.0.34 was observed on 2026-09-28 to store sessions under
`~/.grok/sessions/<percent-encoded-checkout>/<UUID>/`, including `events.jsonl`
and `chat_history.jsonl`. Resolve the directory for the recorded UUID and confirm
its `turn_started.session_id` before inspection; do not select a directory's most
recent session. Recheck the schema if the version or storage configuration changes.
With `grok_session_dir` set to that verified directory, these bounded reads show
recent evidence without dumping reasoning or encrypted content:

```bash
tail -n 400 "$grok_session_dir/events.jsonl" | jq -c '
  select(.type == "turn_started" or .type == "turn_ended" or
         .type == "tool_started" or .type == "tool_completed" or
         .type == "permission_requested" or .type == "permission_resolved") |
  {ts,type,session_id,tool_name,tool_call_id,outcome,decision,wait_ms}'
tail -n 40 "$grok_session_dir/chat_history.jsonl" | jq -c '
  def preview:
    if type == "string" then
      {text: .[0:600], truncated: (length > 600)}
    else {schema: type, inspect_required: true} end;
  if .type == "assistant" then
    {type, content: (.content | preview),
     tool_calls: [.tool_calls[]? |
       {id,name,arguments: (.arguments | preview)}]}
  elif .type == "tool_result" then
    {type,tool_call_id,content: (.content | preview)}
  else empty end'
```

Content and argument previews are capped at 600 characters with explicit
truncation markers; IDs and tool names stay intact. Retrieve the exact relevant
record when a preview cannot establish what happened.

These are bounded windows, not a complete history or an automatic progress
verdict. If they contain only phase noise, a result without its call, or no relevant
change, inspect the missing task-specific range before diagnosing a stall. A
partially written JSONL record is incomplete observation: reread after the next
poll rather than claiming a runtime failure. Use equivalent bounded file reads
if `jq` is unavailable.

In this version chat records use top-level `type`, not `role`. An assistant's
`tool_calls` entries contain `id`, `name` and `arguments` (a JSON string); results
use `type: "tool_result"`, `tool_call_id` and `content`. Correlate those exact IDs.
Events use `ts` and `type`; `tool_completed` carries `tool_call_id` and `outcome`
(such as `success`). Observed `tool_started` and permission events lack call IDs;
never pair concurrent operations by position or tool name alone. An unresolved
request in a tail may have its resolution outside the window: inspect that range
before declaring permission pending. Read the actual call/result to distinguish
useful evidence gathering from repeated failures or irrelevant work.

A completed turn and final report still require the host's exit status and
independent result verification. After interruption, resume restores conversation;
it does not guarantee that an interrupted tool's result was captured. Inspect
retained calls/results and partial file changes before deciding what to repeat.

## Verified interface and limits

The launch flags were checked against installed **Grok 1.0.34** help on
2026-09-27. Recheck local help before relying on a different version. Public
[headless documentation](https://docs.x.ai/build/cli/headless-scripting) describes
the supported scripting route. Its session-ID summary differs from this installed
version: local help requires a fresh UUID for `--session-id`, and `--resume` for an
existing conversation. The examples follow that verified local contract.

[Permissions](https://docs.x.ai/build/features/permissions) govern tool approval;
[the sandbox](https://docs.x.ai/build/features/sandbox) limits filesystem/network
access separately. Read-only is not a promise that nothing anywhere is written:
Grok session state and temporary files remain writable. Managed settings can
constrain these flags. A launch must report actual runtime failures accurately.

Grok's TUI and native child-agent messaging are separate channels; this skill claims no runtime steering, approval enforcement or authenticated verification of agent reports. An official Claude bridge is optional and is not needed for direct CLI delegation.
