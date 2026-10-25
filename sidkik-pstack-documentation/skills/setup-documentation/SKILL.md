---
name: setup-documentation
description: Configure a repository to use sidkik-pstack-documentation with PStack. Use when asked to set up or update PStack document ownership, durable artifact locations and repository instruction pointers. Supports Core, web-platform and other repositories.
---

# Set up PStack documentation

Configure only the repository or repositories named by the user. Installing this
plugin alone does not authorize editing every checkout or selecting PStack.
Use the [work-artifacts skill](../work-artifacts/SKILL.md) and its artifact map.

1. Establish the repository identity and selected workflow. Read its agent
   instructions, `docs/agents/pstack-docs.md` if present, tracker configuration,
   existing work documents, domain documentation pointers and verification skills.
   If another workflow is selected, report that this plugin applies to PStack;
   preserve that selection unless the user asked to change it.
2. Resolve ownership from current instructions and existing canonical records.
   Reuse established paths. Use the defaults below only for new work without an
   established location. Preserve an explicitly selected shared planning repository.
   Ask only about an unresolved ownership choice that materially changes the result.
3. Write `docs/agents/pstack-docs.md` with concrete repository-relative paths or
   repository URLs. Record the durable work root, work-key convention, shared-plan
   owner, domain and ADR locations, verification skill location, and evidence
   retention location. Include a separate multi-phase plan destination. Preserve
   an existing plan's canonical location. Record any shared-plan owner's repository
   and path as the destination for plans in that owner's scope. For new plans this
   repository owns, preserve an explicit configured destination; otherwise select
   `<durable-work-root>/<topic>.plan.md` as its named path override. The local default
   never overrides a shared-plan owner. If the user chooses PStack's default
   instead, record that choice and resolve its path from the installed playbook;
   report any unresolved path rather than silently guessing. State when evidence
   retention is local only or unconfigured.
   Separate observed configuration from a newly chosen default. Do not leave
   placeholder values or claim an artifact service is available without checking it.
4. Add or update one documentation pointer in the repository's governing agent
   instructions. Preserve surrounding rules. Prefer the existing shared authority
   when CLAUDE.md and AGENTS.md already reference one another. If they are independent
   client entrypoints, each may point to the same configuration; do not duplicate
   its contents. Use the qualified skill identity so other documentation plugins
   remain distinct. Use a `PStack documentation` heading, under an existing
   `Agent skills` section when present, otherwise as a standalone section.
   Update that section in place on repeat runs. If a prior unheaded or paraphrased
   pointer names this plugin or `docs/agents/pstack-docs.md`, consolidate it into
   this section rather than appending another pointer. Preserve user additions
   and unrelated instructions. Keep existing configuration values unless the
   requested update changes them.
5. Check paths and links. Verify referenced existing files exist. Label lazy-created
   destinations as configured paths, not existing files. Read the result as a future
   worker and confirm it identifies one owner for each record. A second setup run
   updates the same configuration and pointer without duplicating them.

For a new repository with no conventions, select `docs/work/<work-key>/` for durable
work and keep domain documentation in any existing maintained location. Do not
create a glossary, ADR directory, work folder or verification skill merely to fill
the configuration. PStack's verification generator owns creating verification skills.

Use this instruction pointer under the stable heading:

> When PStack work needs durable documentation, use
> `sidkik-pstack-documentation:work-artifacts` and read
> `docs/agents/pstack-docs.md` for this repository's ownership and locations.

The configuration must state that PStack owns its runtime stores and trail format.
When this configuration selects an explicit durable path for multi-phase plans,
keep the PStack plan skeleton and validation command unchanged. Do not add hooks,
alter workflow selection, rewrite tracker policy, move existing records, edit
installed plugin caches, or commit and publish without the relevant authorization.

Report the files changed, locations selected, preserved ownership decisions and
any access or retention gaps. Configuration written on disk does not establish
native skill discovery or successful loading in a fresh client session.
