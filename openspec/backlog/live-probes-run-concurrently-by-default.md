---
id: live-probes-run-concurrently-by-default
title: Pin serial execution for tests/live in config, not operator memory
type: chore
status: open
priority: p3
created: 2026-08-07
updated: 2026-08-07
change: ""
capability: platform-mapping
blocked_by: []
tags: [live-probes, vitest, rate-limits]
---

# Pin serial execution for tests/live in config, not operator memory

## What

`npx vitest run tests/live/` runs the 27 probe files concurrently by
default. BattleGrid rate-limits; a concurrent sweep on 2026-08-07 came back
9-failed with pure weather shapes (the freshness probe read an *empty*
server version mid-sweep; rosters unreadable) and cost a diagnosis round
before the serial re-run distinguished throttling from regression. HANDOFF
already records that sessions run the probes serially — but as prose, which
is exactly the check-the-spelling-not-the-reach shape this repo distrusts.

## Why it matters

A keyed operator running the documented command gets phantom failures and
either wastes a diagnosis round or, worse, "fixes" something that was never
broken. The knowledge lives in a paragraph; it should live where the command
reads it.

## Evidence

- Concurrent run 2026-08-07 16:09Z: 9 failed / 18 passed, freshness
  `expected '' to be truthy`, stoppages roster unreadable — the same probes
  green serially minutes before and after.
- HANDOFF: "the reserved live probes run serially" (round-four note).

## Fix

Scope serial execution to `tests/live/` only — a `fileParallelism: false`
override in a dedicated `vitest.live.config.ts` plus a `test:live` script,
or vitest `projects` with a per-dir override. Keep the main suite parallel;
slowing 1,878 unit tests to protect 27 probes would be the wrong trade.
