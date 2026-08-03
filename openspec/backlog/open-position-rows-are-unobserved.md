---
id: open-position-rows-are-unobserved
title: A public agent's open-position rows have never been seen, so they are not modelled
type: question
status: open
priority: p3
created: 2026-08-03
updated: 2026-08-03
capability: agent-comparison
blocked_by: []
tags: [battlegrid, explorer, unobserved-shape]
---

# Open-position rows have never been seen

`get_public_agent_unrealized_pnl` answers a real envelope:

```json
{"snapshot": {"unrealizedPnl": 0, "openPositionCount": 0,
              "positions": [], "fetchedAt": "2026-08-03T09:36:43.724Z"}}
```

`positions` has only ever been observed **empty**. On 2026-08-03 not one
of the 37 agents in the field held an open position — the field list's
`activeTradeCount` was 0 for every single one.

## Why it is not modelled

The declaration promises "per-position size, entry price, unrealized P&L,
leverage, raw price move, and return on equity". It does not give the key
names, and inventing key names is the specific mistake behind three of the
dead paths in `HANDOFF.md` (agent create's `brain.kind`, agent update's
23-vs-20 fields, `toApplyPlan`'s three omissions). So
`OpenPositions.positionsUnmodelled` carries the rows through as `unknown[]`
— the count is trustworthy, the contents are not interpreted — and
`/explorer/[agentId]` says the total and admits it cannot read inside the
rows.

## First step when taken

Poll the field for any agent with `activeTradeCount > 0` (the explorer list
carries it per agent, so this is one call), then read that agent's
snapshot and map from the observed row. Until such a row exists, there is
nothing to do here and nothing should be guessed.
