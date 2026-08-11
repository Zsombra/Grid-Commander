---
id: open-position-conflict-churn-tripled
title: Undertow's OPEN_POSITION_CONFLICT churn tripled — ~90 blocked evaluations an hour
type: question
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: ""
capability: agent-understanding
github: "146"
blocked_by: []
tags: [battlegrid, gate-blocks, churn, live]
---

# The re-evaluates-what-it-holds churn tripled

## What

Measured 2026-08-11 while closing #98: Undertow carries **3,809 gate
blocks in three days of life**, the recent record running ~90/hour, all
`OPEN_POSITION_CONFLICT` at `gateStage: TOKEN`. Breakwater carries 346;
Vanguard 0. The same pattern was measured at ~31/hour on 2026-08-09
(then 278 total) — the volume has roughly tripled with the larger
position count.

## Why it matters (p3, a question not an alarm)

`gateStage: TOKEN` is before the model call, so this is **not a spend
line** — the accept-as-tuition ruling's ~1:1 figure is unaffected. What
it is: the agent asking about coins it already holds, thousands of times,
which is noise in every gate-block surface and a standing question about
whether the evaluation cadence or coin selection is worth damping. It may
also be entirely fine — a cheap no-op the platform performs by design.

## First step

The operator's read, not a build: does the churn bother anything? If the
gate-block surfaces feel drowned by it, the product-side option is a
fold-or-collapse of repeated same-reason blocks on the stoppages surface;
the account-side options are the agent's coin selection or cadence. If
nothing is bothered, close this as accepted-noise with that said.
