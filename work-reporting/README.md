# work-reporting

Work reporting for a native agent, independent of any workflow or process.

- `work-reporting:report-work` skill: when to report (start, meaningful change, issue or board discovered, finish) and what to put in a report.
- `skills/report-work/scripts/report-work.mjs`: Node (stdlib only) tool the skill runs. It POSTs the report as JSON to `SIDKIK_WORK_REPORT_URL` with `Authorization: Bearer $SIDKIK_WORK_REPORT_TOKEN`, 10 s timeout, client-side limits matching the server: 16 KiB per report, at most 16 `--evidence` values, at most 2048 bytes per value. The supervisor that launches the native session injects both variables and binds the token to the session, so the agent never supplies identity. Exit 0 reported, 1 delivery failed or rejected, 2 usage or missing environment.

Install changes nothing in a session by itself; without the supervisor's variables the script exits 2 with an explanation.

Check: `node --test work-reporting/tests/*.test.mjs`. It covers the package and the script against a local server; model behavior and native skill loading need their own evidence.
