---
id: a-fork-appears-to-arrive-without-conditions
title: Every fork on both accounts has zero conditions while every SYSTEM strategy has some
type: question
status: open
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
