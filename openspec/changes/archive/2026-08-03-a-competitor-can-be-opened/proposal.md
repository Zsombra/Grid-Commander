# Proposal: A Competitor Can Be Opened

## Why

`the-field-is-visible` shipped `/explorer` hours ago and every row in it is
a dead end. The field answers *"am I doing badly?"* — 37 agents, 31% win
rate, −$162 net, this account 7th. It cannot answer the question that
follows immediately: **what are the ones doing well doing differently?**

Four public reads answer it, all called live 2026-08-03 against
`Market Predator` (rank 1, 51 trades, +$50.06):

**`get_public_agent_signal_performance`** is a funnel, and it is the story:

```
245 evaluations → 102 decisions → 73 ENTER / 29 SKIP
                                     ↓
                    51 executed · 9 failed · 13 expired
              fill rate 76% · avg score 63% · avg conviction 49%
              avg R:R 2.26 · 45.1% win · +$50.06 · avg hold 9.4h
```

143 of 245 evaluations produced no decision at all. That ratio — how much
an agent looks at versus how much it acts on — is exactly the kind of
thing an operator cannot see about their own agents today and now can see
about everyone else's.

**`get_public_agent_realized_trades`** gives each closed trade whole:
entry and exit fills, net P&L, a win flag, price move and return on
equity, leverage, the conviction it opened on, close reason, duration, and
the `signalLogId` that links back to the reasoning.

**`get_public_agent_signal_logs`** gives what it evaluated: aggregate score
against the threshold in force, dominant bias, conflicts, gate status,
terminal status, and the signal source.

**`get_public_agent_unrealized_pnl`** gives what it is holding right now.

## The contradiction, settled by calling it

`get_public_agent_unrealized_pnl` declares itself two ways: the summary
says "for any ACTIVE agent … the same data an anonymous visitor sees",
while its `agentId` description says "**one of your** intelligence agent
UUIDs". `public-agent-detail-is-unread` flagged this rather than guessing.

Called both ways on 2026-08-03, it answers a snapshot for a rival exactly
as it does for one of ours. The summary is right and the argument
description is stale. Modelled as a public read.

## What the surface must not imply

- **Owner-private telemetry is nulled on every one of these**
  (`ownerView`, `llmPartialReasoning`). The page must not render an empty
  reasoning slot that looks like an agent which did not explain itself —
  what is missing is withheld, not absent.
- **Two different "skip" counters exist.** `skipCount` (decisions that
  were SKIP: 29) and `skippedCount` (terminal status SKIPPED: 0) are not
  the same number and must not be summed or used interchangeably.
- **Precisions differ between tools.** The field list rounds win rate to
  45; this read gives 45.1. Neither is wrong; showing them as the same
  figure would be.

## What Changes

- **`ExplorerPort` grows four reads** for one public agent, each with its
  own three-state result so a competitor whose trades fail to load still
  shows their funnel.
- **`ReadCompetitorQuery`** — the four in parallel, independently
  unreadable.
- **`/explorer/[agentId]`**: the funnel first, then what it holds now, then
  its closed trades, then what it evaluated. Reachable from every row in
  `/explorer`, which closes the dead end.

## Capabilities

- `agent-comparison` (MODIFIED)

## Out of Scope

- `get_public_agent_signal_log_detail` — the per-signal scorecard, and the
  richest payload on the whole surface: every evaluated signal with its
  module, trigger state, score, bias, the raw indicator values, and a
  written `details` sentence ("RSI(14) at 51.6 — not oversold (threshold
  30)"). It deserves its own change and its own page, arriving from the
  evaluation list this one builds.
- `get_public_agent_trade_chart` — belongs with that detail page; verified
  live to answer `READY` only where a trade actually filled and
  `UNAVAILABLE` otherwise.
- `get_public_agent_game_history` — Market Grid picks, which belong with
  the arena rather than the trading record.
