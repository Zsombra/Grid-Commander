---
id: open-position-conflict-churn-tripled
title: Undertow's OPEN_POSITION_CONFLICT churn tripled — ~90 blocked evaluations an hour
type: question
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-12
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

## Re-measured 2026-08-12

Still growing, still the same signature. Undertow's total is **5,014**
(from 3,809 a day earlier); the most recent 100 blocks span 03:51–04:41
UTC, i.e. **~120/hour**, all but one `OPEN_POSITION_CONFLICT` at
`gateStage: TOKEN`, cycling FARTCOIN and TRUMP — exactly the coins it
holds positions on — roughly once a minute each. The trajectory over four
days is ~31/h → ~90/h → ~120/h, scaling with open-position count, which
strengthens the cheap-no-op-by-design reading: the sweep re-asks every
deployed coin each minute and the ones it holds answer "conflict".

One block in the sample was **not** the pattern and is worth its own
sentence: `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` on AIXBT with quantified
`reasonDetail` — `equityUsd: 30.14` below `minEquityUsd: 33.33` (the
floor implied by `smallPct: 10` at `maxLeverage: 3`). The account's
equity has drifted under what the smallest position size needs, so
entries on new coins are now silently impossible for Undertow until
equity recovers or sizing changes. That is not churn; that is the agent
being benched by arithmetic.

## First step

The operator's read, not a build: does the churn bother anything? If the
gate-block surfaces feel drowned by it, the product-side option is a
fold-or-collapse of repeated same-reason blocks on the stoppages surface;
the account-side options are the agent's coin selection or cadence. If
nothing is bothered, close this as accepted-noise with that said.
