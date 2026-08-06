# Proposal: What It Holds, And What It Could Not Place

## Why

Two P1s from the second-account walk, and they are the same surface: **what
this agent has at stake right now, and what it tried to stake and could not.**

`THE .0`, live on 2026-08-06:

```
open:      HYPE LONG · $12.37 notional · 5× · $2.47 margined · opened 17:10
decisions: EXECUTED 27 · FAILED 28 · SKIPPED 11 · EXPIRED 5
```

Grid-Commander shows **neither**. `/trades` is closed trades. `/agents/[id]`
is deployments and stoppages. An agent can be holding real money and having
half its entries die at the exchange, and every surface reports normally.

## What Changes

### The open position

`list_user_active_positions` is the source — one account-wide read carrying
`agentId` per row, richer than the per-agent tool and cheaper than N calls.
Its numbers are the platform's: `markPrice`, `unrealizedPnlUsd`, `roePct`,
`marginedUsd`, `liquidationPrice`. **Nothing here is computed.**

`unrealizedPnlUsd` and `roePct` are nullable, because
`unpricedPositionCount` exists — the platform's own *unreadable is not empty*
distinction, arriving as a field. A position it could not price is not a
position worth nothing.

### The stop that moved

The position reports `effectiveStopLoss: 55.954`; the decision that opened it
recorded `55.67456526`. Trailing has walked it up. This surface shows the
**effective** one and labels it as current — and `/pipeline`'s existing stop is
relabelled as the stop *at the decision*, so two surfaces cannot show one word
meaning two things. The full drift join stays in
`the-stop-that-moved-is-not-the-stop-we-show`.

### What never became an order

No new read: `AgentFunnel` already carries `executed`, `failed`, `expired` and
`enterDecisions`, and the pipeline page already renders them — as statistics,
in a row, where 28 looks like a number rather than a problem.

The change is to state it as a finding where the agent is read: **28 of 60
entries never became an order.** And where the platform has ever explained why
for this account — `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` carries `minEquityUsd`
— the stoppage summary already shows it two sections up.

Marked as the dominant outcome when `failed >= executed`, which is a
comparison rather than a threshold nobody chose.

## What is deliberately not here

- **No derived fill rate.** The platform sends `fillRatePercent: 63` and the
  counts give 27 of 60; they are computed differently and this product does not
  know how. Both are shown, each labelled as whose it is.
- **No reason invented for a FAILED decision.** The row carries no failure
  text — only an `executedAt` with no `executedOrderId`. That absence is the
  whole evidence and it is reported as such.
- **No auto-refresh.** `refreshIntervalMs: 10000` says how fast this goes
  stale; the surface states when it was priced rather than pretending to be
  live.

## Capabilities

**Modified**: `agent-understanding` — two ADDED requirements.
