---
id: performance-and-allocation-are-unmodelled
title: get_agent_performance and get_agent_fund_allocation have never returned a figure
type: question
status: open
priority: p3
created: 2026-07-29
updated: 2026-07-31
change: performance-was-already-in-the-payload
capability: agent-understanding
blocked_by: []
tags: [battlegrid, agent-understanding, mapping]
---

# get_agent_performance and get_agent_fund_allocation have never returned a figure

## Update 2026-08-06: the zeros are a baseline, not a bug

The second account settles what "every figure zero" meant. `get_agent_performance`
and `get_agent_budget` report P&L **against the agent's risk-budget baseline**,
not against its trade history:

| | account 1, Fade Master II | account 2, `THE .0` |
|---|---|---|
| `maxConcurrentExposureUsd` | 0 | 250 |
| `get_agent_performance.realizedPnlUsd` | **0** | **-0.23** |
| `pnlCurveUsd` points | **0** | **26** |
| trade record net P&L | -4.47 (18 trades) | -0.236 (26 trades) |

Where a budget is configured the tool is **correct to the cent** and its curve
has one point per closed trade. Where none is (`maxConcurrentExposureUsd: 0`)
there is no baseline to measure from, and it reports zeros.

So this was never a populated-vs-empty payload problem. The shape was always
right; the *condition* for it carrying figures is a configured budget, which
none of account 1's agents has. Corrected in `docs/MCP_SERVER.md` and
`src/ports/agents.ts`, both of which stated it as a platform defect.

`read_trading_record` still derives from the closed trades, and should: it
answers the same way whether or not a budget was ever set.

One field is genuinely wrong, though — **`accountEquityUsd: 0` on both
accounts**, including one holding $49.13. Nothing in this product renders it,
and nothing should until it is understood.


Both tools are now **called**, on twelve agents across two accounts — one with 97
games and 18 trades. Neither has ever answered with a populated value.

```
get_agent_performance
  { agentId, realizedPnlUsd, drawdownUsd, maxCumulativeDrawdownUsd,
    pnlCurveUsd, haltedAt }

  pnlCurveUsd  empty on all nine agents of the older account
  every figure zero, except maxCumulativeDrawdownUsd: 100 on three —
  which is their configured cap echoed back, not a result

get_agent_fund_allocation
  { agentId, availableUsd, committedUsd, lifetimeAllocatedUsd,
    lifetimeRecalledUsd, haltedAt, perTradePushEnabled }

  zeros across all nine
```

**The item this replaces said the opposite** — that `get_agent_performance` was
where a settled result would come from, and that nothing should be written about
scoring until it was called. Calling it settled that: it is not where the
performance is. The roster payload is, and
`performance-was-already-in-the-payload` models it from there.

## Why they stay unmodelled

Shape observed is not behaviour observed. Building a surface on fields that have
only ever been zero means guessing what a populated one looks like — which is
exactly how the `settled()` caveat happened, and it took a second account to
correct it.

`tests/agent/performance.test.ts` asserts the emptiness. If a future account
populates these, the suite fails and this item gets its answer. That is the
cheapest possible trigger and it costs nothing to keep.

## The open question underneath

**Two P&L figures disagree and nothing here knows why.**

`Fade Master II` reports, on the roster payload,
`tradeStats: { trades: 18, winLoss: { wins: 5, losses: 13 }, avgPnl: -0.248160045 }`.
The same agent's `get_agent_performance` reports `realizedPnlUsd: 0`.

Both cannot be a complete account of the same thing. Worth testing rather than
assuming: a reporting period on one and lifetime on the other; realised versus
unrealised; per-agent allocation versus account-wide.

Until that is answered the product shows the roster's figure and captions it
*"As BattleGrid reports it on the agent itself"* — naming the source rather than
presenting a reconciled number nobody has reconciled.

## Related

- `performance-was-already-in-the-payload` — modelled the roster block and
  declared these out of scope, with this evidence
- `the-journal-can-never-show-anything` — where this item was first filed, under
  a premise the older account disproved

## Re-triaged P3, 2026-07-31

Everything buildable here shipped or stands guard: the roster block is
modelled (`performance-was-already-in-the-payload`), the product captions
its figure with its source, and `tests/agent/performance.test.ts` is the
tripwire that fires the day either tool returns a populated value. The P&L
discrepancy stays a real question, but it waits on evidence no session can
fabricate — a populated account or platform documentation. Nothing P2-sized
remains to do.
