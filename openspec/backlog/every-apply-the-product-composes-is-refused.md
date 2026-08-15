---
id: every-apply-the-product-composes-is-refused
title: The live apply schema dropped two keys toApplyPlan still sends, so every strategy apply through the product is refused
type: bug
status: done
priority: p2
created: 2026-08-15
updated: 2026-08-15
change: "the-plan-matches-the-live-contract"
capability: strategy-authoring
github: "285"
blocked_by: []
tags: [battlegrid, dead-write-path, conformance, live]
---

# Every apply the product composes is refused

## What

Observed live 2026-08-15 ~08:18Z while performing #147's authorized write.
`apply_strategy_plan` refused the plan the product's own projection
composes:

```
MCP error -32602: unrecognized_keys: 'regimeAutoDerive', 'regimeTimeframe'
  at request.plan
```

Resubmitting the identical plan **without those two keys** succeeded
(Salamis revision 3 → 4, `changedAxes: ["CONDITIONS"]`). So the live
server's input validation no longer accepts two fields that:

- the **same server's declared schema** listed as *required* on the UPDATE
  plan when the tool schemas were loaded earlier this session, and
- `toApplyPlan` (`src/domain/strategy/compiled-plan.ts:33` —
  `PLAN_FIELDS_FROM_POST_STATE` includes `regimeAutoDerive` and
  `regimeTimeframe`) still sends on every apply.

Consequence: **every strategy apply the product's UI composes — retune,
conditions-save, section editor — is currently refused by input validation
before reaching any business logic.** The successful write in #147 worked
only because the keys were dropped by hand.

## Why p2

A whole write surface is dead, silently, in exactly the shape of the sixth
dead write path (the `conditions` omission) but inverted: then the product
sent too little, now it sends too much. The bounce path will carry the
refusal to the operator (that machinery works), but no strategy edit can
land until the projection matches the live contract.

## Timing evidence

The platform very likely redeployed mid-session: the MCP connector returned
"server isn't responding" twice at ~07:00Z, and the session's tool schemas
(loaded before that window) declare the two keys required while the
post-window validation rejects them. The repo's second domain fact — the
tool list goes stale after a deployment, rediscover at runtime — caught in
the act, this time between a schema read and a call in one session.

## What would fix it

A lite/standard change: drop the two keys from
`PLAN_FIELDS_FROM_POST_STATE`, re-run the conformance sweep against the
live surface (the artifact is now behind), and re-probe compile→apply.
Note `compile_strategy_plan` still ACCEPTS `regimeTimeframe` in its request
and returns it in `postState` — only the apply plan dropped them, so the
compile side needs no change. Mind the possibility the platform reverts:
the fix should read as "match the live contract as of v-next", and the
conformance guard — which caught the v15 additions "the hour they landed" —
is the standing protection; check why it has not flagged this drift
(likely its artifact predates today's deployment).

## Resolution (2026-08-15, change `the-plan-matches-the-live-contract`)

The two keys moved from `PLAN_FIELDS_FROM_POST_STATE` into
`FIELDS_APPLY_REJECTS` — asserted absent by name, dated comment citing the
live two-way observation. The guard question is answered: the conformance
artifact `docs/battlegrid-mcp-capabilities.json` predates the deployment,
so the guard was validating against yesterday's contract. Its apply case
now expects **exactly the four stale rows by name** — self-expiring when
the artifact is re-probed. The re-probe needs `BATTLEGRID_API_KEY` (absent
here; scheduled-task environment only) and is carried by
[[the-surface-record-is-a-deployment-behind]] (#287). Live proof of the
fixed shape already exists: the 08:18Z apply that succeeded used exactly
the projection the code now produces (Salamis rev 3 → 4).
