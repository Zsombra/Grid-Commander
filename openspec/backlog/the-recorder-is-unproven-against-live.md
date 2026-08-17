---
id: the-recorder-is-unproven-against-live
title: Run the recorder's first live capture on a keyed session
type: chore
status: done
priority: p2
created: 2026-08-07
updated: 2026-08-07
change: ""
capability: signal-recording
blocked_by: []
tags: [signals, live-probe, waiting-on-operator]
---

# Run the recorder's first live capture on a keyed session

## What

Task 8.2 of `nothing-records-what-the-signals-said` could not run in the
build environment: one full capture against the real platform, recording the
row counts and the stamped platform version. The probe exists and is
key-gated (`tests/live/recorder-probe.test.ts`); this environment holds no
`BATTLEGRID_API_KEY`, by design.

## Why it matters

Nine of nine historical data bugs were invisible until a real call — and the
recorder is the one component where a shape surprise costs history, not just
a fix. The probe asserts the ~84-signal population and prints the
raw-vs-mapped keep-rate, so one keyed run either proves the mapper against
today's platform or names the drift precisely. Until it runs, the mapper's
contract rests on the v11.0.0 observed shape and the fixture mirroring it.

## Fix

On the first keyed session (or the operator's machine):

```bash
BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/recorder-probe.test.ts
```

Then start the recorder for real — the cron line is in
`docs/FIRST_SESSION.md` §3 — because every day before the first scheduled
capture is signal history permanently lost, which is the whole point of the
capability this item completes.

## Notes

DL-010 in the change's decision log records the deferral. The probe is
reads-only and needs no `BATTLEGRID_LIVE_WRITES` — the live-writes guard
derives that rather than taking the file's word for it.

## Closed 2026-08-07

The operator supplied a key and both proofs ran the same afternoon the
change merged, against live battlegrid 11.0.0 (freshness gate green first):

- **The probe** (`tests/live/recorder-probe.test.ts`): 16 coins captured —
  every radar deployment, at its own timeframe — 0 failed. SP500@15m keep
  rate printed **84 raw signal rows → 84 mapped readings**; the raw answer
  carried the unmapped fields (`comparison` included); the record read back
  through `ReadSignalHistoryQuery` with the platform version on every entry.
- **The CLI, end to end into a real PostgreSQL** (task 8.2's letter): run
  `921f8db4` → **1 run row, 16 capture rows (all recorded), 1,344 reading
  rows**, raw jsonb holding all 84 rows per coin, `platform_version =
  11.0.0`, exit 0. Deployments chose the subject: SP500, FARTCOIN, BTC,
  BRENTOIL, ETH, HYPE, SOL, AIXBT, WIF, SKHX, ENA, LDO, BNB, MELANIA,
  MOODENG, TRUMP. A live market fact came free: 255 of 1,344 readings
  triggered at capture time.

The mapper's contract now rests on a live call, not only the recorded
shape. What remains is operational, not evidential: the operator starts the
cron on the machine that keeps the database (`docs/FIRST_SESSION.md` §3) —
the capture proven here lives in an ephemeral container and goes down with
it.
