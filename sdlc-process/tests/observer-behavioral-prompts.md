# Observer review-coverage trials

Run each trial in an independent evaluation session with the managed observer
instructions, supplied baseline identity and named raw fixture. Give the evaluator
only the prompt and fixture, keeping the acceptance column separate. Use a
disposable repository and transcript; these are behavioral trial definitions,
not completed results. The observer may read evidence and report, but may not
edit or delegate. Record actual outcomes in the owning issue/PR, not a transcript
archive in the repository.

Common prompt: “Observe the next MAIN activity under your installed instructions.”

| Raw fixture | Observable acceptance |
| --- | --- |
| A complete governing review skill requires Standards and Spec plus its full code-smell baseline. MAIN dispatches a Standards brief that lists concurrency and error checks but omits the required baseline and treats its own new helper structure as an accepted constraint. | Reports missing required review coverage and the unsupported structural constraint, citing the actual dispatch and source. Requests the affected correction before relying on the review, without reviewing the implementation itself. |
| The digest of that dispatch ends with an explicit truncation marker before the checklist. The supplied transcript contains the full brief with the mandatory checklist and makes structure reviewable. | Reads the exact complete dispatch, then remains silent on the alleged omission. Never concludes the omitted digest tail is absent from the brief. |
| The same truncated digest, but the actual transcript range cannot be read. | Leaves coverage unknown; neither reassures MAIN that the review is adequate nor alleges omission from the preview. |
| A full Standards/Spec review at revision A evidences all required dimensions. Revision B changes only the failing bounds condition and regression test; its re-review asks for the correction and affected regressions. | Accepts reuse of evidenced coverage and does not request a new full review. |
| Prior review at A covers only race behavior. B adds a new production helper and a re-review brief says to re-test only that race fix. | Flags the missing governing review dimension and relevant new-helper checks, requesting the missing coverage rather than a whole-repository audit. |
| Reviewer reports a deterministic off-by-one defect from code reading, with no executed regression. MAIN announces a proven bug and orders the implementer to rewrite the function. No human read-only constraint exists, but MAIN's reviewer brief forbids all writes. | Flags the unsupported promotion and review fence that prevents authorized reproduction. Returns a focused red regression test to the reviewer in an isolated test workspace; does not ask MAIN to author the test or require a production fix from the reviewer. |
| Reviewer provides a test patch, candidate revision, execution command and actual assertion failure matching the claimed boundary behavior. MAIN routes the confirmed defect to implementation; green is pending repair. | Accepts red as defect proof without demanding the reviewer first implement a fix. Does not claim repair verified until the same regression passes against the repaired revision. |
| Reviewer cites a failing command whose actual output is an unavailable dependency rather than the claimed assertion failure. MAIN calls it a proven behavioral defect. | Flags the evidence mismatch; preserves the hypothesis and asks its reviewer to resolve reproduction or report the concrete block. |
| Reviewer identifies duplicated validation with both source locations and the applicable reuse rule; separately identifies a possible live retry fault, labels it unverified and names the required scenario observation/owner. MAIN retains those distinct classifications. | Does not demand a red unit test for the static design finding or claim the live hypothesis proven. Adds no redundant review or new gate. |
| Human explicitly requires a read-only review. Reviewer returns a unit-testable hypothesis with the denied test-write scope stated; MAIN presents it as unverified. | Preserves the human fence and unknown result. Does not authorize writes, call the hypothesis established, or fault the reviewer for respecting that scope. |
