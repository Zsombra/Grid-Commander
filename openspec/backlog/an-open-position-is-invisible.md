---
id: an-open-position-is-invisible
title: An agent can be holding live money and no surface in this product says so
type: feature
status: done
priority: p1
created: 2026-08-06
updated: 2026-08-06
change: what-it-holds-and-what-it-could-not-place
capability: agent-understanding
blocked_by: []
tags: [battlegrid, positions, money, live, observed-shape]
---

# An agent holding a live position, and nothing shows it

## Closed 2026-08-06 by `what-it-holds-and-what-it-could-not-place`

`/agents/[id]` now shows what the agent is holding, from
`list_user_active_positions` — one account-wide read carrying `agentId` per
row, filtered per agent. Every figure is the platform's: mark price,
unrealized result, ROE, margin, liquidation price. Nothing is recomputed.

The three states hold: `holding`, `flat`, and `unreadable`. An unpriced
position renders as unknown rather than flat, because
`unpricedPositionCount` exists and a position the platform could not value is
not one worth nothing.

The effective stop is shown as current and labelled so, and `/pipeline`'s stop
is relabelled "at the decision" — so one word cannot mean two numbers across
two surfaces. **The join that shows the drift between them is still open** in
`the-stop-that-moved-is-not-the-stop-we-show`.

Postscript: the HYPE position closed between the build and the probe run —
open 17:10, gone by 19:10. `exposure-probe` therefore asserts the shape of
whatever it finds and prints which branch it saw, rather than demanding a
position and failing on market timing.


`THE .0` on the second account opened **HYPE LONG at 17:10 on 2026-08-06** —
$12.37 notional, 5× leverage, $2.47 margined — and was still holding it while
this was written.

Grid-Commander shows **nothing**. `/agents/[id]` reports deployments and what
has stopped it; `/agents/[id]/trades` reports *closed* trades. There is no
surface, anywhere, for a position that is open right now. The one thing an
operator would look for first is the one thing absent.

## Why it was not built, and why that reason is gone

`open-position-rows-are-unobserved` and `trading-telemetry-is-unread` were both
filed as blocked: the position tools answered empty on the first account, and
this repository does not model a shape nobody has seen — that habit caused
three of the dead paths in `HANDOFF.md`.

**The second account has the shape.** Both tools answer, richly.

## The observed shape (live 2026-08-06)

`get_agent_open_positions` — the agent-scoped, narrow one:

```json
{"positions": [{
  "positionId": "2a7457a8-…", "coinTicker": "HYPE", "direction": "LONG",
  "entryFillPrice": 56.233, "entryFillQuantity": 0.22, "notionalUsd": 12.37126,
  "stopLoss": 55.67456526, "takeProfit": 57.34986948, "leverage": 5,
  "conviction": 0.65, "riskRewardRatio": 2, "timeHorizon": "1h",
  "executedAt": "2026-08-06T17:10:18.262Z", "signalLogId": "da98f325-…"}]}
```

`list_user_active_positions` — account-wide, and far richer. Per position it
adds the **live** half: `markPrice`, `currentNotionalUsd`, `marginedUsd`,
`openValueUsd`, `unrealizedPnlUsd`, `priceMovePct`, `roePct`,
`effectiveLeverage`, `effectiveStopLoss`, `effectiveTakeProfit`,
`liquidationPrice`, `ageMs`, `status`, `pricingStatus`, plus `decisionId` and
`signalLogId` linking back to the reasoning. It also carries a `totals` block
across every agent and an `agents` roll-up.

Two fields deserve naming:

- **`pricingStatus: "LIVE"` with `refreshIntervalMs: 10000`.** The platform is
  telling a client how often to re-read. Every surface in this product is a
  static server render, so a position page has a staleness problem no other
  page here has. It must at least **say when it was priced** rather than
  present a mark price as current.
- **`unpricedPositionCount`.** The platform distinguishes a position it could
  not price from one worth nothing — the same *unreadable is not empty*
  distinction this product enforces everywhere else, arriving as a field.

## The trap, already visible

The decision recorded `stopLoss: 55.67456526`. The live position reports
`effectiveStopLoss: 55.954`. **The stop has moved** — position management
(`BERETTA`, trailing enabled) is doing its job. A surface showing the
decision's stop as if it were current would be wrong by 28 cents on a $56
instrument, and would be wrong in the direction of understating protection.

Show the effective one, and where it differs from what was decided, show both.

## First step when taken

`get_agent_open_positions` behind the agents port for the per-agent surface;
`list_user_active_positions` for the roster, where a `totals` block answers
"what am I exposed to right now" in one read. Model `unrealizedPnlUsd` and
`roePct` as nullable — `unpricedPositionCount` exists precisely because they
can be absent, and a null unrealized P&L is not a P&L of zero (the rule this
capability already holds for win rate and for unconfigured gauges).

Do not compute a mark price, a P&L or a liquidation price. All three arrive.
