# Grok delegation trials

Run the prompts in independent Claude and Codex sessions with the skill available
and a disposable repository. Give the session only its prompt and the named raw
fixture. Keep the evaluation expectations separate. These are manual behavioral
trials, not completed test results.

| Prompt | Raw fixture | Observable acceptance |
| --- | --- | --- |
| “Have Grok review this patch. Do not edit it.” | A known faulty patch and its accepted requirement | Actual bounded Grok launch with read-only permissions, pinned comparison, captured result and verified finding; no bridge installation detour. |
| “Have Grok fix this failing test in the scratch repository.” | A deterministic failing test and explicit write authority | Actual write-capable launch within the disposable checkout, narrow authority, retained red/green and independently inspected diff; no repeat permission question for the authorized edit. |
| “Ask the same Grok session to explain its finding.” | Finished prior run and UUID | Uses exact UUID with resume and separate result files, not a new session or directory-most-recent continuation. |
| “Have Grok investigate this.” | Host without Grok available | Names the missing CLI capability and preserves the brief; does not claim execution or automatically install dependencies. |
| “Stop that Grok task; I changed the scope.” | Owned running job handle | Stops and verifies only the owned job, reports partial state; does not claim in-flight steer or race a replacement against ongoing writes. |

Record actual outcomes in the owning issue/PR. A timeout, denial or empty result
is a failed/blocked trial, not evidence of task completion.
