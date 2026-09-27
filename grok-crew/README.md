# Grok Crew

Version **0.1.0** supplies a delegation skill for **Claude Code and Codex**. It
launches the installed Grok CLI for reviews, investigations and authorized edits,
collects its output, and resumes known sessions. No custom broker or official
Claude bridge is required. Read [the skill](skills/grok-crew-runtime/SKILL.md).

The host needs shell execution, an installed/authenticated `grok`, and a bounded
command runner. The recipes below use Bash and GNU `timeout`; use the host's
supported equivalent if unavailable. A manifest makes the skill package loadable;
it does not install the CLI, authenticate it or automatically install in Codex.
Claude users can install `grok-crew@sidkik-plugins` from the existing Sidkik
marketplace. In Codex, load this package through the configured plugin mechanism,
or read the skill's source when native discovery is unavailable.

## Launch recipes

The accountable agent fills these values from the task and writes the actual
brief, rather than asking the user to assemble shell commands. `grok_prompt` is an
existing absolute prompt-file path; `grok_run` is an existing private session
scratch directory; `grok_checkout` is the chosen absolute checkout. Generate a
fresh UUID using the host's UUID facility and retain it as `grok_session`.

Read-only review or investigation:

```bash
if timeout --kill-after=10s 15m grok \
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

Run through the host's background/yielding command facility and retain its handle;
the 15-minute limit is an example budget, not a mandatory minimum. Choose a bound
appropriate to the task. Read logs after completion or when inspecting a stall.

For authorized implementation, use the same invocation with
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

The optional [official Claude bridge](https://github.com/xai-org/grok-build-plugin-cc)
also shells out to Grok and adds its own job management. Its
[launch source](https://github.com/xai-org/grok-build-plugin-cc/blob/main/plugins/grok-build/scripts/lib/grok.mjs)
confirms that a bridge is not required for direct CLI delegation. Grok's TUI and
native child-agent messaging are separate channels; this plugin claims no runtime
steering, approval enforcement or authenticated verification of agent reports.

Use [behavioral trials](tests/behavioral-prompts.md) for fresh host-session checks.
They are evaluation inputs, not a claim that every host integration has passed.
