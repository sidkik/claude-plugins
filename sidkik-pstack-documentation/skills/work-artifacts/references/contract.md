# Documentation contract

`docs/agents/pstack-docs.md` in a consuming repository holds explanatory prose
and exactly one fenced block whose opening line is `` ```json pstack-docs ``.
That block is the only machine-readable authority for the repository's PStack
documentation locations. Prose in the file explains it and must not restate its
paths. [check-artifacts.mjs](../scripts/check-artifacts.mjs) reads the block
from the repository named by `--repo`, never from the shell working directory.

## Command

```bash
node <work-artifacts skill directory>/scripts/check-artifacts.mjs --repo <absolute repository root> [artifact ...]
```

The skill directory is the installed plugin's `skills/work-artifacts/`. Replace
each `<...>` placeholder with an actual path, and shell-quote any path that
contains spaces. Each artifact is an existing file, relative to the repository
root. Exit status is 0 when the result is `PASSED` or `UNCONFIGURED`, 1 when it
is `FAILED`, and 2 for a usage error.

| Configuration | Instruction pointer | Artifacts | Result |
| --- | --- | --- | --- |
| Absent | None | None | `UNCONFIGURED`; nothing was validated |
| Absent | Present | None | `FAILED`: the pointer names a missing file |
| Absent | Present | Some | `FAILED`: the pointer names a missing file; artifacts not checked |
| Absent | None | Some | `FAILED`: artifacts need a contract; records are not validated |
| Present, invalid | Any | Any | `FAILED`: contract errors reported; supplied artifacts not checked |
| Present, valid | Any | Any | Declared paths and each supplied artifact are checked |

The pointer check looks for `docs/agents/pstack-docs.md` or the qualified
`work-artifacts` skill name in the root `AGENTS.md` and `CLAUDE.md`. Without a
configuration or pointer, run the checker without artifacts and report records
written under the skill's fallback as not validated. That result does not
authorize setup.

Result lines are labelled. `ERROR` fails the run. `GAP` marks missing optional
configuration: an `unconfigured` resource, an absent domain contract, a missing
instruction pointer or an unconfigured repository. `UNVERIFIED` marks a record
or resource in another repository, which the checker never reads. `PENDING`
marks multi-phase plan content that PStack's own validator still has to check.
`NOTE` and `OK` are informational.

A `PENDING` line prints a `check-plan.mjs` command template, not an exact
command. Replace `<installed PStack plugin root>` with the actual PStack plugin
root and shell-quote both paths before running it.

## Fields

Unknown fields, kinds, roles, states and tokens are errors.

| Field | Required | Meaning |
| --- | --- | --- |
| `version` | Yes | `1` |
| `repository` | Yes | This repository's `owner/name` identity, used as the local owner |
| `workRoot` | Yes | Directory for new durable work, usually `docs/work`; may not exist yet |
| `resources` | No | Existing documentation the repository already maintains, and its gaps |
| `destinations` | No | Path templates replacing a kind's default location |
| `multiphasePlan` | No | Path template for plans that follow PStack's multi-phase playbook |
| `works` | No | Work keys whose records live in an established directory of their own |
| `external` | No | Work whose records of some kinds belong to another repository |
| `canonical` | No | Exact existing records that keep their established paths and names |

### Artifact kinds and destinations

The kinds are `research`, `spec`, `plan`, `decision`, `review`, `evidence` and
`handoff`. Each is optional. Without an override, a kind's destination is the
`workRoot` value, then a `<work-key>` directory, then a file named `<topic>.`,
the literal kind and `.md`. With `workRoot` set to `docs/work`, the default plan
destination is `docs/work/<work-key>/<topic>.plan.md`. Evidence uses `<run-id>`
in place of `<topic>`, as in `docs/work/<work-key>/<run-id>.evidence.md`.

A template may use only `<work-key>`, `<topic>` and `<run-id>`. A path segment
contains at most one token. Literal text in a segment may use only letters,
digits, `.`, `_` and `-`. Each token matches lowercase letters, digits and single
hyphens. `<work-key>` appears once, as a whole segment preceded only by literal
segments; it names the work directory. The rest of the template contains one
`<topic>` or `<run-id>`. The template ends in `.md`. No regular expressions or
globs are accepted.

The checker rejects two templates when an example path built from one matches
the other. That catches common overlaps, not every possible one. A supplied file
that matches more than one destination always fails.

An ordinary `.plan.md` is not a multi-phase plan. Only a supplied file matching
`multiphasePlan`, or a supplied canonical plan marked `"multiphase": true`, is
reported as `PENDING`, once, with a `check-plan.mjs` command template.
Plans that were not supplied are not reported. The checker does not read plan
content.

### Work directories

```json
{"works": {"core-gh-541": "docs/work/items/core-gh-541-price-payment-terms"}}
```

`works` binds a work key to one exact directory, for work established before
the default layout. A bound work's new records use the same file names as every
other work, inside the bound directory instead of the directory ending at
`<work-key>`. Its files at the default location fail and name the bound
directory. Bound directories may not repeat, nest inside one another, or be
another work's default directory. A bound directory may be absent until its
first record exists; if present it must be a directory.

### Resources

Each resource has a `role`, a `state` and an optional `note`. Roles are
`domain-contract`, `domain-docs`, `decision-records`, `architecture`, `tracker`,
`runbooks`, `verification`, `evidence-retention` and `index`. A repository may declare
several resources with the same role, such as two decision-record homes, except
`domain-contract` and `evidence-retention`, which are single.

| State | Fields | Check |
| --- | --- | --- |
| `existing` | `type` (`file` or `directory`), `path` | Must exist now with that type |
| `destination` | `type`, `path` | May be absent; if present, must have that type |
| `external` | `repository`, `path` | Not read; reported `UNVERIFIED` |
| `unconfigured` | none | Reported as a `GAP`, never an error |

`domain-contract` points to the repository's own statement of how agents read
and write domain documentation, such as glossaries, context maps and decision
records. This plugin does not define that contract, choose a glossary file name,
or choose one decision-record home. A declared `existing` domain contract that
is missing is an error. An absent or `unconfigured` one is a gap.

A file that is an `existing` or `destination` resource, or lies inside one,
keeps the resource's own conventions and is reported as such. A file resource is
rejected when a destination or bound work directory can produce its exact path,
and a directory resource when one can produce a path inside it. With the
default destinations, `README.md` matches no destination file name, because
each one ends in a kind and `.md`, such as `.plan.md`. So
`docs/work/README.md` and `docs/work/core-gh-1/README.md` can be `index`
resources, while a directory resource covering `docs/work` cannot. Separately,
the default directory of a work bound in `works` is not a destination for that
work, so a resource may cover that directory. The checker checks only index
files the configuration declares; it does not recognise an index by its file
name, and an undeclared one fails as an unmatched artifact. Files the configuration does not
declare, such as an undeclared glossary or generated verification skill, are not
work artifacts; their owning skill governs them.

### External ownership

```json
{"work": "payments-2026", "kinds": ["plan"], "repository": "sidkik/planning", "path": "docs/work/payments-2026", "reason": "shared plan"}
```

The scope is exact: these kinds for this work key belong to the other
repository. Other work keys and kinds stay local. A local file inside the scope
fails and names the owner. One work key and kind may have only one scope.

### Canonical records

```json
{"work": "billing", "kind": "plan", "owner": "sidkik/core", "path": "docs/work/billing/c11-subscriptions.md", "reason": "predates typed filenames"}
```

A canonical entry names one file, never a directory. Its legacy path or name is
accepted only at that exact path. A file that matches a destination, sits in a
bound `works` directory with a destination file name, or lies inside a declared
resource needs no entry. An existing record without an entry stays
authoritative; the entry lets the checker accept its path. When `owner` is this
repository, the file must exist. Another owner is reported `UNVERIFIED`, and a
local file at that path fails. One path may be canonical for only one owner,
because the checker identifies records by their path in this repository.

A canonical entry protects that exact record. It does not block new records of
the same work and kind, such as another research topic or evidence run. The
checker cannot tell whether a new file duplicates an existing record's content;
only an `external` scope makes a whole work and kind belong elsewhere.

## Path safety

Every path is relative to the repository root. Absolute paths, `.` and `..`
segments, empty segments, backslashes and glob characters are rejected. Symbolic
links may not lead outside the repository, including links in the existing
ancestors of a future destination.

## Example

```json pstack-docs
{
  "version": 1,
  "repository": "sidkik/core",
  "workRoot": "docs/work",
  "resources": [
    {"role": "domain-contract", "state": "existing", "type": "file", "path": "docs/agents/domain.md"},
    {"role": "domain-docs", "state": "existing", "type": "file", "path": "CONTEXT-MAP.md"},
    {"role": "decision-records", "state": "existing", "type": "directory", "path": "docs/adr"},
    {"role": "verification", "state": "existing", "type": "directory", "path": ".claude/skills/verify-core"},
    {"role": "evidence-retention", "state": "unconfigured", "note": "verification proof is local only"},
    {"role": "index", "state": "existing", "type": "file", "path": "docs/work/README.md"}
  ],
  "multiphasePlan": "docs/work/<work-key>/<topic>.multiphase.plan.md",
  "works": {
    "core-gh-541": "docs/work/items/core-gh-541-price-payment-terms"
  },
  "external": [
    {"work": "payments-2026", "kinds": ["plan"], "repository": "sidkik/planning", "path": "docs/work/payments-2026", "reason": "shared plan owned by the planning repository"}
  ],
  "canonical": [
    {"work": "billing", "kind": "plan", "owner": "sidkik/core", "path": "docs/work/billing/c11-subscriptions.md", "reason": "existing plan predates typed filenames"}
  ]
}
```

This example illustrates the shape. Its paths are not claims about any
repository.
