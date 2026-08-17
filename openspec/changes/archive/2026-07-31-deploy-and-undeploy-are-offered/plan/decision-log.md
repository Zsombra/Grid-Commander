# Decision Log

DL-1 · 2026-07-31 · Phase: PLANNING · Type: scope
Decision: v1 composes the one-slot inert-extras shape; conditions/priorities
out of scope. Impacted: adapter, deploy command. Reason: only shape observed
live; unobserved combinations are guesses. Approved by: operator's standing
"DO STEP 2" + design D-3. Next: executor.

DL-2 · 2026-07-31 · Phase: PLANNING · Type: risk
Decision: first-deploy expectedRevision resolved by live enabled:false probe,
else filed. Reason: required field with unobserved create semantics; the
five-dead-write-paths lesson. Approved by: design D-4. Next: task 4.1.

DL-3 · 2026-07-31 · Phase: EXECUTION · Type: constraint (resolves DL-2)
Decision: the deploy describe refuses a coin with no deployment; there is no
create convention to send. Evidence, live 2026-07-31 on AAVE (no policy;
`get_radar_deployment` → `{"policy": null}`):
- `expectedRevision: 0` → schema refusal `-32602 … "Number must be greater
  than 0", path: ["request","expectedRevision"]` (an exclusive minimum the
  recorded artifact does not carry).
- `expectedRevision: 1` → `{"code":"CONFLICT","message":"Radar deployment
  revision 1 is stale or the policy was removed.","details":
  {"expectedRevision":1,"actualRevision":null}}`.
So `upsert_radar_deployment` replaces existing policies only; a market's
first deployment is made on battlegrid.trade. Product consequence: describe
refuses unoccupied coins with that reason; `expectedRevision` is always a
fresh read's value, never invented. Pinned by tests/live/radar-probe.test.ts
(fails the day the platform starts accepting creates). Filed:
backlog/radar-first-deployment-not-creatable-over-mcp.

DL-4 · 2026-07-31 · Phase: EXECUTION · Type: scope (amends task 4.2)
Decision: the live end-to-end walk replaces an occupied coin with itself —
same agent, same timeframe, same enabled — through describe → confirm →
perform; `delete_radar_deployment` is NOT live-walked. Reason: the task
sketch ("a Fade Master with enabled:false") predates DL-3; with creation
impossible, the only deletable deployments are the operator's real ones and
a delete cannot be undone. Evidence: HYPE r1→r2 live through the product
commands, read back enabled with the same slot agent (radar-probe run
2026-07-31; FARTCOIN r1→r2 in an earlier run of the same probe). Undeploy
remains composition-proven only (payload-conformance + command tests) —
recorded as a residual, not claimed as walked.
