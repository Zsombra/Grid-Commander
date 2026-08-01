---
id: public-explorer-is-unmodelled
title: The public agent explorer — seven tools of competitive intelligence — is untouched
type: feature
status: open
priority: p3
created: 2026-08-01
updated: 2026-08-01
change: ""
capability: ""
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
