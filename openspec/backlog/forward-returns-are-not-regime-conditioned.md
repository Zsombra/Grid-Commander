---
id: forward-returns-are-not-regime-conditioned
title: The forward returns are not conditioned on regime — context sits beside the figures, not in them
type: question
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: signal-recording
github: "297"
blocked_by: []
tags: [battlegrid, reporting, expected-value, measurement]
---

# The forward returns are not conditioned on regime

## What

`the-regime-the-record-was-taken-in` renders the platform's regime
classification **beside** the forward-returns analysis — per recorded
series, over the record's window. It deliberately does not **join** it: no
per-pair regime label, no regime-segmented return tables. This item is the
record of that cut, and the question of whether the join is ever worth
building.

## Why it matters (p3)

Regime is the most plausible confounder of every per-signal forward-return
figure: a claim earned entirely in `bear_ranging` says nothing about
trending tape. #282's depth gate already blocks claims on thin cells; a
regime join would let claims carry their regime the way they carry their n.
But it multiplies cells: ~1,100 pairs across 20 series split by even three
regime labels would push most cells under any honest floor. The context
surface answers the cheap version ("the whole window sat in one regime")
without the join.

## Evidence

- `src/application/use-cases/read-forward-returns.query.ts` — pairs carry
  no regime axis; `aggregateForward` groups by signal/bias/conflict only.
- Live probe 2026-08-15: `get_regime_history` answers per-bar
  `{timestamp, regime, conviction}` at the recorder's own 1h timeframe, so
  the join key (hour) exists on both sides.
- JOURNAL 2026-08-15 (floor): funding-fade family blocked on n = 2/0 —
  cell-thinning is the live constraint, not a hypothetical.

## First step when taken

Decide the floor first (the effective-sample caveat from the (floor) entry:
cross-sectionally clustered pairs overstate independence), then join
per-pair at the earlier capture's hour against the regime bar covering it,
and only render cells the floor admits. Do not build the join before the
record is deep enough for at least one admitted cell per axis.
