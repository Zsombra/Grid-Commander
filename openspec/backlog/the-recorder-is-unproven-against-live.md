---
id: the-recorder-is-unproven-against-live
title: Run the recorder's first live capture on a keyed session
type: chore
status: open
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
