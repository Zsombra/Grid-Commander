# Proposal: The Protection That Actually Rests

## Why

`/agents/[id]` shows an open position's `effectiveStopLoss` — where position
management says the stop is. Nothing shows whether a stop **actually rests at
the venue**. Those are different claims: the first is software's intention, the
second is an order the exchange will honour if BattleGrid goes quiet. A
position whose stop exists only as software is protected only while the
platform is up, and the platform spent this evening flapping.

The read exists and was blocked on observation since 2026-08-01. It unblocked
tonight (#116): `get_open_orders` answered six rows — 13 uniform keys,
`reduceOnly: true` on every one, decimal-string prices, epoch-ms timestamps,
and **no positionId or agentId on the row**. Attribution goes through the
position: the leg's symbol is the position's coin, and its side is the
position's exit direction.

A second observation shapes the copy: the order seen `OPEN` at 19:20Z was
`CANCELLED` by 19:45Z — position management had replaced it. Resting rows
churn in minutes, so the section is a snapshot and says so, the same honesty
the exposure panel's `priced N minutes ago` already carries.

## What Changes

- `PositionsPort` gains the account-wide resting-orders read; the adapter maps
  the observed shape, dropping rows whose `orderId` or `symbol` cannot be read
  rather than inventing one.
- `ReadExposureQuery` reads it as a fourth independent read and joins it per
  position by symbol over `reduceOnly` rows — the join lives in the query, not
  the component, for the stated house reason.
- Each open position renders its resting legs — type, trigger, size, order id
  — or the naked statement: **no protective order rests at the venue for this
  position**. An unreadable orders read costs exactly this section and says
  why; the positions beside it still render.

## What is deliberately not here

- **`get_order_status` stays unmodelled.** Observed tonight (9 keys, answers
  for dead orders), recorded on #116 — but no surface polls per-order yet, and
  a model without a consumer is how tolerated shapes accumulate.
- **No entry orders.** All six observed rows are `reduceOnly` exits; if a
  non-reduceOnly row ever appears it renders under the same section by its
  stated type, but nothing is built speculatively for it.
- **No reconciliation with `effectiveStopLoss`.** The venue's trigger and the
  platform's effective stop are two systems' words; setting them against each
  other numerically invents an agreement scale nobody published. Both render,
  labelled as whose they are.
- **The market-context reads stay on #116** — the item narrows again rather
  than closes.

## Capabilities

**Modified**: `agent-understanding` — one ADDED requirement.
