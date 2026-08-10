---
id: ci-runs-live-probes-in-parallel
title: ci.sh runs the live probes through the parallel config — the serial pinning only covers `npm run test:live`
type: risk
status: open
priority: p2
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: harness-integrity
github: "118"
blocked_by: []
tags: [ci, live-probes, rate-limit, verification]
---

# ci.sh runs the live probes in parallel

Tracked on GitHub as **#118**, which carries the three options.

## What

`vitest.live.config.ts` pins `fileParallelism: false` because the platform
rate-limits — the 2026-08-07 concurrent sweep produced **nine phantom failures**
that a serial re-run collapsed to two.

That pinning applies only to `npm run test:live`. `./scripts/ci.sh:57` runs
`npx vitest run --silent` under `vitest.config.ts`, which includes
`tests/**/*.test.ts` and excludes only `node_modules` and `tests/db/**` — so
`tests/live/**` is in the ordinary suite.

Without a key the 30 probe files skip, which is why this has stayed invisible.
**With `BATTLEGRID_API_KEY` set they all run, in parallel**, against the real
account. And `HANDOFF.md`'s "Start Here" tells the next session to run
`./scripts/ci.sh` with a key.

## Why it matters

The 2026-08-07 journal entry named the intended fix: *pinning serial execution
for `tests/live/` in the vitest config rather than in operator memory.* That
landed, and is right. The gap is that it pins the **config**, and `ci.sh`
reaches the same files through a different one — so the rule moved out of
operator memory into a config the documented command does not select.

Cost, in order: a diagnosis round chasing phantom failures; a real regression
masked by nine noisy ones; rate-limit pressure on a live trading account.

## Evidence

- `vitest.live.config.ts:21` — `fileParallelism: false`, rationale in the header
- `vitest.config.ts:11,16` — includes `tests/**`, excludes only node_modules and `tests/db/**`
- `scripts/ci.sh:57` — the vitest gate: no config flag, no exclusion
- `scripts/ci.sh:79` — `freshness` names a single file, so it is unaffected
- 2026-08-10, with a key: `npm run test:live` → **20 passed, 10 skipped**, serial, 550s. The ten skips are write probes correctly gated on `BATTLEGRID_LIVE_WRITES`.

## Notes

Found while running the freshness gate with a key on PR #83. The probes were
run through `vitest.live.config.ts` deliberately, having noticed the include
first, so the sweep described here did not happen to the account.

Option 2 in the issue — give `ci.sh` its own `npm run test:live` gate and
exclude live from the vitest gate — matches the existing `freshness` /
`serving` shape most closely.
