# Proposal: Name What An Agent May Spend

## Why

`app/(app)/agents/new/page.tsx` passed **`tradingConfig: null`**.

That was not a shortcut around an optional field. BattleGrid's own
`get_trading_config_catalog` declares defaults for leverage, stop loss, trade
count, slippage, conviction and a dozen other knobs — and declares **none** for
the six that answer *how much can this thing lose*:

```
tradingMode  minAllocationUsd  balanceThresholdUsd
maxConcurrentExposureUsd  maxCumulativeDrawdownUsd  maxDailyLossUsd
```

So omitting them did not inherit something sensible. It left the money
questions unanswered, and the product could neither set nor state what the
agent it had just created was permitted to spend.

The neighbourhood this button creates things in, read from the live account:
both existing agents run `FULL_EXECUTION` at **5× leverage**, and one carries
`maxDailyLossUsd: 0`.

Every other surface in this product refuses to state what it does not know —
the roster will not say "no agents" when the read failed, a declared scope is
never described as an enforced one, a threshold the platform did not send
renders as "not set". Agent creation was the exception, and it was the exception
on the one subject where being wrong costs money.

## What Changes

- **The catalog carries what the platform is willing to default.**
  `Catalog.defaults`, mapped from `tradingDefaults.defaults`, with the
  `defaultMaxLeverage` → `maxLeverage` rename done once at the boundary.

- **`undefaultableFields` derives the questions rather than listing them.** If
  BattleGrid starts defaulting a field it stops being asked; if it stops, it
  starts. Nobody has to remember to edit a list.

- **`buildTradingConfig` produces a complete config or refuses.** All twenty
  fields, because `tradingConfig` is all-or-nothing — BattleGrid rejects a
  partial one and resets whatever a partial send omits (findings-agents F-6).
  There is no "just set the loss cap" call.

- **`MoneyLimits` asks the six.** `OFF` is offered first and selected by
  default; no money field is pre-filled.

- **The command assembles it, not the route.** `CreateAgentRequest` carries the
  operator's raw answers; the command already reads the catalog, and `app/` may
  not import the domain.

## Two decisions worth stating

**`OFF` leads.** It is one of three `tradingMode` values and the only one that
makes the other five harmless — an agent that does not trade cannot exceed a
loss cap. Starting there lets someone read what an agent decides before any of
it costs anything. That is not a UI preference; it is the difference between
creating something that reasons and creating something that spends.

**No money field is pre-filled.** A suggested loss cap would be this product
choosing a number on the operator's behalf, which is exactly what the absence of
a platform default says nobody should do. Empty is unanswered and refuses;
a typed `0` is a real answer and is kept.

## Capabilities

- `agent-authoring` — ADDED: an agent's spending limits are stated before it
  exists.

## Out of Scope

- **Editing an existing agent's limits.** Blocked on two filed findings that
  both bite the edit path specifically:
  `trading-config-read-shape-is-not-write-shape` (three keys come back on read
  that create rejects) and `a-preset-does-not-constrain-its-config` (a preset is
  a label beside fourteen values, not a shorthand the server expands).
- **The fourteen position-management values.** Supplied from catalog defaults
  under the `CUSTOM` label. Exposing them is the edit-form problem above.
- **Creating a real agent to prove it end to end.** That would spawn something
  on the operator's live trading account; the slot is theirs to spend, not mine.
