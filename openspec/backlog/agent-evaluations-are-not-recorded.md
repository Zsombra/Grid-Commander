---
id: agent-evaluations-are-not-recorded
title: Persist agent evaluations before the platform's retention discards them
type: risk
status: done
priority: p3
created: 2026-08-07
updated: 2026-08-11
change: ""
capability: signal-recording
github: "99"
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

## Resolved 2026-08-11 — measured from both ends; no horizon visible; sentinels recorded

The measurement this item called for, run before anything was built:
`list_signal_logs` per agent with `limit: 1` — `page: 1` for the newest
entry, `page: total` for the oldest. Read-only, both accounts, 2026-08-11
~09:00Z.

| agent | state | total | newest `evaluatedAt` | oldest `evaluatedAt` |
|---|---|---|---|---|
| Undertow (`d0f6829f-96f8-468d-8797-4a04e8dc8e37`) | live | 113 | 2026-08-11T09:03:28.108Z | 2026-08-08T13:00:25.056Z |
| THE .0 (`26a60e91-6b5c-4a64-8138-04705ec2cf80`) | archived | 79 | 2026-08-08T06:01:57.853Z | 2026-07-26T06:18:10.030Z |

- A live agent's record reaches its creation: Undertow was created
  2026-08-08T12:53Z and its oldest evaluation is stamped seven minutes
  later. Nothing in its lifetime has been trimmed.
- Archival does not purge the record: THE .0, archived in the 2026-08-08
  fleet re-organisation, still serves all 79 evaluations three days on,
  reaching sixteen days back.
- List rows carry 23 keys; the ~72-signal detail stays behind
  `get_signal_log`.

Closed as unneeded per this item's own rule. What the read does **not**
prove, kept as two sentinels — each check is two `limit: 1` reads, and
either moving reopens this item:

1. **Age.** The reachable record is only sixteen days old, so a 30- or
   90-day trim would be invisible today. THE .0 is archived and writes
   nothing new, so its oldest `evaluatedAt` (`2026-07-26T06:18:10.030Z`)
   and `total` (79) can only change if the platform trims. Gone or moved
   forward ⇒ age retention exists.
2. **Count.** One read cannot rule out a count cap. Undertow evaluates
   ~38/day; its `total` plateauing while its oldest advances ⇒ a count cap
   exists.

Whether 2026-07-26 is THE .0's first evaluation or an already-trimmed floor
was not answerable from this read — its creation date was not probed. The
age sentinel catches any future movement either way.
