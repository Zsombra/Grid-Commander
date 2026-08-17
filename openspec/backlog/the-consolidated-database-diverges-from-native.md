---
id: the-consolidated-database-diverges-from-native
title: The signal record was copied into Docker but a host process still writes to the native database
type: risk
status: done
priority: p2
created: 2026-08-17
updated: 2026-08-17
change: ""
capability: signal-recording
github: "347"
blocked_by: []
tags: [postgres, docker, signal-recording, divergence, data-integrity]
---

# Two databases now hold the signal record, and only one of them is growing

## What

On 2026-08-17 the working database was dumped from the native PostgreSQL 18 and
restored into a Docker `postgres:18` container, verified row-for-row at the time
(165,816 `signal_readings`, 3,171 `audit_entries`, every count matching).

**Within the hour they had diverged.** The native database is still being written to:

| | `signal_readings` |
|---|---|
| native `grid_commander` (port 5432) | **167,496** |
| Docker `grid_commander` (port 5433) | **165,816** |

The newest `signal_capture_runs` row in the native database is dated the same day,
so a host-level process — a scheduled capture, most likely, with `DATABASE_URL`
pointing at native — is still recording there while the product reads the container.

## Why it matters

The signal record is the one dataset this project cannot rebuild: BattleGrid serves
**current readings only**, so a gap never re-closes. Two live copies means:

- Whichever copy is treated as authoritative later, the other one's rows are lost
  unless someone reconciles them deliberately.
- The gap widens for as long as this goes unnoticed, and nothing surfaces it.
- The intent behind the move was *"everything on Docker, so I have full control when
  this is running or not"*. That is not yet true while a host process writes
  elsewhere.

## Evidence

- Counts above, read 2026-08-17 from both servers
- `select max(started_at) from signal_capture_runs` on native returns a same-day
  timestamp, after the dump was taken
- The dump itself: 100,883,358 bytes, 9 `COPY` blocks, `drizzle.__drizzle_migrations`
  preserved with 4 rows
- Native was at migration **4 of 5** (`0004_furry_chameleon` never applied); the
  container app then applied 0004 and 0005 to the restored copy, so the two are now
  divergent in **schema** as well as in rows

## What would settle it

Find what writes to native — most likely a scheduled task or a shell with
`DATABASE_URL=...5432/grid_commander` — and decide one authority. Then either point
that writer at 5433, or abandon the container copy and run the product against native.
Reconcile the delta before either, since it is only recoverable from whichever copy
holds it.

## Notes

Unrelated to `the-port-knows-what-costs-money`; found while running its production
gate and recorded there as note 4. The near-miss in that gate is adjacent and worth
reading with this: an inherited `DATABASE_URL` pointed the truncating `test:db` suite
at the live native database.

## Resolved — 2026-08-17

**The writer was found**: a Windows scheduled task `GridCommanderRecorder`, running
hourly (`PT1H`) from `C:/Users/rafae/grid-commander/record.ps1` — a **separate checkout
dated 2026-08-11** — with `DATABASE_URL` hardcoded to native 5432. A user-scope
`DATABASE_URL` environment variable pointed there too.

**The divergence was bidirectional**, so no wholesale dump could have fixed it:

| table | native | docker | direction |
|---|---|---|---|
| `signal_readings` | 167,496 | 165,816 | native ahead by 1,680 |
| `signal_captures` | 2,020 | 2,000 | native ahead by 20 |
| `signal_capture_runs` | 104 | 103 | native ahead by 1 |
| `audit_entries` | 3,193 | 3,708 | **docker** ahead by 515 |

Native was also at **4 migrations against Docker's 6**, so restoring native over the
container would have reverted the schema.

**Fixed by row-level sync, not replacement.** Each table exported to CSV, staged, then
`INSERT ... ON CONFLICT DO NOTHING` with **no conflict target**, so every unique
constraint was respected rather than only the primary key. The signal tables had
identical columns; `audit_entries` was inserted with an explicit column list so
native's 22 rows landed with `platform_destructive_hint` NULL — correct, since the
platform's claim was not recorded for them.

**Then the recorder was repointed at 5433** and run through its own scheduled task:

```
native  167,496 -> 167,496   (frozen)
docker  167,496 -> 169,176   (+1,680, one new capture run)
LastTaskResult: 0            (previously 3221225786 - terminated)
```

Docker is now the single authority and the recorder writes only there. The two `#340`
disagreement audit rows survived the sync intact.

**Two things this surfaced but did not fix**: the recorder runs from a five-day-old
checkout at `ee65fea` with `record.ps1` untracked, and its log is written as UTF-16 by
PowerShell's `*>>` redirect. Native is deliberately left in place as the
pre-consolidation fallback.
