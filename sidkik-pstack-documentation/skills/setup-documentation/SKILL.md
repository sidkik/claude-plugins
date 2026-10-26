---
name: setup-documentation
description: Configure a repository to use sidkik-pstack-documentation with PStack. Use when asked to set up or update PStack document ownership, durable artifact locations and repository instruction pointers.
---

# Set up PStack documentation

Configure only the repository or repositories named by the user. Installing this
plugin alone does not authorize editing every checkout or selecting PStack.
Read the work-artifacts [artifact map](../work-artifacts/references/artifact-map.md)
for kinds and PStack-owned paths. Setup does not run the work-artifacts workflow.
Resolve each consuming repository root before any path lookup. All `docs/` paths
below are relative to that root, not this plugin or the current shell directory.
`docs/agents/pstack-docs.md` is output this skill creates. It is not a bundled
prerequisite and need not exist before setup.

1. Establish the repository identity and selected workflow. Read its agent
   instructions, `docs/agents/pstack-docs.md` if present, tracker configuration,
   existing work documents, domain documentation pointers and verification skills.
   If another workflow is selected and the user has not asked to switch, report
   that this plugin applies to PStack and stop without writing configuration or
   pointers.
2. Resolve ownership from current instructions and existing canonical records.
   Reuse established paths. Use the defaults below only for new work without an
   established location. Preserve an explicitly selected shared planning repository.
   Ask only about an unresolved ownership choice that materially changes the result.
3. Write `docs/agents/pstack-docs.md` before any pointer. It holds short prose and
   exactly one `json pstack-docs` fence, the machine authority described in the
   [contract reference](../work-artifacts/references/contract.md). Start from the
   seed below and add only what step 1 observed or the user chose:
   - `repository` is this repository's `owner/name` identity, and `workRoot` its
     durable work root.
   - `resources` records maintained documentation where it already lives. Point
     `domain-contract` at the repository's own domain documentation rules rather
     than copying their glossary, context-map or ADR locations. Record existing
     decision-record homes as they are, one entry per home; do not choose a
     single ADR home or turn decision records into ADRs. Record verification
     sources and evidence retention. Mark a resource `unconfigured` with a note
     when it is absent or retention is local only; never invent a path.
   - `works` binds each work whose records already live outside the default
     layout, such as a nested `items/` folder, to its exact directory. New
     records for that work go there.
   - `canonical` lists each existing record, file by file, that keeps a legacy
     path or name, with its work key, kind, owner and reason. A record that
     matches a destination, sits in a bound `works` directory with a destination
     file name, or lies inside a declared resource needs no entry. An existing
     record without an entry stays authoritative. The entry lets the checker
     accept its path.
   - Record an existing work index as an `index` resource. Do not create one.
   - `external` scopes a shared-plan owner to the exact work keys and kinds it
     owns. Unrelated work stays local.
   - `destinations` overrides a kind's default only where the repository already
     uses another location. Set `multiphasePlan` only when the user selects a
     durable path for plans following PStack's multi-phase playbook; that keeps
     the playbook's skeleton and `check-plan.mjs`. If the user chooses PStack's
     default store instead, record that choice in prose. The contract does not
     cover that store. Report its path only when PStack resolves it. Otherwise
     report it as unresolved, and do not invent a path.

   The prose states that PStack owns its runtime stores and trail format.
   Separate observed configuration from newly chosen defaults. Do not leave the
   seed's placeholder identity or claim an artifact service is available without
   checking it.
4. Run the checker against the written configuration:

   ```bash
   node <plugin root>/skills/work-artifacts/scripts/check-artifacts.mjs --repo <absolute repository root>
   ```

   Replace each `<...>` placeholder with an actual path, and shell-quote any
   path that contains spaces. Fix every `ERROR` before continuing.

   Then add or update the documentation pointer in the root `AGENTS.md` or root
   `CLAUDE.md`. The checker looks for a pointer only in those two files. Preserve
   surrounding rules. If one of them defers to the other, put the pointer in the
   file it defers to. If they are independent client entrypoints, put the pointer
   in both, and do not copy the configuration's contents into either. Use the
   qualified skill identity so other documentation plugins remain distinct.
   Use a `PStack documentation` heading, under an existing `Agent skills`
   section when present, otherwise as a standalone section.
   Update that section in place on repeat runs. If a prior unheaded or paraphrased
   pointer names this plugin or `docs/agents/pstack-docs.md`, consolidate it into
   this section rather than appending another pointer. Preserve user additions
   and unrelated instructions. Keep existing configuration values unless the
   requested update changes them.
5. Run the checker again with the pointer in place. Report its `GAP`,
   `UNVERIFIED` and `PENDING` lines. They do not fail the run, and the
   [contract reference](../work-artifacts/references/contract.md) defines what
   each leaves unchecked. Read the result as a future worker and confirm it
   identifies one owner for each record. On a repeat run, update the existing
   configuration file and pointer section rather than adding new ones.

Seed contract:

```json pstack-docs
{
  "version": 1,
  "repository": "owner/name",
  "workRoot": "docs/work",
  "resources": [
    {"role": "domain-contract", "state": "unconfigured", "note": "no domain documentation rules recorded"},
    {"role": "evidence-retention", "state": "unconfigured", "note": "verification proof is local only"}
  ],
  "destinations": {},
  "external": [],
  "canonical": []
}
```

For a new repository with no conventions, keep the seed's `docs/work` work root and
keep domain documentation in any existing maintained location. Do not
create a glossary, ADR directory, work folder or verification skill merely to fill
the configuration. PStack's verification generator owns creating verification skills.

Use this instruction pointer under the stable heading:

> When PStack work needs durable documentation, use
> `sidkik-pstack-documentation:work-artifacts` and read
> `<repository-root>/docs/agents/pstack-docs.md` for ownership and locations.
> Resolve `<repository-root>` to this repository, not the installed plugin. Run
> the skill's `check-artifacts.mjs` on new or changed work records before handoff.

Do not add hooks, alter workflow selection, rewrite tracker policy, move existing
records, edit installed plugin caches, or commit and publish without the relevant
authorization.

Report the files changed, locations selected, preserved ownership decisions and
any access or retention gaps. Configuration written on disk does not establish
native skill discovery or successful loading in a fresh client session.
