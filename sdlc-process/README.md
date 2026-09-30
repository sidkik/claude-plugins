# SDLC Process

`0.3.1` packages the shared Sidkik process, selected Pocock skills, orchestrator,
work-artifacts and independent policy-review brief. Claude discovers the skills,
review agent and a SessionStart instruction. Codex can discover native skill
wrappers through its manifest or the portable setup's configured source pointers.
Claude also discovers user-invoked Pocock wrappers under `claude-skills/`,
preserving their invocation restrictions. Codex exposes common model-invocable
wrappers; its SDLC entry reads the user-only Pocock sources directly. The hook
initiates agent-owned setup even on a fresh machine without a managed repository
marker. It reports status and directs the agent to the packaged `sdlc-setup`
skill. Required configuration changes are performed by the agent, not the hook.

On supported Claude Code versions, agent-owned setup enables native observation
of future foreground MAIN sessions. It installs managed local agent definitions
because Claude's plugin-agent loader does not retain the experimental observer
fields, selects the observed MAIN only when no custom default agent conflicts,
and preserves the user's model, tools, permissions, authentication and unrelated
settings. The MAIN definition has an empty body so Claude retains its normal
system prompt; the observer uses Haiku and can only read and send native advisory
reports. Existing user or project agent choices and unmanaged filename collisions
remain unchanged and appear as explicit setup gaps.

During upgrades, setup removes a saved predecessor only when it is a direct
Sidkik SDLC footer command. Custom and compound predecessor commands remain
composed with the managed footer.

The status renderer shows `Observer: starting` from configuration and
`Observer: seen … ago` only after the current transcript contains a matching
native observer record. `Seen` means native observer activity was recorded as
of that timestamp, not a live heartbeat. Installation alone is never activation
evidence, and stopped or failed states require native evidence. This setup has
no supported hot-attach path; start a fresh session after setup or repair. Live
tests proved native report delivery, MAIN
correction, model separation and silence on a compliant fixture. They did not
prove that every observer turn reads the packaged shared process sources; the
prompt requires those reads when a finding relies on that process.

Claude Code **2.1.285 misses the first interactive MAIN turn** during native
observer initialization, even with correct setup. Doctor separates this
`known-missing` coverage from installation/configuration `ready`; its exit status
still describes setup. Setup repair cannot correct the runtime defect, and this
release reports it without blocking independent SDLC work. Other versions remain
`unverified` until first-turn coverage is demonstrated; a newer version or later
observer record is insufficient. Earlier live tests did not establish first-turn
coverage. This reporting correction does not resolve the runtime defect tracked
in [issue #32](https://github.com/sidkik/claude-plugins/issues/32).

For a live observer view, ask the agent to **“Show this session’s observer activity.”**
The observer skill starts a local, auto-refreshing page and provides its link.
It reads the selected session’s existing native records; it does not publish them
or write a diagnostic archive. Findings and subsequent public actions remain
separate from attributed correction assessments. Launch evidence and zero reports
do not prove that every turn was observed. Stop the viewer to discard its
in-memory assessments; Claude retains its original logs under its own policy.

Install this plugin and reload the client. If the agent does not start setup,
tell it **“Finish SDLC setup.”** The hook displays this fallback; automatic
compliance with its instructions is not guaranteed. The agent handles companions,
prerequisites, footer and scoped repository integration using the runtime inside
this plugin. See [portable setup](../docs/setup.md). Human authentication remains
local; no credentials or machine paths are distributed here. Codex requires its
native hook trust review; the bootstrap skill also works without a running hook.

[Source adapter](SOURCE-ADAPTER.md) explains working-repository ownership and
conflicting revisions. Required sources resolve locally under `bundle/`; the
[manifest](bundle/source-manifest.json) records the actual source commits and
hashes. Historical evidence stays linked to immutable upstream GitHub revisions.

## Maintain and release

Change governing documents in their canonical planning repository and obtain the
applicable review. Commit those source changes first. Deliberately update the full
commit in `tools/process-sources.json`; fetch that exact commit into the source
checkout. Core supplies the two explicitly pinned Pocock resources missing from
planning's selected import. Working-tree changes are never packaged.

From the plugin repository, using any local checkout locations:

```bash
python3 tools/build-process.py --planning /path/to/planning --core /path/to/core
python3 tools/build-process.py --planning /path/to/planning --core /path/to/core --check
python3 -m unittest discover -s tests -p 'process*.py' -v
```

Review source and generated changes together. Update the plugin version and
marketplace release; publish the source commit before releasing a package that
references it. Keep the pinned source commit reachable. For changes affecting
stage criteria, update and test `sdlc-status/templates/routes.json` against that
same canonical process revision before release; this generator does not infer
criteria changes or silently certify a stale checklist. Run the setup's isolated
fresh-home, repeat-install, update and relocation tests before claiming portability.

The generator fails on unresolved required local links, hardcoded original-machine
paths and output drift. It retains full selected skill directories including
Pocock's supporting reference files. Broader optional flows mentioned by ask-matt
remain explicitly outside the selected bundle. Tests cover installed-only bootstrap, runtime repair and packaging. Actual host
behavior is separately verified before release.
