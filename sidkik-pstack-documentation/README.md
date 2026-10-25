# PStack documentation for Sidkik

This plugin formalizes document ownership and locations for projects using
PStack. Core, web-platform and other repositories can share it while keeping
their own documentation configuration.

It provides two skills:

- `sidkik-pstack-documentation:setup-documentation` records repository locations
  in `docs/agents/pstack-docs.md` and links that file from the root `AGENTS.md`
  or `CLAUDE.md`.
- `sidkik-pstack-documentation:work-artifacts` organizes durable findings, plans,
  decisions, reviews and verification evidence using that configuration.

The work-artifacts skill ships `scripts/check-artifacts.mjs`, a dependency-free
Node 20 checker. Given an absolute repository root and existing artifact files,
it checks the repository's contract, its declared paths, and each file's name,
location and owner. The [contract reference](skills/work-artifacts/references/contract.md)
defines the format, results and exit status. The checker does not read plan
content, external repositories or link targets.

PStack must be available separately. This plugin does not select or bundle PStack,
replace its playbooks, or install hooks. A different workflow can supply its own
documentation plugin with a distinct namespace. When both are installed, use the
plugin matching the repository's selected workflow, and use qualified skill names
in dispatch briefs and invocations. The legacy Codex crew resolver rejects an
unqualified `work-artifacts` request when both plugins expose that name, so
qualify existing bare-name callers before enabling both plugins.

## Path ownership

Paths such as `docs/agents/pstack-docs.md` and `docs/work/` are relative to the
consuming repository root, not this plugin directory or the shell working
directory. Resolve that root before reading or writing them.

`docs/agents/pstack-docs.md` is setup output, not a bundled file. Installing the
plugin does not create it. The `setup-documentation` skill creates it in each
repository you select, then adds an instruction pointer after checking that the
file exists. Until setup runs, `work-artifacts` uses existing repository
conventions or its documented fallback without running setup. When the
repository has neither the configuration file nor an instruction pointer to it,
the checker run without artifacts reports `UNCONFIGURED`, and records written
under the fallback are reported as not validated. Passing artifacts to an
unconfigured repository fails. Once an instruction pointer names the file, a
missing file is a setup error.

The plugin bundles `skills/work-artifacts/SKILL.md`, its
`references/artifact-map.md` and `references/contract.md`, its
`scripts/check-artifacts.mjs`, and `skills/setup-documentation/SKILL.md`.
Relative Markdown links within these files resolve from the containing file.
PStack's own skills and runtime paths come from the separately installed PStack
plugin. Work directories are destinations created when needed, not bundled files.

## Set up a repository

After this version is published to the `sidkik-plugins` marketplace, install
`sidkik-pstack-documentation@sidkik-plugins` through the client's plugin manager.
Reload the client and confirm that both qualified skills are discoverable.
Ask the agent to set up PStack documentation for the intended repository.
Repeat for another repository only when it should adopt the convention.

The setup preserves existing canonical owners. New durable documents default to
`docs/work/<work-key>/`; a shared plan has one owner and links from participating
repositories. Existing planning ownership and initiative hierarchies remain valid.
The setup does not migrate old documents or switch workflows.

For local Claude evaluation, load this checkout with the client's `--plugin-dir`
option rather than editing installed caches. Packaging validation and behavioral
replay do not prove that an installed plugin loads in every client.

## Compatibility

The [artifact map](skills/work-artifacts/references/artifact-map.md) identifies
PStack-owned formats and paths separately from Sidkik conventions. Compatibility
was reviewed against T3-PStack 2.0.0 on 2026-10-24.

PStack's runtime store and `.audit` files stay where their playbooks put them.
Decision trails retain the `show-me-your-work` format and retention rules.
Verification skills and feature maps remain maintained project source. Proof
survives cleanup at the verification skill's selected evidence location.

Durable types are optional. There are no SDLC stages, mandatory acceptance
receipts, observers or required frontmatter. The plugin borrows Pocock's small
per-repository configuration pattern without depending on Pocock skills.

The skill files in this directory are the editable source. No generated bundle
or copied PStack instructions are maintained here. Both client manifests expose
the same skill tree.

## Validation

From the marketplace repository root:

```bash
node --test tests/pstack-docs.test.mjs
```

The `pstack-docs` CI job runs the same tests, then lints only this plugin's
Markdown with `markdownlint-cli2` 0.24.0 and checks its local links and
fragments with Lychee 0.24.2 in offline mode, so external URLs are not checked.
Lint settings live in `.github/linters/`, outside the installed plugin. A
missing tool fails the job. These checks prove the files are well formed. They
do not prove what an agent does with the instructions.
