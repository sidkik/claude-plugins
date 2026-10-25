---
name: work-artifacts
description: Organize durable research, plans, decisions, review findings and verification evidence for projects using PStack. Use when creating, updating or handing off PStack work documents. Read the repository's documentation configuration and preserve PStack-owned runtime records.
---

# PStack work artifacts

Use this skill when PStack is the selected workflow. PStack chooses the work and
its required verification. This skill supplies Sidkik's document locations and
ownership conventions across repositories. It adds no stages or approval gates.

## Find the owning record

Resolve the consuming repository root from the requested checkout and its Git
root. Repository paths below are relative to that root, never the plugin root
or an unrelated current directory. `docs/agents/pstack-docs.md` is optional
configuration created by `setup-documentation`; it is not shipped in the plugin.
Check whether `<repository-root>/docs/agents/pstack-docs.md` exists before reading
it. Its `json pstack-docs` block is the authority for locations and owners; the
[contract reference](references/contract.md) defines it. If the file is absent,
use the fallback below and report that repository setup has not created it. If
agent instructions point to it but it is missing, report the broken setup.
Read the repository instructions and existing record for this work. Follow an
explicit user ownership or relocation decision first. Otherwise preserve the
existing canonical record for this work; apply configured locations only to new
records. Use the fallback below only when neither an existing owner nor a
configured location applies. An output-path request alone does not transfer
ownership of an existing record. Installation does not select this workflow or
supersede a repository's chosen workflow.

If configuration is absent, reuse established document locations. For new work
with no established owner, use `docs/work/<work-key>/` in the repository owning
the change. Use the tracker key when one exists, such as `core-gh-517`, otherwise
a descriptive task slug. Do not create a tracker issue just to obtain a key.
Report the chosen path. Use the sibling [setup skill](../setup-documentation/SKILL.md)
when asked to formalize repository configuration.

For work spanning repositories, keep one canonical shared plan in the configured
coordination repository and link to it from delivery records. Preserve an existing
planning-repository owner. Do not route all plans to a central repository, copy
the same plan into every repository, or migrate existing records by default.
If a known canonical owner is unavailable, report the access gap and leave that
record unwritten. While that owner is unavailable, keep any notes for the record
as local scratch outside the work root and configured destinations, so they
cannot pass as the record. Do not check them as work artifacts or report the
externally owned record as updated.

## Choose the smallest useful artifact

Read the [artifact map](references/artifact-map.md) before selecting a new artifact's
location. Keep one canonical record for each purpose. An issue, PR or existing
document can already be sufficient. Types are choices, not a checklist.

For durable files, use the configured destination for the kind. The default
path is the configured `workRoot` value, a work-key directory, and a file named
after the topic and the literal kind. With `workRoot` set to `docs/work`, a plan
defaults to `docs/work/<work-key>/<topic>.plan.md`. Other kinds replace the
literal `plan` with `research`, `spec`, `decision`, `review` or `handoff`. Evidence defaults to
`docs/work/<work-key>/<run-id>.evidence.md`. Only `<work-key>`, `<topic>` and
`<run-id>` are placeholders. Work keys, topics and run ids use lowercase letters,
digits and single hyphens. Preserve established filenames, PStack-required names,
ADR numbering and generated skill layouts. The configuration lists records at
legacy paths or names as `canonical` entries so the checker accepts them. A record
that matches a destination, sits in a bound `works` directory with a destination
file name, or lies inside a declared resource needs no entry. An existing record
stays authoritative with or without an entry. A work whose directory is bound
in the configuration's `works` keeps every new record in that directory, never
in a second default folder. A kind scoped to an external owner for this work
belongs in that repository. Create folders only when needed. An index earns its
place when readers need help finding several records, not merely because a
folder exists.
A new index is ordinary documentation: check its links, and do not edit the
configuration to register it. Only an index the configuration already declares
as an `index` resource is passed to the checker.

Include enough context to recover meaning without the conversation:

