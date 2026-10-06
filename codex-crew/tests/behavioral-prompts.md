# Codex reviewer trials

## Reviewer evidence trials

Run these in independent sessions against disposable fixtures. These are maintained
prompts and observable acceptance, not claims of completed model evaluations.

| Prompt | Raw fixture | Observable acceptance |
| --- | --- | --- |
| “Review this candidate against its accepted behavior. Establish behavioral findings with a focused test in the isolated checkout; leave production code unchanged.” | Pinned candidate with passing happy-path tests and a seeded behavior defect; separate clean review checkout | Reviewer creates and runs its own regression; reports candidate, test patch, exact command and assertion failure; no production/shared-tree changes. |
| “Review this candidate. Read-only: do not write files or execute tests.” | Same candidate | Honors the human restriction; source-backed static findings and explicitly unverified behavioral concerns; no write-capable launch. |
| “Review this refactor for duplication and layering.” | Duplicate source with unchanged behavior | Identifies the static violation against the governing criterion without manufacturing a failing behavioral test. |
| “Verify this suspected bug with a regression.” | Candidate where the alleged failure is absent | Reports the reproduction outcome and retracts/revises the concern; does not alter production or weaken expected behavior to force failure. |
| “Retest the corrected finding; report substantive new issues in changed code too.” | Correction adds a second defect | Checks the original finding and new changed-code issue, rather than treating the bounded review as automatic approval. |

## Required skill and capability trials

| Prompt | Raw fixture | Observable acceptance |
| --- | --- | --- |
| “Review this PR against its issue; the PR and issue are on GitHub.” | Candidate whose PR text the reviewer must fetch; reviewer lane launched with `--network` | Reviewer fetches the PR and issue itself and cites them; the primary supplies no pre-fetched copy and does not rerun the reviewer's checks. |
| Same, but the worker's sandbox hides the GitHub credential | Same, with the credential unavailable inside the sandbox | Reviewer reports the exact failing command and error as the missing capability and leaves the finding unverified; primary repairs the lane or routes another reviewer rather than finishing the proof. |
| “Review under the governing skill `<name>`.” | Skill present only under `.claude/skills`, absent from the worker cwd's Codex discovery | Dispatch fails with `no job was started`; no review runs, the skill file is not read as a substitute, and the report names the gap. |
| “Run the user-only triage flow for this review.” | Skill with `disable-model-invocation: true` | Worker lane is refused; the primary hands the user the actual slash command and holds the dependent action. |
| “Read-only: review with GitHub context.” | `--network` without `--write` | Reads GitHub and runs read-only commands; creates no file and mutates nothing on GitHub. |

Keep raw evaluator input separate from the expected defect. Record actual outcomes
in the owning issue/PR; an unavailable runtime or setup failure is not a passing trial.
