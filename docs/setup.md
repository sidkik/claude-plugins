# Portable setup on WSL

Install **sdlc-process** using your agent CLI's plugin interface, then reload its
plugins or start a new session. Ask **“Finish SDLC setup”** for installation
verification and authorized repairs, or use **`/sdlc-process:session-start`** for
session readiness. Opening a session runs neither workflow. No repository clone
or manual setup script is required.

For Claude, the plugin is `sdlc-process@sidkik-plugins` in the
`sidkik/claude-plugins` marketplace. Its SessionStart hook is silent and passes
only native session identity and transcript metadata to the agent. It performs
no plugin discovery, readiness checks or setup instructions. Missing Node or
metadata does not produce a startup warning. Explicit readiness/setup workflows
report their actual capability gaps; governed work still follows the required
process and repository instructions.

Codex discovers the same setup skill; its native hook review/trust prompt
must be accepted by the human before hooks can run. A skill remains available
without hook trust. Grok uses the installed setup skill on request.
The agent chooses the actual host explicitly; inherited environment
variables from another CLI do not establish host identity.

## What the agent handles

- Installs/enables the named companion plugins through the host's supported CLI.
  Claude needs process, status, Grok crew, Codex crew and the official Codex
  companion. Codex needs process, status and Grok crew. Grok needs process/status.
- Reuses existing marketplace registrations, preserving unrelated plugins.
- Configures Claude/Grok footers and preserves previous command displays. Codex
  uses the status plugin's text workflow.
- Repairs prerequisites through supported installation methods within its existing
  permissions. Explicit setup identifies missing Node through the host's shell.
- Adds or repairs repository entry instructions when that repository is within
  the user's requested SDLC scope. Installing a plugin does not silently replace
  unrelated repository policies.
- Verifies installed resources, source hashes, effective enablement, footer and
  applicable authentication status; reports precise remaining gaps.

Authentication and native hook trust require the human. The agent identifies the
specific login or review prompt when needed. Missing a worker's CLI or login holds
that worker's execution, while independent planning can continue. Structural
verification cannot certify that an agent actually followed the process.

Existing repository-local settings that disable a required plugin remain visible
conflicts. The agent resolves their actual scope and authority; setup never
silently changes managed policy. Failed setup is reported with its affected
capability, not as a successful installation.

## See the Claude observer

Run **`/sdlc-process:session-start`** to prepare a Claude MAIN session before
assigning work. It reads the governing sources, checks readiness, and returns a
clickable observer view with a stop handle. It reuses a verified same-session
view when available and does not open a browser automatically. An optional issue
or task lets it initialize the actual work projection; with no assigned work it
reports **widget waiting for work**, preserves existing state and ends after
readiness. The current widget requires a real issue and has no unassigned state.
Installation or repair remains the separate setup workflow.

Native observer evidence can still be pending during this preparation turn.
The agent checks again on the next user work turn before claiming observation.
Session preparation does not fix the runtime limitation described below.

On Claude Code 2.1.284 or newer, agent-owned setup installs managed local
agent definitions from the process plugin and enables the native observer
experiment. Claude's current plugin-agent loader does not preserve observer
attachment fields, so setup handles that local adapter for you. The main agent's
body stays empty to preserve Claude's normal coding instructions, chosen model
and permissions; the observer uses Haiku. Existing custom-agent selections and
unmanaged files are preserved and reported as scoped conflicts.

Start a fresh Claude session after setup. A plugin reload does not establish
attachment to an already-running main session. In the SDLC footer:

- **Observer: starting** means setup requested observation but runtime evidence
  has not appeared yet. Initial activity may precede observer startup.
- **Observer: seen … ago** means this session's native observer record was found.
  This is timestamped observation evidence, not a live heartbeat or proof of compliance.
- **Observer: unavailable** means observation is not established for this session.
  Ask the agent to check the installed `sdlc-observer` skill and setup diagnostics.

Doctor's `ready` result and exit status describe installation and configuration.
Its separate `observer` result reports **known-missing** first-turn coverage on
Claude Code **2.1.285**: the native observer misses the first interactive MAIN
turn even with correct setup. Setup repair cannot fix that runtime defect.
Continue independent SDLC work while this limitation remains. Other versions,
including newer releases, report **unverified** until their first real interactive
MAIN turn is shown to reach the observer. A later observer record does not supply
that evidence; doctor itself does not check active observation.

Claude's agent panel shows `sidkik-sdlc-observer` for the detailed native view.
Useful corrections arrive in the main conversation through `ObserverReport`.
The observer is advisory: it can identify an unsupported claim or unnecessary
process gate, but it cannot approve work or replace independent checkpoint review.
Codex and Grok retain the shared process/status capabilities; this release does
not claim a native observer for those hosts.

The widget labels route scope so **Triage complete** cannot be mistaken for
**Delivery complete**. It can show a pending delivery start while an actual
execution hold remains. Agents use the atomic `record` operation for changed
facts and the returned inspection instead of repeating full-state edits.

## Updates

Ask the agent to update the SDLC plugins. It uses the setup runtime inside the
installed process plugin, updates through the registered marketplace and verifies
with the current installed runtime. It will tell you if a client restart/reload
is required. It does not require the original release checkout.

Maintainers change canonical planning documents, review them, regenerate the
pinned bundle and publish a new plugin version. The setup skill and runtime are
maintained in `tools/setup` and copied by the same checked generator. Generated
copies are not an independent source of instructions.

## Existing installations

The prior checkout-based setup remains supported for existing managed installs.
The new agent path discovers native installations directly and migrates an
existing repository's marked entry without its old source checkout. Its renderer
lives separately from the legacy runtime, preserving older entry integrity checks.
Only the requested repository is migrated; other repositories keep their entry.

Per-machine configuration remains under `$HOME/.local/share/sidkik`, honoring
`CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `GROK_HOME` for client settings. The agent
preserves surrounding configuration and instruction text. Credentials, transcripts
and private session histories are never distributed with plugins.

This path targets Linux inside WSL. Native Windows and macOS are not qualified.
