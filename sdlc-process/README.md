# SDLC Process

`0.1.1` packages the shared Sidkik process, selected Pocock skills, orchestrator,
work-artifacts and independent policy-review brief. Claude discovers the skills,
review agent and a SessionStart instruction. Codex can discover native skill
wrappers through its manifest or the portable setup's configured source pointers.
Claude also discovers user-invoked Pocock wrappers under `claude-skills/`,
preserving their invocation restrictions. Codex exposes common model-invocable
wrappers; its SDLC entry reads the user-only Pocock sources directly. The hook
initiates agent-owned setup even on a fresh machine without a managed repository
marker. It reports status and directs the agent to the packaged `sdlc-setup`
skill. Required configuration changes are performed by the agent, not the hook.

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
