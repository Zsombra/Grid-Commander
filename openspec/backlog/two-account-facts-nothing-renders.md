---
id: two-account-facts-nothing-renders
title: Two account facts nothing renders — agent slots and whether MCP may stake money
type: feature
status: done
priority: p3
created: 2026-08-10
updated: 2026-08-10
change: "whether-the-credential-could-stake"
capability: app-access
github: "121"
blocked_by: []
tags: [battlegrid, account, unread-payload]
---

# Two account facts nothing renders

Tracked on GitHub as **#121**.

## What

`a-cap-above-the-money-cannot-bind` added the first call to `get_account_state`.
It returns six fields; that change surfaces the balance and deliberately leaves
`agentSlots` and `mcpWagerEnabled` unrendered. Both are carried on
`AccountState`, so the surface that wants them needs no second read.

## Why it matters

Neither is urgent, and the slots one has a concrete failure mode: the live
account reads `{limit: 3, used: 3, remaining: 0}` — **at its cap** — and
`/agents` gives no warning before a create refuses.

`mcpWagerEnabled` reads `true` and governs whether this credential may stake
money through MCP at all. `/arena` is watch-only partly because playing stakes a
real entry fee, and a surface explaining why the write path is unoffered should
be able to say whether the credential could even take it.

## Evidence

`src/ports/account.ts` (`agentSlotLimit`, `agentSlotsUsed`, `mcpWagerEnabled`);
live read 2026-08-10 `{"agentSlots":{"limit":3,"used":3,"remaining":0},
"mcpWagerEnabled":true}`.

## Notes

**Not bolted onto the limits page**, because putting a field on a surface
because the read happened to carry it is how a surface becomes a payload dump.
Slots belong beside the roster, the wager flag beside the arena.

For slots, the honest first step is checking whether `get_account_state`'s
`agentSlots` agrees with the `slotUsage` the roster already reads from
`list_intelligence_agents` — two sources for one fact is a disagreement waiting
to happen, and this codebase has found three of those.

`tradingWalletProvisioned` is also carried and unrendered; no obvious home and
no observed case where it disagrees with `hasAccount`, noted only so the fourth
field is not silently forgotten.

## Resolved 2026-08-10 — half built, half already built

- **`mcpWagerEnabled`** now renders beside the arena's watch-only stance, both
  gates named: the account's setting as a live read failing independently, the
  product's absent wager scope as copy backed by the D-3 guard.
  Change: `whether-the-credential-could-stake`.
- **`agentSlots`**: the premise was wrong — `/agents` has warned at capacity
  since `CreationAvailability` landed: "You are using all 3 of your agent
  slots. Recruit III allows 3; ranking up raises the limit." Pinned by
  `tests/agent/capacity.test.ts`. Nothing to build.
- **The two-source agreement check** (list `slotUsage` vs account
  `agentSlots`) was attempted live 2026-08-10 and BattleGrid answered 502 on
  both reads (the #100 flapping pattern). It stays in #121's thread as a
  platform observation for the next live window.
- **`tradingWalletProvisioned`** remains carried and unrendered — no surface
  asks its question. Still noted here so the fourth field is not forgotten.
