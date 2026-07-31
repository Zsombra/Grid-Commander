---
id: live-write-probe-confirmation-flake
title: The live write-probe trips its own fake confirmation guard inconsistently
type: bug
status: open
priority: p3
created: 2026-07-31
updated: 2026-07-31
change: ""
capability: ""
blocked_by: []
tags: [live-tests, confirmations, flake]
---

# The live write-probe trips its own fake confirmation guard inconsistently

## What

Two consecutive runs of `tests/live/write-probe.test.ts` (2026-07-31, after
its spend-side targets were fixed from the stale `'t'` placeholder) failed at
**different** confirmation consumptions: run A renamed successfully and would
have failed later; run B failed at the rename's own consume with "invalid,
expired, already used, or issued for something else". Same code, same key,
same fake store.

Not a product defect: the real app path archives agents through the same
guard cleanly (verified live the same day), and the test's own `finally`
archived its throwaway agent with a correctly-bound token in both runs. The
inconsistency is inside the test's FakeClock/SequentialRandom/FakeConfirmationStore
wiring interacting with two sequential DescribeEditQuery→UpdateAgentCommand
cycles.

## Fix

Reproduce offline: two describe→update cycles against the fakes, asserting
each consume; the failing combination should fall out deterministically.
Suspects: token id reuse across `new SequentialRandom()` instances
overwriting an unconsumed entry, and the digest-bound `agentEdit` target
recomputed over a changes object that differs between describe and update.

## Evidence

Session scratchpad logs 2026-07-31 (~09:50Z and ~10:00Z runs); the account
was left clean both times once the spend targets were fixed.
