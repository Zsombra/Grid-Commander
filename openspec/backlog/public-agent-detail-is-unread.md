---
id: public-agent-detail-is-unread
title: A competitor in the field cannot be opened — the seven per-agent public reads are unused
type: feature
status: done
priority: p3
created: 2026-08-03
updated: 2026-08-03
change: "a-competitor-can-be-opened"
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

## Partly done (2026-08-03)

`a-competitor-can-be-opened` (archived) built `/explorer/[agentId]` from
four of the seven: `signal_performance`, `realized_trades`, `signal_logs`
and `unrealized_pnl`. Every row in `/explorer` now opens.

**The contradiction is settled by calling it.** `get_public_agent_unrealized_pnl`
answers a snapshot for a rival exactly as it does for one of ours, so its
summary ("any ACTIVE agent") is right and its `agentId` description ("one
of **your** intelligence agent UUIDs") is stale. Modelled as a public read.

Live 2026-08-03 on `Market Predator` (rank 1): 245 evaluations → 102
decisions → 73 entered → 51 executed, 9 failed, 13 expired; fill rate 76%,
average score 63%, 23W/28L, +$50.06.

**Two traps found and handled**: `skipCount` (SKIP decisions, 29) and
`skippedCount` (SKIPPED terminal status, 0) are different counters with
similar names and are never summed; and `isWin` is the platform's verdict,
carried rather than re-derived from `netPnl` — a break-even trade is a loss
if the platform says so.

**Still open**: `get_public_agent_signal_log_detail` — the per-signal
scorecard, and the richest payload on this surface: every evaluated signal
with its module, trigger state, score, bias, the raw indicator values, and
a written sentence ("RSI(14) at 51.6 — not oversold (threshold 30)"). Plus
`get_public_agent_trade_chart` (verified live: `READY` only where a trade
filled, `UNAVAILABLE` otherwise) and `get_public_agent_game_history`
(Market Grid picks, which belong with the arena). Filed as
`a-competitors-scorecard-is-unread`.
