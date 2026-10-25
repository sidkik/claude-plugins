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
it. If absent, use the fallback below and report that repository setup has not
created a configuration. Read the repository instructions and existing record
for this work. Follow an explicit user ownership or relocation
decision first. Otherwise preserve the existing canonical record for this work;
apply configured locations only to new records. Use the fallback below only when
neither an existing owner nor a configured location applies.
An output-path request alone does not transfer ownership of an existing record.
Installation does not
select this workflow or supersede a repository's chosen workflow.

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
If a known canonical owner is unavailable, report the access gap. A clearly
labelled local draft may support independent work but does not replace that owner.

## Choose the smallest useful artifact

Read the [artifact map](references/artifact-map.md) before selecting a new artifact's
location. Keep one canonical record for each purpose. An issue, PR or existing
document can already be sufficient. Types are choices, not a checklist.

For durable files, use `<topic>.<type>.md` where type is `research`, `spec`, `plan`,
`decision`, `review`, `evidence` or `handoff`. Preserve established filenames,
PStack-required names, ADR numbering and generated skill layouts. Create folders
only when needed. An index earns its place when readers need help finding several
records, not merely because a folder exists.

Include enough context to recover meaning without the conversation:

- Research records the question, findings, source locations or revisions,
  observation date, and limitations. Distinguish evidence from inference.
- Plans reference the findings and requirements they act on. Explain material
  departures. Preserve the selected PStack playbook's plan structure and validator.
- Decisions record the choice, reason, alternatives that mattered and the source
  of the decision. Reference an existing ADR instead of duplicating it.
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

Before handoff, check that links resolve, the canonical owner is clear, findings
used by the plan are traceable, and evidence supports the stated result. Report
missing evidence without creating a new workflow gate.
