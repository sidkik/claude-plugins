---
name: report-work
description: Report what you are working on to your session supervisor so people can see live work status. Use when work starts, when its objective changes, when a blocker or handoff arises, when you start working against a GitHub issue or project board, and when you finish.
---

# Report work

Your supervisor shows people what each native session is working on. You feed it with a short, true report of your current work. It works for any kind of work and any process: conversation, troubleshooting, delivery, research.

## Report

Run the script. Identity (which session you are) comes from the environment the supervisor gave you; you supply only the work facts.

```
node "${CLAUDE_SKILL_DIR}/scripts/report-work.mjs" --title "<short title>" --kind "<kind>" --activity "<what you do now>"
```

The script sits beside this `SKILL.md`. If the path above reaches you unexpanded, use the base directory shown when this skill launched.

Flags, all optional but at least one required; each report replaces your previous one, so repeat the facts that still hold:

- `--title` short name of the work.
- `--kind` free text such as `conversation`, `troubleshooting`, `delivery`, `research`.
- `--project` the project or repository the work belongs to.
- `--process-ref` where your process lives, as free text or a URL.
- `--activity` one short line on what you are doing right now.
- `--issue-url` the issue you work against.
- `--board-url` the GitHub Projects v2 board you work against.
- `--evidence` a link to proof of progress; repeat the flag for more, up to 16. Each value stays within 2048 bytes.

## When

Report at these moments only:

1. Work starts: title, kind and project you know.
2. The objective changes, a blocker appears, or you hand off.
3. You discover the issue or board the work belongs to: add `--issue-url` or `--board-url` then, and only if you actually work against that issue or board. A guessed or merely related URL stays out.
4. Work finishes: say what ended, with evidence links.

State flows from you to the supervisor on these events. The supervisor and its readers observe the rest; checking status, polling or reporting on a timer adds nothing.

## Content

Keep `--activity` to one short line. Report only what is true now: facts you have observed or done, in the present tense. Leave out a flag whose fact you do not have.

## Done

The script prints `reported: ...` and exits 0. A non-zero exit prints the reason on stderr: exit 2 means this session has no endpoint or the flags were wrong, exit 1 means the supervisor was unreachable or rejected the report. Treat a failed report as unreported, tell the user once, and continue the work; fix flags and retry only when the message says the flags were wrong.
