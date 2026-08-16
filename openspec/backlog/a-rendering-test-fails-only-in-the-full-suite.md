---
id: a-rendering-test-fails-only-in-the-full-suite
title: tests/rendering/exposure.test.ts failed once in the full suite and passes alone
type: debt
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: spec-validation
github: "330"
blocked_by: []
tags: [tests, flake, observed-once]
---

# A rendering test fails only in the full suite

## What

On 2026-08-16, during `the-cap-says-what-it-meters`, `npx vitest run` reported
**7 failures**. Six were the known pre-existing pair
(`live-probes-are-named`, `cli-spawn`). The seventh was new:

```
FAIL tests/rendering/exposure.test.ts
  > a position that is open right now
  > shows the market, the stake and the platform's own valuation
```

Run alone it passes — **31/31**. Re-running the whole suite immediately after,
it passed and the count returned to the known 6. So it failed once and has not
reproduced.

## Why it matters (p3)

It is a flake, and a flake in the suite that gates every change is worth a
record even at one observation. The specific risk here is that the failure count
is used as the pass criterion — `the-cap-says-what-it-meters`'s own task 2.3
says *"confirm the count is unchanged rather than zero"*, because six failures
are expected. **A suite with a known-bad baseline and an intermittent seventh
cannot distinguish a new break from a flake without a re-run**, and the re-run
is the only reason this one was correctly dismissed.

## What is known, and what is not

- **Known**: it has no path to the change that was in flight. It imports only
  `agent-fakes`, `position-fakes`, `FakeClock` and the render helper, and does
  not reference `money-limits` or `maxConcurrentExposureUsd`.
- **Suspected, not measured**: time. A sibling describe in the same file is
  *"how stale it is, and what can be done about it"*, and the failing case is
  *"a position that is open right now"* — so the subject is freshness relative
  to a clock. A `FakeClock` is imported, which argues against wall-clock
  leakage, but the assertion that failed was not captured before the re-run
  overwrote it.
- **Not known**: whether it is ordering-dependent (shared fake state across
  files) or genuinely time-dependent. Nothing here distinguishes them.

## What would settle it

1. Re-run the full suite a few times and see whether it recurs at all. If it
   never does, close this as unreproducible with the count of attempts stated.
2. If it recurs, capture the assertion diff — that alone probably names the
   cause, since the two candidates fail differently: an ordering bug shows stale
   fake state, a clock bug shows an off-by-interval on a timestamp.
3. Worth considering regardless: the six-failure baseline is itself the hazard.
   Either those two files get repaired or skipped-with-a-reason, so that the
   suite's pass criterion can go back to being zero.

Option 3 is the one with value beyond this item — it is what makes a seventh
failure legible without a re-run.
