---
id: live-write-probe-confirmation-flake
title: The live write-probe trips its own fake confirmation guard inconsistently
type: bug
status: done
priority: p3
created: 2026-07-31
updated: 2026-08-05
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

## Resolved 2026-08-05 — reproduced offline, both suspects settled

`tests/agent/two-edits-in-a-row.test.ts` drives the two cycles this item asked
for. The failing combination fell out on the first run, exactly as predicted:

```
× mints distinct tokens across two DescribeEditQuery instances
  → expected 'r1' not to be 'r1'
```

**Suspect one, confirmed: token id reuse across `SequentialRandom` instances.**
The counter was per instance, so two of them both minted `r1`. The probe builds
a fresh one per describe while sharing one confirmation store, and
`FakeConfirmationStore.issue` was a plain `Map.set` — so the second describe
**overwrote the first's unconsumed entry**, and the first token then named the
second edit's target. Which consume failed depended only on the order they
happened to be spent in. That is the whole flake.

**Suspect two, cleared: the digest is not recomputed over a different object.**
`UpdateAgentCommand` rebuilds the intent in the canonical shape
`DescribeEditQuery` digested, and `digestOf` sorts keys. With one random source,
both agreements spend, in either order.

## Fixed in two places, and the second matters more

1. `SequentialRandom`'s counter is now **per module**. Still deterministic,
   still `r<n>`; no test asserted a literal value.
2. `FakeConfirmationStore.issue` **refuses to overwrite a token that is still
   spendable** — unconsumed *and* unexpired, the same pair `consume` checks.

The collision was the trigger; the fake silently accepting the duplicate is why
this cost five days and read like a product defect. A store that discards an
outstanding agreement without a word is not a behaviour any real store has.

**Noted while fixing**: `FakeAgentsPort` records what a write bound its
confirmation to and does not check it, so a test that calls `update.execute` and
sees `updated` has proven nothing about binding. Two of the first drafts of these
tests did exactly that and passed vacuously. The store's own `consume` has to be
driven against the target the write composed — the arrangement
`edit-binding.test.ts` already used.

The first version of the store guard was itself too strict: it treated an
*expired* token as outstanding, which broke `call-path.test.ts`, where reissuing
one id is how each refusal cause gets walked. Outstanding means still spendable.
