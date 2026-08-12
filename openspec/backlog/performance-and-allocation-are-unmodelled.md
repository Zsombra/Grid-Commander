---
id: performance-and-allocation-are-unmodelled
title: get_agent_performance and get_agent_fund_allocation have never returned a figure
type: question
status: open
priority: p3
created: 2026-07-29
updated: 2026-08-12
change: ""
capability: agent-understanding
github: "107"
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

---

# Re-measured 2026-08-06 — the two tools have separated

They were filed as a pair and they no longer behave as one.

## `get_agent_performance` works, and the tripwire should be re-read

Account 2, `THE .0`, budget configured (`maxConcurrentExposureUsd: 250`):

```json
{"agentId":"26a60e91-…","realizedPnlUsd":-0.3,"drawdownUsd":0.69,
 "maxCumulativeDrawdownUsd":0,
 "pnlCurveUsd":[0,-0.01,-0.12,0.08,0,-0.09,-0.09,0.2,0.06,0.02,0.39,0.3,0.24,
                0.17,0.13,-0.02,-0.02,-0.02,-0.05,-0.17,0.16,0.17,0.04,-0.05,
                -0.12,-0.23,-0.3],
 "haltedAt":null}
```

Twenty-seven curve points, a signed figure, a live drawdown. This is a working
tool, and it confirms the 2026-08-06 correction above rather than adding to it:
where a risk budget exists the tool answers, where none does it reports zeros
because there is no baseline to measure from.

`tests/agent/performance.test.ts` asserts the emptiness. That assertion is
still correct **for account 1**, whose agents have no budget — but it should be
read as "this account's agents have no baseline", not as "this tool does not
answer". If it is ever pointed at a budgeted agent it will fail, and it will be
right to.

## `get_agent_fund_allocation` is still empty on an account that trades

Same agent, same moment, 26 closed trades behind it:

```json
{"agentId":"26a60e91-…","availableUsd":0,"committedUsd":0,
 "lifetimeAllocatedUsd":0,"lifetimeRecalledUsd":0,
 "haltedAt":null,"perTradePushEnabled":true}
```

Every figure zero, on the one account where the sibling tool answers to the
cent. So the budget-baseline explanation does **not** cover this one: the
budget is configured, the exposure cap is $250, and `lifetimeAllocatedUsd` is
still 0.

Which retires an inference this repository has already had to correct once —
`lifetimeAllocatedUsd: 0` was read as "never funded" on account 2 and that was
wrong. It is now measured as 0 on an agent that has demonstrably traded, so the
field means something other than what its name suggests, or is not populated on
this platform. Either way it stays unmodelled, and now for an observed reason
rather than an assumed one.

## Where that leaves the item

Still p3, still open, and narrower: **one tool of the two is a live question.**
`get_agent_performance` is answered. `get_agent_fund_allocation` has now been
called on twelve agents across two accounts, including one with a configured
budget and a trading history, and has never returned a non-zero figure.

`accountEquityUsd: 0` is also still 0 in `get_agent_budget` on this account —
third observation, still unexplained, still rendered nowhere.

## Re-confirmed live, 2026-08-10 — the tool is wrong, not empty

`get_agent_fund_allocation` on **Undertow**, holding five open positions at that
moment, answered `availableUsd: 0, committedUsd: 0, lifetimeAllocatedUsd: 0`.
`list_user_active_positions` seconds earlier reported **`marginedUsd: 17.45`**
for the same agent.

"Never returned a figure" is consistent with an idle account. This is not: two
reads of the same platform, at the same time, about the same agent, disagreeing
by $17.45. The tool whose stated job is *funds committed to in-flight wagers and
trade margin* reports zero committed while the platform's own positions read
reports the margin.

Same shape as `get_agent_performance` answering zeros on agents with real closed
losses — two nominally authoritative money tools, both answering zero where the
platform's own alternative answers correctly. Nothing should be built on either.

## Re-confirmed 2026-08-12 — both agents at once, v17.2.0

Fourth measurement, and the first that catches the disagreement on **two
agents in the same minute**. `list_user_active_positions` reported
`marginedUsd: 11.07` for Undertow (3 open positions) and `marginedUsd:
11.05` for Breakwater (3 open positions). `get_agent_fund_allocation`
called seconds later answered all-zero for both — `availableUsd: 0,
committedUsd: 0, lifetimeAllocatedUsd: 0, lifetimeRecalledUsd: 0`. The
wrongness survived the v11 → v17 platform upgrades untouched.

The linked change `performance-was-already-in-the-payload` shipped and
archived long ago; the `change:` link is cleared because what this item
still tracks — the allocation tool answering zero against live margin,
and `accountEquityUsd: 0` — was never that change's scope. What would
settle it: a BattleGrid-side fix or documentation of what
`get_agent_fund_allocation` actually measures.
