---
id: a-fork-appears-to-arrive-without-conditions
title: Every fork on both accounts has zero conditions while every SYSTEM strategy has some
type: question
status: done
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, conditions, fork, unobserved]
---

# Forks have no conditions, and nobody knows why

Observed 2026-08-06 while settling
`an-update-that-omits-conditions-is-unobserved`, across both accounts.

| | conditions |
|---|---|
| every SYSTEM strategy (Dunkirk, Leningrad, London, Tobruk, Midway, El Alamein, Bastogne, Kursk, Normandy, Stalingrad, Berlin, Iwo Jima) | **2 – 10** |
| `Midway (fork)`, `El Alamein (fork)`, `Stalingrad (fork)` (account 2) | **0** |
| twenty-two user-owned strategies on account 1 | **0** |
| `Dunkirk (fork)` (account 1) | **2** |

That last row is the reason this is a question rather than a finding. One fork
does carry its parent's conditions, so "forking drops them" cannot be the whole
story.

## Why it matters

Conditions decide **direction** — `ALL_AGREE_UP` and `ALL_AGREE_DOWN` are the
two on Dunkirk. A strategy with none is a strategy whose composed conditions
resolve nothing, and `a-drafted-condition-can-be-tried` now offers a surface for
composing them where the strategy's own conditions are the context a
`conditionRef` resolves against. On twenty-five of the twenty-six user-owned
strategies across both accounts, that context is empty.

Nothing is broken and no money moves, so p3.

## Three readings, none established

1. **Fork does not copy conditions**, and `Dunkirk (fork)` predates a change to
   that behaviour or was populated afterwards.
2. **Fork copies them and something later cleared them** — an edit through this
   product or BattleGrid's own app. The compile path is now cleared of that
   suspicion (see the sibling item), but the platform's own UI is not.
3. They were **authored** on the twelve SYSTEM strategies and simply never on
   anything a user made.

## First step when taken

Fork a SYSTEM strategy that has conditions and read the result — one
`fork_strategy` then one `get_strategy`. That is a write, so it needs
`BATTLEGRID_LIVE_WRITES=1` and leaves a strategy behind; `fork-strategy` is
already exercised by `restore-probe`, so the throwaway pattern exists. Reading
`forkedFromStrategyId` on the existing forks may narrow it first, for free.

---

# Answered 2026-08-06, for free, and the premise was wrong

The free option was taken and no write was needed. **Reading (1) is refuted:
forking preserves conditions.** The item's table was built on a sample that
happened to exclude the twenty-two cases that disprove it.

## What was actually measured

Every fork on both accounts, read through `get_strategy` (with
`includeInactive: true` where the fork is archived), against the conditions its
named parent carries now:

| account | forks | created | conditions |
|---|---|---|---|
| 1 | **22**, every one a fork of `Dunkirk` | 2026-08-01 → 2026-08-05 | **2 each** — `ALL_AGREE_UP`, `ALL_AGREE_DOWN`, exactly Dunkirk's |
| 2 | 5 (`Midway`, `Dunkirk`, `London`, `El Alamein`, `Stalingrad`) | 2026-07-25 → 2026-07-29 | **0 each**, while their parents carry 5, 2, 6, 2 and 10 |

The split is **when the fork was made**, not which account made it or which
parent it came from. Account 2's `Dunkirk (fork)` (created 2026-07-29) has zero
conditions; account 1's twenty-two Dunkirk forks (created from 2026-08-01) each
have the same two. Same parent, same tool, opposite result — so nothing about
fork semantics distinguishes them.

## The mechanism

`fork_strategy` requires **`sourceRevision`** as well as `strategyId`. A fork is
pinned to a revision and receives that revision's content, conditions included.

And the SYSTEM strategies were edited in one batch. All twelve carry an
`updatedAt` inside a four-and-a-half-hour window on **2026-08-05**
(09:07:19Z → 13:35:47Z, eleven of them between 09:07 and 09:16), against a
`createdAt` of 2026-07-13 for all twelve. Conditions arrived on them somewhere
between 2026-07-29 and 2026-08-01 — after account 2's forks were taken, before
account 1's.

So reading (3) is the right one, with the mechanism attached: conditions were
**authored on the SYSTEM strategies** at a revision later than the one account
2's forks are pinned to. A fork taken before that revision has none because the
revision it copied had none.

## What this changes

- **Nothing to fix.** No product behaviour depends on the refuted reading.
- **The condition-authoring surface is safe on this point.** An operator who
  forks a SYSTEM strategy today to edit its conditions gets the parent's
  conditions to edit. That was the practical worry.
- **A strategy with no conditions is usually just a strategy nobody authored
  conditions on** — the twenty-five user-owned non-fork strategies across both
  accounts. That is not a defect and needs no surface.

## Left open

`sourceRevision` is not readable back off a fork: the payload carries
`forkedFromStrategyId` and no revision beside it, so a fork cannot say which
revision of its parent it holds. Filed separately as
`a-fork-cannot-say-which-revision-it-came-from`.
