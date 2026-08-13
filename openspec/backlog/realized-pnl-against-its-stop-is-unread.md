---
id: realized-pnl-against-its-stop-is-unread
title: get_agent_performance carries curve, realized P&L, drawdown, the stop and the halt — /limits renders the stop, the distance and the halt; the curve and the realized figure render nowhere
type: feature
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: agent-understanding
github: "202"
blocked_by: []
tags: [battlegrid, agent-understanding, v18, unused-capability]
---

# Realized P&L against its stop is unread

## What

Deciding [[the-performance-design-rests-on-a-dead-premise]] (#189) settled that
the roster stays the source for the **record**. It also established that
`get_agent_performance` answers a different question:

```
realizedPnlUsd            cumulative realized P&L since the budget baseline
drawdownUsd               peak-to-trough of that curve
maxCumulativeDrawdownUsd  the stop it is measured against
pnlCurveUsd               one point per settlement, oldest-first, for a sparkline
haltedAt                  when the platform stopped it, or null
```

Four of those five reach this product already, by another route.
`get_agent_budget` carries `realizedPnlUsd`, `drawdownUsd`,
`maxCumulativeDrawdownUsd` and `haltedAt` on the wire
([[the-payload-carries-more-than-is-read]] (#110), lines 87-92), and this
product calls it (`src/infrastructure/battlegrid/agent-adapter.ts:77,378-390`).
`mapBudget` keeps the stop and the halt and drops the top-level dollar pair
(`src/infrastructure/battlegrid/agent-mapper.ts:404-436,446-451`). Only
`pnlCurveUsd` is exclusive to `get_agent_performance`.

Live 2026-08-13, v18.2.0:

| agent | realized | drawdown | stop | curve | halted |
|---|---|---|---|---|---|
| Undertow | −0.84 | 1.90 | 6 | 41 pts | null |
| Breakwater | +0.30 | 0.41 | 5 | 25 pts | null |
| Vanguard | 0 | 0 | 6 | empty | null |

Re-verified 2026-08-13: the five fields, the surfaces that render them, and the
claim that a sparkline would be this product's first chart were re-checked
against the code, and three of them moved — `/limits` already renders the stop,
the distance to it and the halt, `get_agent_budget` already carries four of the
five fields, and `TradeChartSvg` already draws one chart. What stays unread is
`realizedPnlUsd` and `pnlCurveUsd`, so the case narrows rather than closes.

## Why it matters

This is the number the platform **acts on**. `maxCumulativeDrawdownUsd` is the
stop that halts the agent; `drawdownUsd` is how close it is; `haltedAt` is
whether it already happened.

Two of those three already have a surface. `/limits` renders the distance to
the total-loss stop as a gauge — "Loss in total — {used} of {ceiling} ·
{remaining} left", the drawdown gauge's `fill` against
`maxCumulativeDrawdownUsd` (`src/presentation/components/ceilings.tsx:43`,
`src/infrastructure/battlegrid/agent-mapper.ts:449`,
`src/domain/agent/budget.ts:72`) — and Undertow's stop is set at 6
(`openspec/JOURNAL.md:3208`), so 1.90 of 6 is already readable there. It
renders the halt too, as an alert: "BattleGrid has stopped this agent."
(`src/presentation/components/ceilings.tsx:24-28`), from the `haltedAt`
`mapBudget` maps (`src/infrastructure/battlegrid/agent-mapper.ts:424,431`) and
`ReadBudgetQuery` exposes (`src/application/use-cases/read-budget.query.ts:53`).
`get_agent_performance` adds nothing on that field. So the top-level
`drawdownUsd` that `mapBudget` drops duplicates a number already on screen;
`realizedPnlUsd` does not.

What no surface shows is the shape of the loss behind that distance: the
cumulative realized figure, and the curve it moved along. 1.90 of 6 reads the
same whether it arrived in one bad trade this morning or drifted there across
41 settlements, and those are two different agents. The record pages answer
"how has it done" and the gauge answers "how close is it"; nothing answers
**"how did it get here"**, which is the next question an operator with money at
risk asks.

Three properties make it cheap:

- **Self-describing.** The stop comes back in the same payload as the distance,
  on `get_agent_budget` as much as on `get_agent_performance`, so "1.90 of 6"
  needs one call, not two.
- **Unambiguous when empty.** v18 states it: "an empty curve means no
  settlements yet, not missing data." So empty renders as *nothing has settled*,
  not as an error — the distinction [[failure-is-explained]] usually costs work.
- **Already totalled.** "trade net P&L plus wager payout minus stake" — the
  platform combines both games in dollars. `performance.ts` keeps GameRecord and
  TradeRecord apart because a combined figure would average "a score and a
  dollar"; this one does not, because both sides are dollars.

## Not a swap

The roster aggregate and this measure different spans — lifetime record versus
since-the-budget-baseline — so this is a **second reading with a stated
meaning**, next to the existing one, never replacing it. `src/ports/agents.ts:140-155`
argues correctly why the record must not move; #189 upheld it.

Any surface must say which is which, or it recreates the confusion the caveat
sentence on `record.tsx` exists to prevent.

## First step

A `/propose`. The cheap route is widening `mapBudget` to keep the top-level
`realizedPnlUsd` it currently drops, not a new port method — four of the five
fields are already on a payload this product reads, and only `pnlCurveUsd`
needs `get_agent_performance`. The design round is for the sparkline alone.

That round starts from a settled precedent rather than from nothing. The
product already draws a chart: `TradeChartSvg` scales the frozen candles itself
and emits wicks, bodies, level lines and entry/exit markers
(`src/presentation/components/trade-story.tsx:98-190`), rendered on the trade
story page (`app/(app)/agents/[id]/trades/[logId]/page.tsx:90`) since
`2026-08-08-a-closed-trade-has-no-story`. Hand-scaled SVG, no charting
dependency (`package.json:25-35`), and a sentence rather than an empty
rectangle when there is nothing drawable. A P&L sparkline is the second chart,
and those are the decisions it inherits.

Related: [[performance-and-allocation-are-unmodelled]] (#107), whose allocation
half stays blocked until a position is open.
