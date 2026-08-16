---
id: two-budget-fields-read-zero-against-live-money
title: Two get_agent_budget fields read zero while the same payload prices the position correctly
type: bug
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: agent-understanding
github: "336"
blocked_by: []
tags: [battlegrid, v19, agent-understanding, dead-field, unwired]
---

# Two get_agent_budget fields read zero against live money

## What

`get_agent_budget` is the read behind `/limits`, and this product trusts it —
correctly, for the four gauges and the exposure figures. **Two of its other
fields return `0` under conditions where `0` is not a possible answer**, in the
same payload, in the same call that gets the exposure right.

Measured live at v19.2.0, 2026-08-16, on Undertow
(`d0f6829f-96f8-468d-8797-4a04e8dc8e37`), holding three open positions:

| field | reads | what the platform says elsewhere, same minute |
|---|---|---|
| `accountEquityUsd` | **0** | `get_account_state.balance.usdc` **37.997555**, `tradingWalletProvisioned: true`, and $11.94 of margin live in the trading wallet |
| `openUnrealizedPnlUsd` | **0** | `list_user_active_positions.totals.unrealizedPnlUsd` **0.177854**, `pricingStatus: LIVE`, all three positions priced |

The same payload reads `capitalAtRiskUsd 11.95` and `gauges.exposure.fill
11.95` against `list_user_active_positions.totals.marginedUsd 11.9419` — so the
call is not stale, not unauthenticated, and not looking at the wrong agent. It
prices the position correctly and reports zero equity and zero open P&L beside
it.

**`accountEquityUsd` is wrong under either reading of "equity".** The tool's own
description calls it "owner account equity". If that means the play balance it
should be ~38.00; if it means trading-wallet equity it cannot be 0 while
$11.94 of margin is sitting in that wallet. There is no pot for which zero is
the right answer, which is what retires the "these may be two different pots"
caveat that [[performance-and-allocation-are-unmodelled]] (#107) recorded
without concluding.

## Why it matters

Not because anything renders them — **nothing does**, and that is the point.
Both fields are on the payload of a tool this product already calls and already
trusts, sitting inches from four figures that are correct. `openUnrealizedPnlUsd`
in particular is exactly the number a "what is this agent up right now" surface
would reach for first, and it would be wrong and confident.

This is the same shape as #107 — a declared field the platform does not wire —
except #107's tool was never called by this product, so the mitigation was
"don't call it". Here the tool is load-bearing, so the rule has to be narrower
and it has to be written down: **read the gauges and the exposure figures from
`get_agent_budget`; do not read `accountEquityUsd` or `openUnrealizedPnlUsd`
from it.** Equity comes from `get_account_state`; open P&L comes from
`list_user_active_positions`, which reports both correctly.

## Evidence

Read-only over the authenticated MCP connector, 2026-08-16, v19.2.0, three
calls inside one minute:

```
get_agent_budget(Undertow)
  capitalAtRiskUsd 11.95   headroomUsd 33.05   gauges.exposure.fill 11.95
  accountEquityUsd 0       openUnrealizedPnlUsd 0

list_user_active_positions
  totals.marginedUsd 11.9419   totals.unrealizedPnlUsd 0.177854
  pricingStatus LIVE           openPositionCount 3

get_account_state
  balance.usdc 37.997555   tradingWalletProvisioned true
```

Prior sighting of the equity half, recorded but not concluded:
`performance-and-allocation-are-unmodelled` (#107), 2026-08-16 — `0` against a
balance of 38.573919. This item is where it is concluded.

## Notes

- The negative control that made #107 readable applies here too: a flat agent
  would report `0` correctly on both fields, so **only a reading taken while
  `openPositionCount > 0` can falsify either**. The reading above is such a
  reading.
- `openUnrealizedPnlUsd` was already listed as unread in
  [[the-payload-carries-more-than-is-read]] (#110). That item catalogues it as
  *not yet mapped*; this one records that it must not be mapped. The two should
  not be merged — #110 is a survey of unmapped fields, most of which are fine.
- Per [[upstream-defects-are-answered-in-product]] this is not written up for
  BattleGrid. The product-side answer is a reachability guard in the shape of
  `tests/architecture/no-population-constants.test.ts` — the tool may be called,
  those two field names may not be read from its response.
- Not p2: nothing renders either field today, so nothing is currently wrong on
  any surface. It becomes p2 the moment a surface reaches for open P&L, which is
  a plausible next feature.
