---
id: a-rendering-test-fails-only-in-the-full-suite
title: tests/rendering/exposure.test.ts failed once in the full suite and passes alone
type: debt
status: done
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

## 2026-08-16, session close — 13 failures then 0, same tree, back to back

The strongest reading yet, and it arrived by accident during a close-out gate run.

```
run 4   6 files failed, 13 tests failed / 2700 passed
run 5   212 files passed, 2713 passed / 0 failed
```

**Same commit, same tree, consecutive runs, nothing touched between them.** Run 4
listed failures across six *different* files — `qualification`, `trim-record`
and others — and none of them repeated in run 5. The one failure captured in
detail was again `Error: Test timed out in 5000ms`, with **zero
`AssertionError`s in the whole run**.

That is the hypothesis on this item confirmed about as far as observation can
take it:

- **Nothing is wrong with the code.** Thirteen tests cannot break and unbreak
  between two runs of an unchanged tree.
- **It is not one file or one fixture.** Six files at once rules out ordering
  against a specific shared fake.
- **It is not assertions at all.** Zero assertion failures across thirteen
  reported failures. Every one is the clock.
- **The load correlation is direct.** Run 4 came after a long session with the
  machine busy; run 5 followed immediately with it quiet. `collect` alone has
  now been observed swinging between **138 s and 231 s** across runs of the same
  212 files.

### This raises what the fix is worth

Earlier today the evidence was one flake, then two. It is now **13 in a single
run** — which means the suite that gates every change can report a double-digit
failure count for no reason at all. A gate that does that does not get read; it
gets re-run until green, which is the habit that lets a real failure through.

**Recommendation stands and is now urgent enough to state as one**: set
`testTimeout` explicitly in `vitest.config.ts`. The observed per-case cost is
~0.5 s, the default is vitest's 5 s and was chosen by nobody here, and the
competition is 212 files transforming and collecting in parallel. The comment
should say exactly that, so the raise reads as sizing for scheduler contention
and never as licence for a case that genuinely got slower.

Steps 1 and 2 of "what would settle it" were already discharged. This is the
measurement that says step 3 is not optional.

## Fixed 2026-08-17 — `testTimeout: 15_000`, set explicitly

`vitest.config.ts` now sets `testTimeout` rather than inheriting vitest's 5000 ms
default, with the reasoning at the setting:

- the cases that tripped it need **~0.5 s** alone (`new-agent.test.ts` timed out
  in a full run and passed in **512 ms** immediately after, same tree);
- what they compete with is 212 files transforming and collecting in parallel,
  and `collect` alone has been seen swinging between **138 s and 231 s** on an
  unchanged tree;
- the run that settled it reported **13 failures across 6 files** with the very
  next run reporting 2713/2713 — **zero assertion failures among the 13**.

The comment states plainly that 15 s against a 0.5 s workload is 30× headroom
for the scheduler and **not** licence for a case that genuinely got slower. A
test needing more than that has a real problem and should be fixed rather than
accommodated by raising this again.

Suite after the change: **2713/2713 across 212 files**, `tsc` and `lint` clean.

**What this does and does not prove.** It does not prove the hypothesis — a
green run proves nothing about a flake, and the honest position is that the
class has not recurred *since*, on one run. What it does is remove the failure
mode from the gate: a timeout at 15 s on a 0.5 s case would need a 30× stall,
which is a different and much louder problem than the one this item recorded.

Item closes. If the class ever returns at 15 s, that is new evidence and wants a
new item rather than a bigger number here.
