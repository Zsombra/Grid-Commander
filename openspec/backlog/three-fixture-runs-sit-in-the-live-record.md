---
id: three-fixture-runs-sit-in-the-live-record
title: Three fixture-shaped capture runs sit in the live signal record, one inside the owner's read path
type: debt
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: signal-recording
github: "266"
blocked_by: []
tags: [signals, data-integrity, recorder, trim]
---

# Three fixture-shaped capture runs sit in the live record

## What

The live `grid_commander` database (native `postgresql-x64-18`, the one the
recorder writes to) holds three runs that the recorder did not produce:

| id | started_at (UTC) | user_id | platform_version | captures |
|---|---|---|---|---|
| `sr-8` | 2026-07-01T06:00:00.000Z | `someone-else` | v11.0.0 | rides among 4 total |
| `sr-12` | 2026-08-07T06:00:00.000Z | `someone-else` | v16.0.0 | " |
| `sr-5` | 2026-08-07T06:00:00.000Z | `owner` | v16.0.0 | " |

Fixture fingerprints on all three: sequential `sr-N` ids where real runs carry
generated ids, timestamps exactly on the hour where real runs land at
`:17:0x.xxx`, `subject_count: 1` where real runs cover ~20 pairs, and the
`someone-else` user id is the db suite's isolation-fixture name
(`tests/rendering/support/fake-acting.ts` and five other files). `'owner'`
itself is legitimate — it is `OwnerOnlyUser`'s constant
(`src/ports/account.ts:44`) and the real recorder's identity — which is what
makes `sr-5` the harmful one: it sits **inside** the user every per-user read
acts for.

Likely origin: rows written against the live database before
`tests/architecture/db-suite-refuses-a-live-database.test.ts`'s guard existed.
Not re-derivable from the rows themselves; the guard now prevents recurrence.

## Evidence

Read-only measurement, 2026-08-15, against the live db (queries over
`signal_capture_runs` / `signal_captures`):

- 51 runs total = 48 genuine hourly `owner` runs (2026-08-12T19:46Z →
  2026-08-14T18:17Z at measurement time, 22–24/day, no gaps) + these 3.
- Naive `min(started_at)` answers **2026-07-01** — which is how the record's
  age was nearly misread as 45 days; the genuine record starts
  **2026-08-12T19:46Z** (2026-08-13 02:46 local).
- 4 captures ride on the three stray runs; genuine content is healthy
  (923/924 captures `recorded`, 22 series, ~77k readings).

## Why it matters

`sr-5` poisons every owner-scope derivation the `recorded-signals-are-not-
yet-evidence` (#94) analysis layer is about to be built on: record age, run
coverage, and gap analysis would all read a six-day hole (Aug 7 → Aug 13)
as lost history that never existed. The coverage machinery derives gaps
from runs by design (`trim-record.command.ts` header), so a foreign run is
not cosmetic. The `someone-else` pair is inert — invisible to any per-user
read — but pollutes whole-table measures like the one that found it.

## Remedy

- **`sr-5`**: the product already owns the ceremony — `/recorder/trim` as
  the owner with a boundary of **before 2026-08-10** removes it (and its
  captures) with three days of margin on each side: the stray is 08-07, the
  genuine record starts 08-12T19:46Z. Do not use `before 2026-08-13`: in
  UTC that boundary swallows the first five genuine runs
  (08-12T19:46Z–23:17Z). Operator act, destructive, confirmed — exactly
  what the trim ceremony exists for.
- **`sr-8` / `sr-12`**: unreachable in-product (no session can act as
  `someone-else`). Either manual SQL once, or accept them as inert — but
  record the choice here either way.
- The #94 analysis layer should not need to special-case any of this once
  the trim lands; until it does, any depth/coverage figure must be computed
  from `user_id = 'owner'` AND excluding `sr-5`.

## Related

- [[recorded-signals-are-not-yet-evidence]] (#94) — the consumer these rows
  would poison; its depth gate is re-anchored on the measured start.
