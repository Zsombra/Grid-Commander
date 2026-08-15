---
id: the-surface-record-is-a-deployment-behind
title: The recorded capabilities artifact predates the 2026-08-15 deployment — re-probe when a keyed environment runs
type: chore
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: platform-mapping
github: "287"
blocked_by: []
tags: [battlegrid, surface-record, conformance, needs-key]
---

# The surface record is a deployment behind

## What

`docs/battlegrid-mcp-capabilities.json` still declares `regimeAutoDerive`
and `regimeTimeframe` required on `apply_strategy_plan`'s plan. The live
server rejected both as `unrecognized_keys` on 2026-08-15 (~08:18Z, #285)
after a mid-session deployment — observed both ways in one minute
(refused with the keys, accepted without; Salamis revision 3 → 4). The
artifact is provably one deployment behind on at least these two rows,
and possibly more: nothing else has been compared since the deployment.

## Why it could not be fixed in-session

Re-probing requires `BATTLEGRID_API_KEY`, which is not in this
environment — it lives only in the operator's scheduled-task environment.
Verified absent from the user registry 2026-08-15 (checked presence, not
value).

## Interim protection

`tests/architecture/payload-conformance.test.ts` — the apply case now
expects **exactly the four stale rows by name** (change
`the-plan-matches-the-live-contract`). Any other drift still fails the
guard, and the moment the artifact is re-probed the four rows vanish, the
assertion fails, and the expectation block gets deleted. This item is the
carrier for that re-probe.

## Done when

- `tools/generate_mcp_reference.py` (or the probe path that produced the
  artifact) is re-run in a keyed environment against the live server.
- `docs/battlegrid-mcp-capabilities.json` is regenerated and the diff
  reviewed — expect the two regime keys gone from apply's plan, and check
  for anything else the deployment moved (the v18.2.0 lesson: outputs
  drift when inputs do not).
- The named-rows expectation in `payload-conformance.test.ts` is deleted
  and the apply case asserts `[]` again.
- `tests/strategy/compiled-plan.test.ts` and the conformance suite pass
  clean.
