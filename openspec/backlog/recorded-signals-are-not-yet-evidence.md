---
id: recorded-signals-are-not-yet-evidence
title: Grade strategy claims against the accumulating signal record
type: feature
status: open
priority: p2
created: 2026-08-07
updated: 2026-08-11
change: ""
capability: signal-recording
github: "94"
blocked_by: []
tags: [signals, evidence, analysis]
---

# Grade strategy claims against the accumulating signal record

## What

The recorder (`nothing-records-what-the-signals-said`) captures what every
signal said, with the price at each capture. What it deliberately does not do
is *analyze*: compute forward returns between captures per signal state
("when `rsi_oversold` triggered, what did price do by the next capture?"),
per bias, per conflict flag; compare signals against each other; or attach
any of it to the claims in the operator's strategy analysis so their evidence
tier can move off "no forward data".

## Why it matters

The record is the prerequisite, not the product. The point of recording is
that claims about signal behavior become gradeable — until an analysis layer
reads the record, every strategy claim stays at the tier it was at, just with
better raw material waiting.

## Evidence

- Every capture row carries `currentPrice`, so consecutive captures of a coin
  yield forward returns with no further platform reads.
- Raw per-signal scores and allocations are recorded, and
  `simulate_aggregate_score` recomputes any weighting over them — so weighted
  questions ("would agent X's blend have cleared its gate?") are answerable
  retroactively.
- The MCP read tools already hand a model the history; a first version of
  this can be a model-side workflow before it is a product surface.

## Notes

From the production gate (PG-002, MINOR): `SignalRecordStore.rawAnswer` has
no product consumer yet — the db suite keeps its contract exercised, and the
first real reader belongs to this item's analysis layer (re-mapping recorded
raw answers is how a future mapper improvement becomes retroactive).

Do not start until the record holds enough captures to say anything —
analysis over three data points upgrades no tier. Statistical honesty is the
hard part: every figure needs its sample size beside it, the same rule the
explorer already follows for win rates (small samples promoted by sorting).

**Gate update, 2026-08-11 (same day, evening): the record is accumulating.**
The operator stood the recorder up on their Windows machine — hourly
Scheduled Task, unattended run proven (`LastTaskResult : 0`), 20
coin/timeframe pairs at 84 signals per capture (#145, closed). The record
starts 2026-08-11; the 2026-08-07 → 2026-08-11 gap is permanent. This
item now waits only for depth: at hourly captures the record needs days
before per-signal forward returns mean anything, and every figure still
needs its sample size beside it.
