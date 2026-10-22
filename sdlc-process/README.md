# SDLC Process

This plugin packages the shared Sidkik process, selected Pocock skills, orchestrator,
work-artifacts and independent policy-review brief. Claude discovers the skills,
review agent and a silent SessionStart metadata hook. Codex can discover the native skills
through its manifest or the portable setup's configured source pointers.
Both hosts expose the same model-invocable skills under `skills/`, including
the Pocock workflows (ask-matt, grill-with-docs, handoff, implement, to-spec,
to-tickets, triage, wayfinder), so the orchestrator invokes the selected flow
from an ordinary request without a user slash command. Loading a flow grants no
authority and answers no human decision. A skill the generator finds restricted
to the user (`disable-model-invocation: true` in its source) is routed to
`claude-skills/` instead and needs an explicit handoff with its installed
invocation command; reading its source does not authorize execution. A host
without a valid invocation reports the capability gap. The hook
only supplies native session identity and transcript metadata. It does not run
doctor, discover plugins, issue warnings or initiate setup. Missing Node leaves
the hook silent. Governed work still follows the required process sources and
repository instructions; explicit readiness and setup report actual gaps.

Use **`/sdlc-process:session-start`** for session readiness after installation.
It invokes the process, orchestrator, status and observer skills through Claude's
native Skill tool and reads their full packaged instructions. File reads alone
do not satisfy loading; failed or unavailable required invocations leave
readiness unmet. It checks setup without changing it, and starts or
reuses the current MAIN session's observer view. It returns a clickable URL and
stop handle without opening a browser. With an assigned task it initializes the
real work projection; without work it reports **widget waiting for work** and
ends, preserving existing state. The widget currently requires an issue rather
than supporting an unassigned session. Pending observer evidence remains explicit
and is checked again on the next work turn; preparation does not establish
first-turn coverage or fix the native observer defect.

On Claude Code 2.1.293 or newer, agent-owned setup enables native observation
of future foreground MAIN sessions. It installs managed local agent definitions
because Claude's plugin-agent loader does not retain the experimental observer
fields, selects the observed MAIN only when no custom default agent conflicts,
and preserves the user's model, tools, permissions, authentication and unrelated
settings. The MAIN definition has an empty body so Claude retains its normal
system prompt; the observer uses the explicit `claude-opus-5-5` model at
`effort: low` and can
only read, search the MAIN transcript and send native advisory reports. Observation
is scoped to MAIN, with worker delegation unchanged.
A narrowly matched `SubagentStart` hook passes native MAIN identity and a bounded
public-record baseline to the observer, excluding internal metadata and reasoning.
It reads snapshots up to 32 MiB and supplies up to 256 KiB of public records at
whole-record boundaries, marking exceeded limits and omitted public content.
The observer consumes this baseline once, then reconciles subsequent digests,
suppressing overlap conservatively. Targeted reads resolve specific gaps. Missing
or truncated history stays unknown and cannot prove a prerequisite was skipped.
The baseline also carries a startup evidence index built from the whole snapshot: `Skill` calls with their results, skill-content records, compaction boundaries and the
human's messages, each with its source line, plus the line it covers and whether it is complete. It records what the
transcript contains, never that anything was loaded or followed. The observer carries three bounded, generated excerpts
of the process, each with its pinned source revision and digest: the entry's routing table, triage's steps with their
conditional grilling step, and the entry's mandatory-process rule. They are excerpts, not the sources; the stage criteria and
everything else is the skill text MAIN received, which the observer finds through the index and a read-only search.
A native skill load is a `Skill` call and result plus the separate injected
skill-content record after them; the baseline can omit that large record, which
leaves delivery unknown. Claude re-attaches only the first 5,000 tokens of each
invoked skill after compaction (25,000 combined, newest first), so delivery is
not assumed to persist past a compaction boundary.
Claude may persist larger hook output and supply a preview with its exact file
path. The observer reads that normalized output before claiming it loaded the
baseline; preview or partial reads remain unknown. This uses Claude’s native
output retention, with no independent plugin archive. Baseline recovery
is historical context, not live first-turn coverage.
Existing user or project agent choices and unmanaged filename collisions
remain unchanged and appear as explicit setup gaps.

During upgrades, setup removes a saved predecessor only when it is a direct
Sidkik SDLC footer command. Custom and compound predecessor commands remain
composed with the managed footer.

