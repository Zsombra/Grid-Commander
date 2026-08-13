---
id: radar-says-why-it-is-blocked
title: v17 radar deployments carry blockedReason/blockedSince and a BLOCKED state — refusal telemetry, unread
type: feature
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-13
change: ""
capability: agent-deployment
github: "135"
blocked_by: []
tags: [battlegrid, v17, radar, deployment]
---

# Radar says why it is blocked

## What

BattleGrid v17.2.0 grew the radar deployment reads (`get_radar_deployment`,
`list_radar_deployments`, `get_radar_activity`, `preview_radar_resolution`)
by `blockedReason` and `blockedSince`, and the resolution `section` enum
gained a `BLOCKED` state alongside `SCANNING`/`IDLE`. A radar deployment
that is not doing anything can now say why, and since when.

In the same deployment, `override_agent_protection`'s declared output
gained `observedLiveStopLoss` — the venue's actual stop at override time.
That tool is wager-scoped and this product offers no path to it; the field
is recorded here so the fact is filed somewhere rather than nowhere.

## Why it matters

The deployment surface holds the house rule that a state the product
cannot explain is rendered as unexplained rather than guessed. The
platform now explains one more state itself — `BLOCKED`, with reason and
age — which is precisely the kind of sentence the radar surface should
pass through instead of leaving a deployment looking idle for no reason.

## Evidence

- Declared-schema diff v16.0.0 → v17.2.0 in
  `docs/battlegrid-mcp-capabilities.json` (regenerated 2026-08-11):
  `get_radar_deployment` +28 leaves; section enum `SCANNING/IDLE` →
  `…/BLOCKED/…`.
- No blocked radar deployment has been observed live; `blockedReason`'s
  vocabulary is unestablished.
- Live re-read 2026-08-12 (`list_radar_deployments`, v17.2.0): all 20
  policies answer `blockedReason: null, blockedSince: null` — the fields
  are on every row, just never populated here. Two additions the schema
  diff had not surfaced: the fleet `summary` now carries a `blocked`
  count (0) alongside the other section counts, and the response has a
  top-level `blockedAgents: []` array — a second, agent-level blocked
  surface whose row shape is likewise unobserved. Whatever models the
  coin-level BLOCKED state should expect an agent-level sibling.
- Live re-read 2026-08-13 (`list_radar_deployments`, **v18.2.0**): unchanged
  across a major version. 20 policies, every one `blockedReason: null,
  blockedSince: null`; `summary.blocked: 0`; `blockedAgents: []`. All 20 sit at
  `section: SCANNING`. Fifteen of the twenty carry a `qualificationBlock`
  (`AGGREGATE_BELOW_MIN` ×14, `ATR_VOLATILITY_BELOW_MIN` ×1) while still
  reporting `SCANNING` — so *not qualifying* and *being blocked* are plainly
  different axes on this payload, which is worth knowing before either is
  modelled.

## Notes

> **Corrected 2026-08-13.** This section read: *"The product does not read
> `resolvesNow` at all today (`grep resolvesNow src/` is empty), so nothing
> renders or mis-renders the new state."* **The first clause is false** — the
> grep is not empty. The conclusion survives, for a different and narrower
> reason, which is written out below. The claim was almost certainly true when
> written and was carried forward unchecked.

The product **does** read `resolvesNow` — `src/infrastructure/battlegrid/radar-adapter.ts:161`
pulls it out of every policy row:

```ts
const resolves = (p['resolvesNow'] ?? {}) as Record<string, unknown>;
…
onDutyAgentId:       str(resolves['onDutyAgentId']),
openPositionAgentId: str(resolves['openPositionAgentId']),
```

**Two fields, and `section` is not one of them.** That is what keeps the
conclusion standing: a `BLOCKED` section value cannot mis-render, because
nothing reads `section` to render from. `RadarDeployment` derives its own state
from on-duty and open-position ids instead.

So modelling still starts from nothing, but the reason to say so is precise:
not "the block is unread" — the *envelope carrying it* is read, and a mapper
would have somewhere to land. Whoever takes this adds fields to an existing
mapping rather than introducing a read.

The unchanged part: observe a blocked deployment first, then model. The house
rule stands that an unrecognised state renders as unrecognised, never invented —
and note `mapDeployments` currently treats a missing `resolvesNow` as
"absence nulls the fields and never fails the row", which is the right default
and also means a `BLOCKED` row would arrive today looking like an ordinary one.
