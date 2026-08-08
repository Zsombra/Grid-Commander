---
id: trading-telemetry-is-unread
title: The open side of an agent’s money is invisible — positions, orders and market context unused
type: feature
status: open
priority: p3
created: 2026-08-01
updated: 2026-08-08
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, reporting, expected-value]
---

# The open side of an agent’s money is invisible

## Discovery read 2026-08-08: two slices observed, one still unobservable

Raw keyed reads against the second account (31 settled outcomes on `THE .0`):

- **`get_open_orders` → `{orders: []}`** — empty again, with no position open
  at probe time. The order-row shape has still never been seen; the
  open-orders and `get_order_status` slice stays unmodelled. To observe it,
  probe while a position is open (its resting SL/TP legs should appear).
- **`get_trade_chart` → READY on 6/6 settled logs.** Shape observed whole:
  `result.status`, `result.chart{signalLogId, positionId, coinTicker,
  timeframe, source, windowStart/End (ISO + epoch-seconds), candles[]
  {openTime, timeSeconds, open, high, low, close, volume}, levels[]
  {role, label, price}, markers[] {role, timeSeconds, price},
  snapshotCapturedAt}`. 83 candles on the probed trade.
- **`get_position_audit_history` → 10 events on the probed position.**
  `positionId` is carried by the trade chart (outcome rows do NOT carry it —
  26 keys checked). Event base: `{leg, orderId, createdAt, heldMs|null,
  vsEntryPct|null, kind, price-as-decimal-string}`; reprices swap `price`
  for `{fromPrice, toPrice, triggerDeltaPct, improved, repriceSource
  BREAK_EVEN|TRAILING, replacementOrderId}`. Kinds seen: TP_PLACED,
  SL_PLACED, ENTRY_FILLED, SL_REPLACED ×5, SL_CANCELLED, TP_FILLED.
- Outcome rows: full 26-key shape recorded in the probe log (adds `closedBy`
  beside `closeReason`).

The chart + audit slice was taken by `a-closed-trade-has-no-story`
(2026-08-08): both tools consumed through `AgentsPort`,
`/agents/[id]/trades/[logId]` renders the frozen chart with the levels as
placed plus the reprice trail, and `read_trade_story` is on the MCP
surface. What remains on this item: open orders / order status (blocked on
observation — probe while a position is open), and the market-context
reads (`get_coin_candles`, `get_coin_metadata`, `get_macd_heatmap`,
`get_coin_performance_history`, `get_regime_snapshot`,
`get_regime_history`).

## Update 2026-08-06: the blocking reason is gone

Filed because the position and order tools answered empty on the first
account. The second account answers both. The observed shapes and the build
are in `an-open-position-is-invisible` (p1); what remains here is whatever
this item covers beyond open positions.

## Reconciled 2026-08-05: half of this shipped

`the-trading-record-is-readable` (archived 2026-08-03) built the **closed**
half. `list_trade_outcomes` is consumed by `McpAgentAdapter`, `readTradingRecord`
derives the summary from the trades themselves — because BattleGrid’s own
performance figures measure against a risk-budget baseline and read zero when
no budget is configured, which is how account 1's agents are set up — and it is on
the MCP surface as `read_trading_record`.

Checked by tool, not by memory. Of the fifteen named below, **one** is used:

| used | unused |
|---|---|
| `list_trade_outcomes` | the other fourteen |

So what is left is the **open** side and the market context around it, and the
item is narrowed to that rather than closed. The original text follows.

---

## What the agent actually did with the money is invisible (as filed)

The product shows the agent's thoughts (`get_agent_thought_log`), limits and
budget — but not its trades. The whole positions/orders/outcomes read surface
is unused (2026-08-01 tool audit, 30/110 used):

`get_agent_open_positions`, `get_open_orders`, `get_order_status`,
`list_trade_outcomes`, `get_trade_outcome_by_decision`,
`get_decision_order_attribution`, `get_position_audit_history`,
`get_trade_chart`, `list_session_agent_positions`, plus market context reads
(`get_coin_candles`, `get_coin_metadata`, `get_macd_heatmap`,
`get_coin_performance_history`, `get_regime_snapshot`, `get_regime_history`).

## Why it matters

This is the read side of the operator's reporting/expected-value vision:
EV = strategy × risk config × realized outcomes. It is also a prerequisite
for a useful assistant — "how is my agent doing" must have an answer.

## Known risk

`get_agent_performance` / `get_agent_fund_allocation` have never returned a
populated figure (`performance-and-allocation-are-unmodelled`). The outcomes
tools may answer where the aggregates do not — that is the first thing a
discovery read should establish.

## First step when taken

Narrowed by the reconcile above: outcomes are done, so the discovery read is
**open positions, open orders, and one trade chart** on the account's
most-played agent — record the shapes here before modelling any of them.

Note the sibling finding in `open-position-rows-are-unobserved`: on the public
side, `positions` has only ever been observed **empty**, across all 37 agents in
the field. If the private `get_agent_open_positions` is empty too, the rows stay
unmodelled and this item stays open — an unobserved shape is not a shape, and
inventing key names is behind three of the dead paths in `HANDOFF.md`.

## The outcomes slice shipped (2026-08-02)

`the-trading-record-is-readable` (archived): `/agents/[id]/trades` reads
`list_trade_outcomes` whole — every fee, both sides' slippage, leverage,
conviction, close reason, duration, and the ids linking back to the
decision and signal log — and derives the summary the platform will not
publish. **Third confirmation that `get_agent_performance` is dead**:
live 2026-08-02, agent "Apex" carries 3 closed trades netting −$9.64 after
$1.34 in fees, and the performance tool answers `realizedPnlUsd: 0` with
an empty curve. The product computes from outcomes and says so on screen.

What remains of this item: open orders (`get_open_orders` — venue-direct
and slow), `get_order_status`, `get_trade_chart` (frozen candles with the
entry/exit overlay), `get_position_audit_history`, and the market-context
reads. None is needed to answer "what did it do"; each is its own surface.
