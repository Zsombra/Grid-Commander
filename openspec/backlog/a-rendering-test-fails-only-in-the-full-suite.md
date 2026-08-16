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

## 2026-08-16, later — a second instance, the failure mode captured, and the baseline explained

Three full-suite runs while shipping `the-roster-says-when-residue-grew`.

| run | result | note |
|---|---|---|
| 1 | `live-probes-are-named` **4 failed / 6 passed** | before `npm ci` — see below |
| 2 | **2710 passed / 1 failed** | `tests/rendering/new-agent.test.ts` |
| 3 | **2711 passed / 0 failed** | fully green |

### The six-failure baseline is not a code defect. It was an uninstalled worktree.

This item's option 3 calls the baseline "itself the hazard" and asks for the two
files to be repaired or skipped so the pass criterion can return to zero.
**Neither is needed.** The failures were `Cannot find module
.../node_modules/vitest/vitest.mjs`: this worktree had a `node_modules`
containing one entry (`.vite`), so `npm ls vitest` answered empty, and the two
files that **spawn a subprocess** — `live-probes-are-named` shelling to `vitest`
and `tsc`, and `cli-spawn` likewise — were the only ones that could notice.
Everything else resolved through `npx`.

After `npm ci` in the worktree, `live-probes-are-named` passes **10/10** and the
whole suite reaches **2711/2711**.

So the pass criterion **can already be zero**, and the thing that made it six was
a setup step, not the code. Anyone gating a change on "the count is unchanged
rather than zero" in a fresh worktree is measuring their own install. Run
`npm ci` first and gate on zero.

*(Checked before running it: `node_modules` here is a real directory, not a
reparse point — `Attributes: Directory`, no target. `npm ci` on a junction would
have wiped the shared install, which is a known hazard in this repository.)*

### The second instance — a different file, and this time the failure mode is captured

```
FAIL tests/rendering/new-agent.test.ts
  > the new-agent form asks what the operation requires
  > offers every strategy the platform lists
  Error: Test timed out in 5000ms.
```

Run alone immediately after: **19/19 passed, the failing case in 512 ms.**

**It is a timeout, not an assertion failure.** That is the diff this item asked
for in step 2, and it rules out both candidates the item lists: an ordering bug
would show stale fake state and a clock bug an off-by-interval, and neither
produces "timed out". Nothing was asserted at all — the test never finished.

### A third hypothesis, better supported than either of the two on record

**Contention against the default 5 s `testTimeout`.** `vitest.config.ts` sets no
`testTimeout`, so every test runs on vitest's 5000 ms default. The full-run
timings say what that competes with:

```
run 2   transform 80.15s   collect 231.25s   tests 184.26s   (212 files)
run 3   transform 80.77s   collect 154.26s   tests 201.29s
```

A case that needs 512 ms of its own work is being given a 5 s wall while the
runner transforms and collects 212 files in parallel. `collect` alone swung by
**77 seconds** between two runs of identical code, which is the size of variance
that makes 10x headroom occasionally not enough.

That also explains the two observations together without needing them to share a
cause in the code: **both flaking files are under `tests/rendering/`**, the
heaviest transform targets in the suite (they import page components and compile
JSX), so they are where a scheduling stall is most likely to land.

### What is left

The evidence for the timeout hypothesis is circumstantial — strong, and not a
measurement. It would be settled by running the suite with an explicit
`testTimeout` and seeing the class disappear.

**Recommended:** set `testTimeout` explicitly in `vitest.config.ts`, with a
comment recording that 5 s was chosen by vitest and not by anyone here, that the
observed per-case cost is ~0.5 s, and that the raise is for scheduler contention
across 212 files — never a licence for a case that genuinely got slower. Keeping
the default is the option that leaves a known flake in the gate for every change.

Steps 1 and 2 of "what would settle it" are discharged. Step 3 is answered:
`npm ci`.
