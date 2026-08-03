---
id: entry-decisions-have-a-read-side
title: The platform's own human-in-the-loop — pending approvals and gate blocks — is unsurfaced
type: feature
status: done
priority: p3
created: 2026-08-01
updated: 2026-08-03
change: "why-it-did-not-trade"
capability: agent-understanding
blocked_by: []
tags: [battlegrid, approvals, human-in-the-loop]
---

# The platform's own human-in-the-loop is unsurfaced

BattleGrid has an approval workflow: agents propose entries, humans accept or
cancel. The write half (`accept_entry_decision`, `cancel_entry_decision`) is
`mcp:wager` and stays behind the full ceremony. But the read half is unused
and safe today:

`list_pending_approvals`, `list_entry_decisions`, `get_entry_decision`,
`list_gate_blocks`, `get_signal_log` / `list_signal_logs`,
`get_signal_performance`, `simulate_aggregate_score`.

## Why it matters

This is the most product-aligned unused group in the 2026-08-01 audit: the
whole application is built around "the human decides, informed". A surface
showing "your agent wants to enter BTC long — signal score, gate status,
what it read" is that promise applied to the platform's own approval loop.
An assistant should surface these, never answer them.

## First step when taken

Discovery read of the declared shapes (the tool audit did not observe these
live), then a read-only approvals surface. The accept/cancel writes are a
separate, later change with consequence wording — they commit funds.

## Done (2026-08-03)

`why-it-did-not-trade` (archived): `/agents/[id]/pipeline` reads the three
stages a candidate can die at — `list_gate_blocks` (with the platform's
reason code AND its quantified detail: `INSUFFICIENT_EQUITY` with
`{equityUsd: 2.18, thresholdUsd: 10}`), `list_signal_logs` (aggregate
score against the threshold *in force at the time*, dominant bias,
conflicts, terminal status), and `list_entry_decisions` (the decision plus
the agent's own reasoning paragraph, whole). Each stage is independently
empty/unreadable so one failure hides nothing.

Live 2026-08-03: agent "Flow State" evaluated ENA at 0.397 against a 0.55
threshold → SKIPPED, explaining "extreme overbought conditions across
multiple indicators (RSI 76.2, Stochastic…)".

**Still open, deliberately**: `accept_entry_decision` / `cancel_entry_decision`
(both `mcp:wager`, one destructive — the full ceremony, their own change)
and `list_pending_approvals`, which answers `{approvals: []}` on this
account so its row shape has never been observed. Filed rather than
modelled from the declaration — see `approvals-have-no-write-side`.
