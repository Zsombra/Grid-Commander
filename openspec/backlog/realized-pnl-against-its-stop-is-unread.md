---
id: realized-pnl-against-its-stop-is-unread
title: get_agent_performance carries a whole risk picture — curve, drawdown, the stop, and whether it halted — and nothing renders any of it
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
`get_agent_performance` answers a different question that nothing here asks:

```
realizedPnlUsd            cumulative realized P&L since the budget baseline
drawdownUsd               peak-to-trough of that curve
maxCumulativeDrawdownUsd  the stop it is measured against
pnlCurveUsd               one point per settlement, oldest-first, for a sparkline
haltedAt                  when the platform stopped it, or null
```

Live 2026-08-13, v18.2.0:

| agent | realized | drawdown | stop | curve | halted |
|---|---|---|---|---|---|
| Undertow | −0.84 | 1.90 | 6 | 41 pts | null |
| Breakwater | +0.30 | 0.41 | 5 | 25 pts | null |
| Vanguard | 0 | 0 | 6 | empty | null |

## Why it matters

This is the number the platform **acts on**. `maxCumulativeDrawdownUsd` is the
stop that halts the agent; `drawdownUsd` is how close it is; `haltedAt` is
whether it already happened. Undertow is at 1.90 against a stop of 6 — a third
of the way to being switched off — and no surface in this product says so.

The record pages answer "how has it done". None answers **"how close is it to
being stopped"**, which is the question an operator with money at risk asks.

Three properties make it cheap:

- **Self-describing.** The stop comes back in the same payload, so "1.90 of 6"
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
meaning**, next to the existing one, never replacing it. `ports/agents.ts:142`
argues correctly why the record must not move; #189 upheld it.

Any surface must say which is which, or it recreates the confusion the caveat
sentence on `record.tsx` exists to prevent.

## First step

A `/propose`. It needs a port method, a mapper, and a design round for the
sparkline — the product draws no chart anywhere today, so this would be the
first, and that is a design decision, not an implementation detail.

Related: [[performance-and-allocation-are-unmodelled]] (#107), whose allocation
half stays blocked until a position is open.
