---
id: trading-telemetry-is-unread
title: What the agent actually did with the money is invisible — ~17 telemetry reads unused
type: feature
status: open
priority: p3
created: 2026-08-01
updated: 2026-08-01
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, reporting, expected-value]
---

# What the agent actually did with the money is invisible

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

Read-only observation with the live key: outcomes + open positions + one
trade chart on the account's most-played agent; record shapes in this item;
then an `agent-trading-record` surface the same way the arena was built.