The status renderer shows `Observer: starting` from configuration and
`Observer: seen … ago` only after the current transcript contains a matching
native observer record. `Seen` means native observer activity was recorded as
of that timestamp, not a live heartbeat. Installation alone is never activation
evidence, and stopped or failed states require native evidence. This setup has
no supported hot-attach path; start a fresh session after setup or repair. Earlier
live tests, on an earlier revision, proved native report delivery, MAIN
correction, model separation and silence on a compliant fixture. How the current revision is evaluated is in the
[agent testing procedure](../docs/agents/agent-testing.md); results for a given revision are recorded in
the pull request that changes it, not here. The replay episodes come from one recorded session and are a
known regression, not evidence of broad reliability, and no held-out session exists.

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
or write a diagnostic archive. The view links findings through assessment, corrective action and verification,
with native record references. Acknowledgment alone never marks correction verified.
Counts distinguish evidence-backed, observer-attributed verification from useful
corrections attributed to the observer or shared intervention. Validity, timeliness,
materiality, attribution, disruption and possible misses stay unknown when unassessed;
misses are opportunistic, not an exhaustive audit. Verification currently requires
tool evidence; conversational corrections stay assessed, without extra tool calls
for bookkeeping. Recorded input batches are separate from delivered reports.
Launch evidence and zero reports do not prove every turn was observed.

The observer emits private lifecycle annotations only when finding evidence changes;
MAIN can give a short normal response. The viewer reconstructs these annotations
from matching native MAIN/observer transcripts after restart, with no separate
archive or per-turn model invocation. Native records retain Claude's own policy.
Optional manual assessments remain in viewer memory and never increase automatic
verified counts. Usage deduplicates native observer message IDs; unavailable fields,
monetary cost and incomplete source coverage remain explicit. Keep the viewer in
a supported background handle without an arbitrary two-hour lifetime.

A viewer the agent starts is bound to the MAIN session that started it:
`serve --owner-main` captures MAIN's process identity and closes the view when
that session ends or its process is reused. Owner discovery is currently
Linux/WSL; elsewhere the launch reports the gap instead of serving unowned. A
manual `serve` with neither ownership mode is an unowned viewer; the explicit
paired `--owner-pid` and `--owner-start-ticks` flags make it owned. The native
agent uses `--owner-main`.

Install this plugin and reload the client. Ask **“Finish SDLC setup”** for
installation verification or authorized repair. The agent handles companions,
prerequisites, footer and scoped repository integration using the runtime inside
this plugin. See [portable setup](../docs/setup.md). Human authentication remains
local; no credentials or machine paths are distributed here. Codex requires its
native hook trust review; the setup skill also works without a running hook.

[Source adapter](SOURCE-ADAPTER.md) explains working-repository ownership and
conflicting revisions. Required sources are carried in the native assets and kept as snapshots under `bundle/`; the
[manifest](bundle/source-manifest.json) records the actual source commits and
hashes. Historical evidence stays linked to immutable upstream GitHub revisions.

## Maintain and release

Route contributions by canonical ownership in the [source adapter](SOURCE-ADAPTER.md).
Shared SDLC governing documents belong in Planning; engineering instructions and
maintained governing references belong to their configured owner, including an
engineering plugin where explicitly adopted. Edit plugin-owned sources in that
owner's authorized checkout even when starting in a delivery repository. This
plugin's source adapter is maintained here; its generated skills and agents are not editable
authority. Obtain the applicable review for source changes.

For changes to this plugin's pinned bundle, commit the upstream source changes
first. Deliberately update the full
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

Native skills and agents contain their instructions rather than pointing at them.
For each pinned skill and the policy reviewer the generator writes the source's
frontmatter byte-for-byte, then its full body, then the supporting instruction and
template files the body requires, then the [source adapter](SOURCE-ADAPTER.md)
contract, so invoking the skill loads all of it. What is bundled is an explicit
policy, `composition` in `tools/process-sources.json`: each asset's `inline` list
names files, or one section of a canonical document (`fragment`), and
`canonical_references` names the governing process, specification, record,
planning and tracker documents. A link from an asset (or from a section it
carries) into a canonical document must be satisfied by carrying that file or
section in the asset; leaving it as a link to read later fails the build, as
does an overlapping inline, an unclassified link or an unlisted file in a skill's
directory, so nothing is dropped silently. A `cite` entry keeps only a whole-file
identity link to the pinned upstream (used for the governed-context proposal,
whose governing sections are carried) and is reported with the bytes carried.
Separately invoked skills are never inlined into another skill; a link to one
stays a link, and a link to a supplement another skill bundles resolves to that
skill's anchor. `native-composition.json` records, per asset, the bundled files
with section sizes, cited sources, invoked skills, digests and size flags (over
500 lines is flagged, never truncated); the generator prints the same summary.
The sdlc-process entry, the sdlc-policy-review skill and the policy reviewer
carry the whole shared process (about 95 KB) with the record, planning, tracker
and checkpoint content it directs, so they are large by design. The adapter
repeats in every pinned entry (about 6 KB), the cost of making each entry
self-contained.

The generator fails on unresolved required local links, hardcoded original-machine
paths and output drift. It retains full selected skill directories including
Pocock's supporting reference files. Broader optional flows mentioned by ask-matt
remain explicitly outside the selected bundle. Tests cover installed-only bootstrap, runtime repair and packaging. Actual host
behavior is separately verified before release.
