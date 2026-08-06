---
id: half-of-what-it-decides-never-reaches-the-exchange
title: 28 of 60 entry decisions FAILED with an execution timestamp and no order id, on a funded account
type: feature
status: open
priority: p1
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, execution, sizing, live, money]
---

# Nearly half of what this agent decides never becomes an order

Found 2026-08-06 by surveying the **second** account (`Fibonacci`), which has
one active agent, `THE .0`, and is genuinely funded and trading.

## The number

`get_signal_performance` and the decision list agree exactly:

| status | count |
|---|---|
| EXECUTED | 27 |
| **FAILED** | **28** |
| SKIPPED | 11 |
| EXPIRED | 5 |
| | **71** |

Of the 60 decisions that said ENTER, **28 failed** — `fillRatePct: 63`. The
agent reasons, commits, sizes, and slightly less than half the time nothing
arrives at the exchange.

## The signature

Every FAILED row carries an `executedAt` and **no `executedOrderId`**:

```
2026-08-06T13:41  SKHX      size=0.6%   order=-  executedAt=2026-08-06T13:41:59Z
2026-08-06T13:10  SKHX      size=0.6%   order=-  executedAt=2026-08-06T13:10:37Z
2026-07-29T23:05  ENA       size=0.68%  order=-  executedAt=2026-07-29T23:05:13Z
2026-07-29T13:56  LDO       size=0.5%   order=-  executedAt=2026-07-29T13:56:38Z
```

So the platform reached the point of placing and got nothing back. The sizes
are the suspicious part: 0.5–0.76% of the balance under
`sizingStrategy: VOLATILITY_AUTO` with presets 1/2.5/5%. On a $49 balance that
is a **notional of about $0.25–$0.38 before leverage** — far under any exchange
minimum.

This account has already been told so once, in the platform's own words:

```
EXCHANGE_MIN_NOTIONAL_UNREACHABLE
{"equityUsd": 240, "minEquityUsd": 333.333333, "smallPct": 1, "maxLeverage": 3}
```

That block fired when equity was **$240**. It is now $49.

## Why this is p1

This is the money surface. `an-agent-can-be-structurally-unable-to-trade` was
closed because the *verdict* is published — and it is, as a gate block, before
evaluation. **This is the other half and it is not covered**: these decisions
pass every gate, run an LLM call each, reach execution, and fail there. The
gate-block summary shipped in `what-keeps-stopping-this-agent` will not show
them, because they were never blocked.

Each failure costs a model call and produces nothing. 28 of them.

## What the product should say, and where

`/agents/[id]/trades` shows closed trades. `/agents/[id]/pipeline` shows
decisions with their status. Neither says **"28 of your 60 entries never became
an order"**, which is the one sentence that matters here — nor pairs it with the
sizes and the exchange minimum the platform has already quoted for this account.

The fill rate is already computed and read: `fillRatePct: 63` is on
`AgentFunnel` and rendered on the pipeline page. What is missing is treating a
**low fill rate as a finding** rather than a statistic, and joining it to the
`EXCHANGE_MIN_NOTIONAL_UNREACHABLE` detail that explains it.

## First step when taken

Group FAILED decisions and state the count against the total, on the agent
page beside the stoppage summary. Where the account has ever received an
`EXCHANGE_MIN_NOTIONAL_UNREACHABLE` block, show its `minEquityUsd` next to the
current equity — the platform's own figure, not a derivation. Do **not** invent
a reason for a FAILED row: the row carries no failure text, and the absence of
`executedOrderId` is the only evidence there is.
