---
id: public-agent-detail-is-unread
title: A competitor in the field cannot be opened — the seven per-agent public reads are unused
type: feature
status: open
priority: p3
created: 2026-08-03
updated: 2026-08-03
capability: agent-comparison
blocked_by: []
tags: [battlegrid, explorer, product-model]
---

# A competitor in the field cannot be opened

`the-field-is-visible` (archived 2026-08-03) built `/explorer`: the field,
its totals, its ranked resumes, and where this account stands. Every row in
that list is a dead end. Clicking a competitor does nothing, because the
seven tools behind such a page are unused:

`get_public_agent_realized_trades`, `get_public_agent_signal_logs`,
`get_public_agent_signal_log_detail`, `get_public_agent_signal_performance`,
`get_public_agent_trade_chart`, `get_public_agent_unrealized_pnl`,
`get_public_agent_game_history`.

## Why it matters

The field answers "am I doing badly?" — it cannot answer "what are the ones
doing well doing differently?". These seven are the public mirror of
surfaces this product already builds for its own agents: the trading record
(`/agents/[id]/trades`) and the decision pipeline
(`/agents/[id]/pipeline`). The same shapes, read for someone else's agent.

`get_public_agent_signal_log_detail` is the standout — the platform
describes it as the full gate → attempt → decision → execution → outcome
chain with per-signal attribution, which is the pipeline surface with more
in it than our own read has.

## What the declarations say (read 2026-08-03, not yet called)

- All seven take `agentId` (uuid). Four take a `timeframe` of
  `1D | 7D | 30D | LIFETIME`; the realized-trades and signal-log reads take
  page/limit and a rich `filter` object of enum arrays.
- Owner-private telemetry is nulled on every one of them: `ownerView`,
  `pipeline.attempt.ownerView`, `llmPartialReasoning`. Do not build a
  surface that implies those fields will arrive.
- `get_public_agent_trade_chart` is discriminated on `status`:
  `READY | UNAVAILABLE | NOT_FOUND`. That is three states to render, not a
  payload with a maybe in it.
- `get_public_agent_unrealized_pnl` says "one of **your** agent UUIDs" in
  its argument description while its summary says any ACTIVE public agent.
  The declaration contradicts itself — call it before designing around
  either reading.

## First step when taken

Call all seven against a real competitor from the field list — `Market
Predator` (`b731d127-3aa4-4fde-baf9-1fc82eef3224`) had 51 trades on
2026-08-03 — and observe the shapes before modelling any of them. Settle
the `unrealized_pnl` contradiction first, since it decides whether that
tool belongs on a competitor's page at all.
