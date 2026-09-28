# Sidkik agent plugins

Portable SDLC process, status display and agent delegation for Sidkik.

Start with the [machine setup and update guide](docs/setup.md). It installs and
enables the selected clients’ plugins, configures the status display and opts
chosen repositories into the shared process while preserving existing settings.
CLI authentication stays on the machine; credentials and session history are
not part of this repository.

| Plugin | Purpose |
|---|---|
| [sdlc-process](sdlc-process/) | Generated shared SDLC instructions, Pocock flows, orchestrator and independent policy reviewer, with pinned source provenance. |
| [sdlc-status](sdlc-status/) | Per-session stage completion, evidence standing, blockers, next action and human decisions. |
| [codex-crew](codex-crew/) | Codex delegate agents for Claude, using the official Codex companion plugin. |
| [grok-crew](grok-crew/) | Launch, supervise and resume Grok work from Claude or Codex. |

The process remains authoritative in `sidkik/planning`; the process plugin is a
generated distribution. See its [refresh instructions](sdlc-process/README.md)
for turning maintained source changes into a reviewed, versioned plugin update.
Project architecture, environment and delivery conventions stay in their owning
repositories. GitHub remains intake, workflow and system of record.

For individual Claude plugin installation:

```sh
claude plugin marketplace add sidkik/claude-plugins
claude plugin install sdlc-process@sidkik-plugins
claude plugin install sdlc-status@sidkik-plugins
claude plugin install grok-crew@sidkik-plugins
claude plugin install codex-crew@sidkik-plugins
```

Individual installation does not configure the footer or opt a repository into
the process; use the setup guide for that. `codex-crew` also requires the official
`codex@openai-codex` companion plugin and authenticated Codex CLI.
