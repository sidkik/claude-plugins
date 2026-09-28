# Portable setup on WSL

Install **sdlc-process** using your agent CLI's plugin interface. Reload its plugins
or start a new session once installation finishes, then describe your work normally.
The hook directs the agent to handle remaining setup, verification and repairs.
If it does not start automatically, tell it **“Finish SDLC setup.”** Some hosts
may disregard startup instructions; the visible hook message provides this
fallback. No repository clone or manual setup script is required.

For Claude, the plugin is `sdlc-process@sidkik-plugins` in the
`sidkik/claude-plugins` marketplace. Its SessionStart hook reports setup status to
you and supplies the agent with actionable diagnostics and the installed
`sdlc-setup` skill. The hook only reads state. The agent performs authorized
changes and verifies their results.

Codex discovers the same bootstrap skill; its native hook review/trust prompt
must be accepted by the human before hooks can run. A skill remains available
without hook trust. Grok uses the installed bootstrap skill when the host does not
run the hook. The agent chooses the actual host explicitly; inherited environment
variables from another CLI do not establish host identity.

## What the agent handles

- Installs/enables the named companion plugins through the host's supported CLI.
  Claude needs process, status, Grok crew, Codex crew and the official Codex
  companion. Codex needs process, status and Grok crew. Grok needs process/status.
- Reuses existing marketplace registrations, preserving unrelated plugins.
- Configures Claude/Grok footers and preserves previous command displays. Codex
  uses the status plugin's text workflow.
- Repairs prerequisites through supported installation methods within its existing
  permissions. Missing Node is reported even before the JavaScript hook can run.
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
