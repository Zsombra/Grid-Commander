---
id: recorded-signals-are-not-yet-evidence
title: Grade strategy claims against the accumulating signal record
type: feature
status: open
priority: p2
created: 2026-08-07
updated: 2026-08-15
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

## Tripwire, stated by the operator (2026-08-14 brief)

Two conditions, both required, checked at session start alongside the other
tripwires:

1. **A `DATABASE_URL` is available to the session** — the record lives in the
   operator's Postgres, and without the connection string the analysis layer
   has nothing to read. Working sessions to date have run without one
   (`test:db` skipped every round); its presence is the operator handing this
   item its data.
2. **The record spans a week or more** — the operator's threshold, tighter
   than the "needs days" above and the one that governs. The record started
   2026-08-11, so the earliest the depth half can hold is ~2026-08-18.

Checked 2026-08-14: no `DATABASE_URL` in the environment, record at 3 days —
both halves cold. Checked 2026-08-15: still no `DATABASE_URL`, record at 4
days — both halves cold (earliest the depth half can hold stays ~2026-08-18). When both hold, start the analysis layer per this item's
What/Notes (forward returns per signal state, sample sizes beside every
figure), `/propose`d as its own change.

Checked 2026-08-15, second sweep (2026-08-14T21:52Z / 04:52 local):
**environment half HOT, depth half cold — measured from the db itself.**
`DATABASE_URL` is present in the persistent **user registry** (verified via
`[Environment]::GetEnvironmentVariable('DATABASE_URL','User')`, value not
printed) but was **not** inherited by this session's process environment —
a session spawned from a parent that predates the `setx` won't see it in
`$env:`; read the registry, don't conclude absence from the process env.
The depth read (read-only, arithmetic in UTC): 51 runs, one user,
`first_run 2026-08-12T19:46:14Z`, `last_run 2026-08-14T21:17Z` (recorder
current to the half-hour), **age 2.09 days**. A week of record holds from
**2026-08-19T19:46Z (~Aug 20 02:46 local)**, unchanged.

## Measured 2026-08-15 (evening) — both halves re-anchored on evidence

The operator surfaced the database ("running, and not Docker") and directed
the session to it; the record was measured read-only for the first time.
Both halves of the gate move:

1. **The connection half is satisfiable on demand.** The record lives in the
   **native Windows service `postgresql-x64-18`** (db `grid_commander`,
   localhost:5432) — not the Docker `gridcommander-db`, which has been dead
   since ~2026-08-07 and would collide on 5432 if ever restarted. The
   connection string lives in the recorder's own
   `~/grid-commander/record.ps1`; the operator was handed a one-liner to
   `setx DATABASE_URL` from it, so the next session should find the
   environment half hot. The recorder is verified beyond `LastTaskResult: 0`:
   rows arrive hourly (last row matches the task's LastRunTime to the
   second), 923/924 captures `recorded`, 22 series, ~77k readings.

2. **The depth half was two days optimistic.** The item dated the record
   from the 2026-08-11 stand-up; the genuine rows start
   **2026-08-12T19:46Z** (2026-08-13 02:46 local) and are continuous since.
   A week of record therefore holds earliest **~2026-08-19/20**, not
   ~2026-08-18. The naive `min(started_at)` reads 2026-07-01 — that is a
   stray fixture row, not history; see
   [[three-fixture-runs-sit-in-the-live-record]] (#266).

**For the session that starts the analysis layer**: read as
`user_id = 'owner'` (`OwnerOnlyUser`'s constant — the recorder's identity on
a personal deployment). ~~Until #266's trim lands, exclude run `sr-5`~~ —
obsolete the same evening: #266 was resolved (ceremonied trim of `sr-5`,
guarded SQL for the `someone-else` pair) and the post-clean measurement
reconciled to the row: 49 runs, one user, zero fixture rows, `first_run =
2026-08-12T19:46:14Z`, 920/920 recorded, 20 series. **No exclusion rules
are needed; the record is clean from its true start.**
