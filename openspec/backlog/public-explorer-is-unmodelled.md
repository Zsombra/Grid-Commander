---
id: public-explorer-is-unmodelled
title: The public agent explorer — seven tools of competitive intelligence — is untouched
type: feature
status: done
priority: p3
created: 2026-08-01
updated: 2026-08-03
change: "the-field-is-visible"
capability: agent-comparison
blocked_by: []
tags: [battlegrid, explorer, product-model]
---

# The public agent explorer is untouched

Seven read tools cover other players' agents (2026-08-01 audit — the largest
fully-untouched module after Market Grid):

`get_public_agent_game_history`, `get_public_agent_realized_trades`,
`get_public_agent_signal_logs`, `get_public_agent_signal_log_detail`,
`get_public_agent_signal_performance`, `get_public_agent_trade_chart`,
`get_public_agent_unrealized_pnl` — plus `get_agent_explorer` and
`get_leaderboard` as the entry points.

## Why P3

Pure reads, zero risk, but least aligned with a personal workbench — it is
scouting, not operating. Becomes interesting alongside the reporting/EV work
(`trading-telemetry-is-unread`): compare your agents' records against the
field's.

## First step when taken

Discovery read of `get_agent_explorer` and `get_leaderboard` arg shapes
(both refused guessed args on 2026-08-01 — read the declaration first), then
a read-only explorer surface following the arena pattern.

## Partly done (2026-08-03)

`the-field-is-visible` (archived) built the two entry points as `/explorer`:
`get_agent_explorer` and `get_leaderboard`. The field's own totals, the
ranked agent resumes, the per-vendor breakdown, and — the part that makes
it a workbench feature — where this account stands, from both tools.

Live 2026-08-03: 37 agents, 773 closed trades, **31% win rate, −$162.07
net** — the field as a whole loses money. One of nine model vendors is in
profit. This account is rank 7 by profit (97th percentile), rank 1 by
volume and by score; its own agents place 14th and 18th.

**Three platform behaviours the surface is built around**, all live-established:

1. `entries` can be shorter than `stats.totalAgents`, and `limit` does not
   widen it — 5 of 37 at every limit from 3 to 100, four runs running, then
   37 of 37 to the same request an hour later. **Intermittent**, so the two
   counts are carried separately and never reconciled.
2. A win rate can be null (a vendor whose agents never traded, a day nobody
   traded). Rendered as 0% that reads as "everyone lost" instead of "nobody
   played".
3. Sorting by win rate promotes the smallest sample — first place was 100%
   on one trade, ahead of an agent at 45% over 51 trades and $50 of profit.
   Every rate is printed beside its trade count.

**Still open**: the seven per-agent public reads —
`get_public_agent_realized_trades`, `_signal_logs`, `_signal_log_detail`,
`_signal_performance`, `_trade_chart`, `_unrealized_pnl`, `_game_history`.
They are one public agent's detail page, reachable from the list this
change built. Filed as `public-agent-detail-is-unread`.
