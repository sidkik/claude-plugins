# Sidkik agent plugins

Portable SDLC process, status display and agent delegation for Sidkik.

Install **sdlc-process**, reload the client, and describe your work. The startup
hook directs agent-owned setup. If it does not begin automatically, tell the agent
**“Finish SDLC setup.”** The agent handles companions, verification and repairs. See the
[WSL setup guide](docs/setup.md) for the behavior and authentication boundaries.

In Claude, **`/sdlc-process:session-start`** prepares the current session and
returns its observer view before you assign work. It reports readiness separately
from native observer evidence; installation repair remains the setup workflow.

| Plugin | Purpose |
|---|---|
| [sdlc-process](sdlc-process/) | Shared SDLC instructions, Pocock flows, policy review and a native Claude main-session observer, with pinned source provenance. |
| [sdlc-status](sdlc-status/) | Per-session stage completion, evidence standing, blockers, next action and human decisions. |
| [codex-crew](codex-crew/) | Codex delegate agents for Claude, using the official Codex companion plugin. |
| [grok-crew](grok-crew/) | Launch, supervise and resume Grok work from Claude or Codex. |

The process remains authoritative in `sidkik/planning`; the process plugin is a
generated distribution. See its [refresh instructions](sdlc-process/README.md)
for turning maintained source changes into a reviewed, versioned plugin update.
Project architecture, environment and delivery conventions stay in their owning
repositories. GitHub remains intake, workflow and system of record.

For Claude, install `sdlc-process@sidkik-plugins` from the
`sidkik/claude-plugins` marketplace. Its startup hook reports missing setup and
loads an agent-owned repair path from the installed plugin. You do not need to
clone this repository or run setup commands yourself.
