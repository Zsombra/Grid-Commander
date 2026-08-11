---
id: the-request-budget-is-published-and-discarded
title: BattleGrid publishes a rate-limit budget on every response and the client only reacts to 429 after it lands
type: feature
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-11
change: ""
capability: platform-conformance
blocked_by: []
tags: [battlegrid, mcp, rate-limit, adapter]
---

# A meter we are not reading

## What

The server instructions — never recorded here, see
`three-quarters-of-the-mcp-surface-is-unrecorded` — state the budget
plainly:

> You get **3 requests/second sustained, with up to 120 banked while you are
> idle** — a full bank refills in 40s.

And it publishes the meter on every response:

| Header | Meaning |
|---|---|
| `RateLimit-Limit` | bank ceiling |
| `RateLimit-Remaining` | spendable right now |
| `RateLimit-Reset` | seconds until the bank is full |
| `Retry-After` | on a 429 only |

Its own guidance: *"If you plan a fan-out wider than `RateLimit-Remaining`,
split it across turns or pace it — a 429 arrives too late to steer a batch
you have already dispatched."*

## Where we stand

`src/domain/errors.ts:153` maps HTTP 429 to a domain error, so the failure is
named rather than swallowed. That is the whole of it: **no code reads
`RateLimit-Remaining`, and nothing paces a fan-out against it.** We handle
the crash, not the budget.

This is not hypothetical. Three separate places in this repo carry comments
about a probe that already hit it:

- `src/infrastructure/battlegrid/market-grid-adapter.ts:122`
- `src/application/use-cases/watch-arena.query.ts:52`
- `src/ports/market-grid.ts:22`

The last of those describes the failure mode the server is warning about —
one call in a batch 429s and degrades the whole view.

## Proposed

1. Read the four headers in the adapter's `rpc` and surface them as a budget
   value object on the transport, not the domain.
2. Let batch-shaped callers (the arena watch, the probe, any fan-out) size
   the next batch against `RateLimit-Remaining` before dispatch.
3. Honour `Retry-After` on 429 rather than a fixed backoff.

## Note on the error code

Over-budget calls return HTTP 429 **with a JSON-RPC `-32000` error, and run
no tool**. The "runs no tool" half is worth a test: a 429 is safe to retry
even on a mutating call, which is not true of most transport failures.
