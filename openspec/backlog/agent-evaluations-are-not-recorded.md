---
id: agent-evaluations-are-not-recorded
title: Persist agent evaluations before the platform's retention discards them
type: risk
status: open
priority: p3
created: 2026-08-07
updated: 2026-08-07
change: ""
capability: signal-recording
blocked_by: []
tags: [signals, retention, battlegrid]
---

# Persist agent evaluations before the platform's retention discards them

## What

The signal recorder captures the *unweighted* signal layer on our own
schedule. A second, different source exists: the platform's own evaluations
(`list_signal_logs` / `get_signal_log`) — what an agent actually consulted
and scored at decision time, weighting applied, ~72 signals per evaluation.
The product reads them live (pipeline and scorecard pages) but persists
nothing: how far back the platform serves them is unmeasured, and whatever
its retention is, it is the platform's, not ours.

## Why it matters

Evaluations are the readings that had consequences — the ones attached to
real skips and real trades. If the platform trims them (by count or by age),
the record of *why an agent did what it did* erodes with no way back,
exactly the loss shape the recorder was built to stop for the unweighted
layer.

## Evidence

- `list_signal_logs` returns `{entries, total}` per agent; nothing in the
  schema states a retention window.
- The trading record already derives from `list_trade_outcomes` because the
  platform's own performance read answers zeros — precedent that
  platform-held history is not to be presumed durable or complete.

## Notes

First step is measurement, not building: read `total` for the oldest
reachable evaluations on both accounts and establish whether a horizon is
visible at all. If retention proves deep, this item may stay closed-as-
unneeded. If built, it belongs in `signal-recording` beside the capture
store, keyed by the platform's own log ids (idempotent re-capture).
