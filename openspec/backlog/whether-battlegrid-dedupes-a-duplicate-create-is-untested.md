---
id: whether-battlegrid-dedupes-a-duplicate-create-is-untested
title: Nobody has tested whether BattleGrid refuses a duplicate agent create
type: question
status: done
priority: p3
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: agent-authoring
github: "238"
blocked_by: []
tags: [idempotency, battlegrid, probe, write-path]
---

# Nobody has tested whether BattleGrid refuses a duplicate agent create

> **Closed 2026-08-14 — measured, the key half.** Operator authorised the
> writes and chose Vanguard (idle, 0 trades) as the slot to free. Probe:
> archived Vanguard → created "Probe 238 Dedupe" (`tradingMode: OFF`, key
> `gc-probe-238-key-alpha`) → repeated byte-identical with the same key →
> **the same agent came back** (id `b4697027…`, same `createdAt`, revision 1,
> no error, slots unchanged) — at full capacity, so the dedupe outranks the
> capacity check. BattleGrid honours its documented contract. Cleaned up:
> probe agent archived, Vanguard reactivated (revision 10, config intact).
> The name-collision-without-key half stays unmeasured (needs two free
> slots) and no longer matters to this product: create always sends a key,
> and the local ledger dedupes regardless (#239). Recorded in
> `docs/BATTLEGRID_MCP_REFERENCE.md` under `create_intelligence_agent`.

## What

A live probe on 2026-08-14 established that **BattleGrid refuses a duplicate
`fork_strategy`** — twice over, with an explicit name and with the name omitted,
both returning `INTERNAL_ERROR` on the second call. That refuted the claim in
#231 that a double press makes two strategies.

**The same question about `create_intelligence_agent` was not answered.**
`get_account_state` reported `agentSlots: {limit: 3, used: 3, remaining: 0}`, so
a create would have been refused for capacity rather than for duplication and
would have proved nothing. Freeing a slot means archiving one of the operator's
real agents, which was outside what had been authorised.

## Why it is worth knowing, and why it is only p3

**Only p3, because the answer changes nothing that ships.** `/agents/new` now
mints an `idempotencyKey` per render and carries it as a hidden input (#231,
`3b7aec7`), and the platform documents that mechanism in its own schema: *"A
retry with the same key returns the original result rather than repeating the
command."* That protection is correct whether or not a second guard exists
underneath — a Postgres unique index does not dedupe NULLs, so passing nothing
was no guard regardless.

**What the answer would buy** is an accurate picture of where the guarantee
actually lives. Two of this session's wrong turns came from assuming the absence
of a client-side guard meant the absence of a guard; knowing which writes the
platform protects on its own is the antidote, and creating an agent is the
highest-stakes one left unmeasured.

## What would settle it

On an account with a free agent slot, or after freeing one deliberately:

1. `create_intelligence_agent` with a given `displayName` and no
   `idempotencyKey`. Repeat with byte-identical arguments. Observe whether the
   second is refused (name collision, as fork is) or creates a second agent.
2. Separately, confirm the documented key behaviour: two calls with the **same**
   `idempotencyKey` should return the original result rather than create twice.

Both are **real writes to a real funded account** and need the operator's
explicit authorisation. Clean up afterwards — `archive_intelligence_agent` is
recoverable; permanent delete is not available over MCP.

Record the result in `docs/BATTLEGRID_MCP_REFERENCE.md`, not only here: which
tools dedupe on their own is surface knowledge, and it is exactly the kind that
goes stale after a deployment.

## Evidence

- Probe, 2026-08-14 — four `fork_strategy` calls; second of each pair refused
- `get_account_state` — slots 3/3, why create was not probed
- `create_intelligence_agent` live schema — the `idempotencyKey` contract
- `src/presentation/components/agent-form.tsx` — the key, now carried
- `tests/architecture/a-create-carries-a-dedupe-key.test.ts` — the guard

## Notes

Split out of [[two-confirmations-can-create-two-things]] (#231) at session close.
That item is **done** — the actionable work shipped — and leaving an open
question inside a closed item is the exact pattern #227's notes warned about:
*"it was living only in a closed item's body and a test comment, which is not a
place work gets found."*
