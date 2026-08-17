# Proposal: The Trading Record Is Readable

## Why

Phase 2, change 1 of the assistant roadmap. The product shows an agent's
*thoughts* (thought log), its *limits* (budget gauges), and whether it is
*deployed* — but never what it actually did with the money. That is the
last large gap before reporting and expected value mean anything, and it is
the question an operator asks first.

Discovery (live, 2026-08-02) settled how to answer it:

- **`list_trade_outcomes(agentId, page?, limit?)` is rich and real** —
  26 fields per closed trade: entry and exit fill price and quantity, both
  fees, realized and net P&L, slippage on each side, effective leverage,
  the conviction the agent held, who closed it and why (`closeReason`,
  `closedBy`), duration, and the ids linking back to the decision and
  signal log. Envelope `{outcomes, total}`.
- **`get_agent_performance` is still dead** — `realizedPnlUsd: 0`,
  `drawdownUsd: 0`, `pnlCurveUsd: []` on an agent with real closed trades
  carrying real losses. Third observation across three sessions
  (`performance-and-allocation-are-unmodelled`).

So the record is **derived from the trades themselves**, and the surface
says so — a total this product computed from the trades it can see is a
different claim from a total the platform published.

## What Changes

- **`TradingRecordPort` reads**: `listTradeOutcomes(agentId, page)` mapped
  whole — a dropped fee or slippage figure is a misstated loss.
- **`ReadTradingRecordQuery`**: the page of trades plus a **derived**
  summary — closed count, wins/losses, net P&L, fees paid, average
  duration, and the close-reason spread — each labelled as computed from
  the trades on this page, never presented as a platform figure.
- **`/agents/[id]/trades`** — the record, newest first, linked from the
  agent page: per trade the coin, direction, net P&L, fees, slippage,
  leverage, conviction, why it closed, and how long it was open. Paging
  when `total` exceeds the page.
- The dead `get_agent_performance` is **not** called; the item records the
  third observation instead of the product printing zeros as fact.

## Out of Scope

- Expected value as a modelled number — EV needs the strategy-to-outcome
  join, and this change establishes the outcome half. Filed as the follow-on.
- Open orders / order status (`get_open_orders` queries the venue directly
  and is slow), trade charts, and position audit history — each is a
  distinct surface, none needed to answer "what did it do".

## Capabilities

**Modified**: `agent-understanding` — one ADDED requirement.
