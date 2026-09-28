# Portable setup on WSL

Install the same released process and agent tooling into each WSL instance. Each
instance authenticates independently. Setup copies release plugins and its own
runtime; it does not copy credentials, conversation transcripts or another
machine's configuration directory.

## Install

Use Linux inside WSL, Node.js 18+, Git, GitHub CLI (`gh`), and the selected agent
CLIs. Claude's required delegation plugins also need Codex, Grok, Bash, Python 3,
`patch`, GNU `timeout`, `readlink` and `tail`. Install these prerequisites through
their normal supported installers. Setup reports missing executables; it does
not run an OS package manager or install arbitrary CLI binaries.

Authenticate on this instance with `gh auth login`, `claude auth login`,
`codex login` and `grok login` as applicable. Then clone the private plugin
repository using your GitHub access:

```sh
git clone https://github.com/sidkik/claude-plugins.git
cd claude-plugins
node tools/setup/setup.mjs install --clients claude,codex,grok --repo /path/to/delivery-repository --dry-run
node tools/setup/setup.mjs install --clients claude,codex,grok --repo /path/to/delivery-repository
node tools/setup/setup.mjs doctor
```

`--clients` defaults to `claude` on first installation. Claude installs/enables
`sdlc-process`, `sdlc-status`, `grok-crew`, `codex-crew`, and the official
`codex@openai-codex` dependency. Codex installs the first three through its native
plugin marketplace. Grok installs process and status through its native plugin
CLI. Installed/disabled requirements are enabled; unrelated plugins are retained.
A required plugin disabled by repository-local settings is an explicit conflict;
setup identifies the repository and plugin and preserves the local setting.
Native Windows and macOS are outside this setup's qualified target.

The stable installation root is deliberately `$HOME/.local/share/sidkik`,
independent of checkout location and XDG settings. Individual CLI configuration
locations honor `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `GROK_HOME` where applicable.
Keep those environment variables consistent between setup, doctor and sessions.
Paths containing spaces and apostrophes are supported.

`--repo` explicitly opts a repository into the shared process. Setup merges a
marked entry into the selected clients' instruction files, preserving surrounding
text. The block contains a home-relative command, not this machine's absolute
checkout path. It loads the installed bundle as the authority for shared SDLC
instructions; repository engineering rules still apply. Stale repository-local
shared snapshots are reported and superseded by that explicit selection, not
deleted or silently rewritten. Without `--repo`, plugins are available but no
repository has been opted in. Run install again with `--repo` for each checkout.
Subdirectory sessions resolve the nearest enabled repository ancestor.

Existing marketplaces named `sidkik-plugins` that point elsewhere are reported as
conflicts rather than silently redirected. Migrate the named registration using
the client's native marketplace commands, then rerun setup. This matters when
moving from a manually installed checkout to this managed installation.

## Update from the documentation source

Process maintainers update the canonical planning documents, rebuild the pinned
`sdlc-process` bundle, test it and publish a bumped plugin version. Consumers
update from that release:

```sh
git pull --ff-only
node tools/setup/setup.mjs update
node tools/setup/setup.mjs doctor
```

Update retains the prior client selection and refreshes managed entry blocks in
previously enabled repositories. It does not opt in new repositories. An explicit
`--clients` narrows native client updates. Use `--source /path/to/release-checkout`
when invoking setup from another location. The installed setup launcher remembers
the original release checkout; if that checkout moves, supply its new location.
Restart clients to pick up new plugins and instructions.

A native cache whose contents differ from the release fails verification even if
its version label matches. Publish a new plugin version and update; changing only
source bytes without a version is not a reliable release. Setup leaves a pending
marker on partial failure, so entry and doctor hold dependent work until a
successful retry. Earlier native plugin operations may already have completed;
rerunning the same command is the recovery path. Individual native CLI commands
have a two-minute execution bound; a timeout fails visibly and can be retried
after resolving connectivity or CLI prompts. This bound applies to setup
commands, not delegated agent work.

## Footer and verification

Setup configures Claude and Grok status launchers at stable managed paths. Existing
command footers are composed: stdin is read once and replayed to both renderers.
Claude's other settings and Grok's other TOML sections remain intact. Complex
Grok TOML status commands that cannot be parsed safely produce an actionable
failure, preserving that configuration for manual composition. Existing prior
footer commands are retained locally in `previous-status.json`. Codex uses the
status plugin's text workflow; setup does not claim a native Codex footer.

Doctor verifies prerequisites, plugin versions and actual installed payloads,
managed runtime/content integrity, footer wiring, repository entries, effective
plugin enablement from each selected repository, and
Claude/Codex/GitHub authentication status. Grok login is an explicit user step;
doctor does not read credentials or claim a successful model call. A passing
structural check does not prove an agent followed the process. Test a fresh
ordinary work request and confirm orchestrator loading, stage criteria and widget
updates before relying on that client.

No shell history, auth tokens or session directories belong in the release or in
a migration archive. On the destination instance, use this installer and log in.
