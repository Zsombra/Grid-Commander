---
id: a-competitors-scorecard-is-unread
title: The per-signal scorecard — the richest payload on the surface — is still unread
type: feature
status: done
priority: p3
created: 2026-08-03
updated: 2026-08-03
change: "the-scorecard-is-legible"
capability: agent-comparison
blocked_by: []
tags: [battlegrid, explorer, scorecard]
---

# The per-signal scorecard is still unread

`a-competitor-can-be-opened` (archived 2026-08-03) built
`/explorer/[agentId]` from four of the seven public reads. Three remain,
and one of them is the best payload on the entire BattleGrid surface.

## `get_public_agent_signal_log_detail`

Read live 2026-08-03 (not modelled — observed). `log` carries everything
the list row does, plus `scorecard`, `attributions`, `pipeline`,
`linkedEntryDecision`, `challenge`, and the agent's name, avatar and model.

`scorecard.allEvaluatedSignals` is one entry **per signal the agent
consulted** — not only the ones that fired:

```json
{
  "id": "rsi_oversold", "module": "RSI", "triggered": false,
  "score": 0, "scorePercent": 0, "bias": "BULLISH", "direction": "LONG",
  "details": "RSI(14) at 51.6 — not oversold (threshold 30)",
  "indicatorValues": { "rsi14": 51.61045951 },
  "isPrimary": false, "required": false, "effectiveAllocation": 1
}
```

A written sentence with the reading *and* the threshold, plus the raw
indicator values behind it. This is richer than what our own pipeline
surface shows for our own agents — `signalChecklist` gives a verdict and an
interpretation per *triggered* signal; this gives every signal evaluated,
with numbers.

Note `scorecard.timeframesUsed` and the untriggered rows: "what it looked
at and dismissed" is as informative as what it acted on, and no surface in
this product shows it yet.

## `get_public_agent_trade_chart`

Discriminated on `status`, verified live across six logs: `READY` only
where the log reached a filled trade (terminal `PASS`), `UNAVAILABLE`
otherwise (`EXPIRED`, `SKIPPED`). `NOT_FOUND` declared but not yet
observed. The `chart` key is present only on `READY` — three states to
render, not a payload with a maybe in it.

## `get_public_agent_game_history`

Market Grid picks with cells, placement, accuracy, payouts and the agent's
own `reasoning`. Belongs with `/arena` rather than the trading record, and
probably waits for `market-grid-is-an-unmodelled-module`.

## Why it matters

`/explorer` says the field loses money. `/explorer/[agentId]` says how one
competitor operates. This says **what it actually read on a given
candidate, indicator by indicator** — the level at which "what are they
doing differently" stops being a guess.

## First step when taken

The evaluation list on `/explorer/[agentId]` already carries each log's id.
Add a detail route arriving from it, read `signal_log_detail`, and render
`allEvaluatedSignals` grouped by module — with the untriggered ones kept,
since dropping them would answer a different question. Owner-private
telemetry (`pipeline.attempt.ownerView`, `llmPartialReasoning`) is nulled
on this public read and must not render as an agent that said nothing.

## Partly done (2026-08-03)

`the-scorecard-is-legible` (archived) built
`/explorer/[agentId]/evaluations/[logId]` from
`get_public_agent_signal_log_detail`: every consulted signal grouped by
module with the untriggered ones kept, the attribution breakdown, and the
chain from gate through attempt, decision, execution and outcome.

Live 2026-08-03 across ten of `Market Predator`'s evaluations: **72 signals
consulted every time**, 8 to 21 of them firing. The counter-example worth
keeping: `CRV` fired 21 signals and **SKIPPED**, while `APT` fired 8 and
**ENTERED** — signal count is not the decision.

**A platform behaviour the surface is built around**: a listed evaluation
can publish no detail. Four of twenty answered `{log: null}` on 2026-08-03,
every one of them a `FAILED` evaluation, with all other statuses resolving.
A correlation over twenty rows is a pattern rather than a contract, so
every row is still linked and the detail page renders the null as its own
state — distinct from unreadable.

**Still open**: `scorecard.comparison` (peer coins with correlations),
`tradeAssessment.candidateLevels` and `attempt.setupOptions` (the candidate
stop/target grid, several methods per evaluation), plus
`get_public_agent_trade_chart` and `get_public_agent_game_history`.

**And one thing this surfaced**: our own agents' pipeline shows *less* than
this public read does. Filed as
`our-own-agents-show-less-than-strangers` (P2).