- Research records the question, findings, source locations or revisions,
  observation date, and limitations. Distinguish evidence from inference.
- Plans reference the findings and requirements they act on. Explain material
  departures. Preserve the selected PStack playbook's plan structure and validator.
  A plan is multi-phase only when it follows PStack's multi-phase playbook; write
  it to the configured `multiphasePlan` destination when one exists.
- Decisions record the choice, reason, alternatives that mattered and the source
  of the decision. Reference an existing ADR instead of duplicating it. Follow the
  repository's domain contract, when configured, for whether a decision belongs
  in its decision records; this skill does not promote work decisions to ADRs.
- Reviews record findings, evidence and accepted, rejected or deferred dispositions
  with reasons. Name the reviewed revision. A finding is not automatically a defect.
- Evidence records the tested revision, environment, command or procedure, actual
  result and retained proof location. State what did not run or remains unverified.
- Handoffs link the canonical findings, decisions, current revision, remaining work
  and usable evidence. They supplement the actual PStack delegation brief; they
  do not replace context that the selected playbook requires in the prompt.

Combine related sections in one file for small work. No frontmatter schema is
required. When a decision changes, identify what supersedes it. Label frozen copies
with their source and revision so a snapshot cannot become another editable authority.

## Preserve PStack records and evidence

Let PStack's `show-me-your-work` skill own decision trails, including their format,
append-only history, audit and review. Link the canonical trail instead of copying
it into a Markdown diary. The selected playbook owns the trail's location, overriding
the standalone defaults. Orchestrate uses `orch.ts` for bookkeeping and derived
status, while its `decisions.tsv` is appended through `show-me-your-work`.
Autopilot uses the root store and the record handling in its own playbook.
Do not hand-edit Orchestrate's derived status.

Keep scratch notes, transcripts and raw logs local by default. Retain required
verification proof through cleanup at the location selected by the verification
skill. For evidence that must outlive the machine, use the project's configured
retained artifact store and link it. A `/tmp` path is local evidence, not a durable
shared link. Report a retention gap rather than claiming inaccessible proof exists.
Never place credentials or unredacted secrets in documentation or evidence bundles.

Repository documents are candidates for normal version control, not permission
to commit or publish. Preserve the user's commit and publication boundaries.
A PStack playbook may call for a committed decision trail when auditability needs
it. Honor that requirement within existing authorization; do not apply a blanket
ban or silently relocate an active trail.

## Check before handoff

Before handoff, pass the checker each work record you created or changed in this
repository. Also pass each file you created or changed inside an `existing` or
`destination` resource the configuration declares. Do not pass a resource's
unchanged files.

```bash
node <this skill directory>/scripts/check-artifacts.mjs --repo <absolute repository root> <relative file> ...
```

Replace each `<...>` placeholder with an actual path, and shell-quote any path
that contains spaces.

Do not pass glossaries, decision records or generated verification skill files
that the configuration does not declare. Their owning skills govern their names.

Fix every `ERROR`. Location and ownership errors name the expected destination
or owner. Report `GAP`, `UNVERIFIED` and `PENDING` lines as they are. `GAP` marks
missing optional configuration. `UNVERIFIED` marks an external record the checker
did not read. `PENDING` marks a multi-phase plan whose content PStack's
`check-plan.mjs` has not checked yet. Its line prints a command template, not an
exact command. Replace `<installed PStack plugin root>` with the actual PStack
plugin root, shell-quote both paths, run it and fix what it reports.

If `docs/agents/pstack-docs.md` is absent and no instruction pointer names it,
run the checker without artifacts. It reports `UNCONFIGURED`. Report the records
written under the fallback as not validated. The fallback does not authorize
setup; run `setup-documentation` only when asked to. Passing artifacts without a
configuration fails, and so does a pointer to a missing configuration.

Also check that links resolve, the canonical owner is clear, findings used by
the plan are traceable, and evidence supports the stated result. Report missing
evidence without creating a new workflow gate.
