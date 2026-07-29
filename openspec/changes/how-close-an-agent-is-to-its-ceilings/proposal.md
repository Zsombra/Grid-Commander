# How close an agent is to its ceilings

## Why

The product can say what an agent decided. It cannot say whether the agent is
about to stop being allowed to.

`get_agent_budget` answers that, and it became observable one change ago. Read
live from the active agent:

```
              configured   fill    remaining   ceiling
dailyTrades      true       21        13          34
exposure         true        0       250         250
drawdown        false        0         0           0
dailyLoss       false     0.07         0           0
```

**There is a trap in that table and it points the wrong way.** An unconfigured
gauge reports `remaining: 0`. Rendered as a number, "0 remaining on daily loss"
reads as *about to be halted*. It means the opposite: **no cap exists at all**,
and the agent may lose without limit. The two gauges it happens to on this
account are the two that govern loss.

`fill` is also not a fraction. It is the amount consumed in the gauge's own
unit — 21 trades of 34, $0 of $250 exposure — and 21 + 13 = 34. A surface that
treated `fill` as a percentage would draw a 21%-full bar as 2100%.

Both facts came from reading the live response. Neither is in the declared
schema, which types `fill` as a number and says nothing about what it counts.

## What Changes

- A `Budget` domain type with a `Gauge` per limit, where **unconfigured is its
  own state** rather than a zero. `remaining` is unreadable when no ceiling
  exists, and the domain says so instead of returning a number.
- `stoppableLimits(budget)` — the limits that would halt the agent, and the ones
  that would not because nobody set them. An agent with no drawdown and no
  daily-loss cap is not a safe agent; it is an unbounded one, and the product
  should say which.
- The platform's own warnings are carried rather than recomputed:
  `budgetOverSubscribed`, `stopBelowSingleTradeLoss`, `stopEffectivelyUnbounded`,
  and `haltedAt` / `haltReason`.
- `AgentsPort.readBudget` over `get_agent_budget`, a query, and a surface on the
  agent page.

## Capabilities

- `agent-understanding` — two requirements added.

## Out of Scope

- **Setting a limit from this surface.** It reads. Changing a ceiling is
  `tradingConfig`, which the edit path already owns and which is all-or-nothing.
  A "set a drawdown cap" button here would be a second write path to the same
  object.
- **`get_agent_performance` and `get_agent_fund_allocation`.** Both observed and
  recorded; both are a different question — what the agent has *done* rather
  than what it is still *allowed* to do.
- **Explaining why a ceiling is what it is.** The budget reports
  `maxDailyTrades: 34` where the agent's `tradingConfig` says something else.
  Whether the platform derives it from rank, equity or elsewhere is unestablished
  and will not be guessed at. → backlog.
