---
id: the-request-budget-is-published-and-discarded
title: BattleGrid publishes a rate-limit budget on every response and the client only reacts to 429 after it lands
type: feature
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: battlegrid-connection
github: "292"
blocked_by: []
tags: [battlegrid, mcp, rate-limit, adapter, pr-82-refile]
---

# A meter we are not reading

Re-filed 2026-08-15 from draft PR #82's stranded backlog (issue #289,
original filed 2026-08-11). On the branch, the *reading* half was built and
the item rescoped to consumption; **none of it ever reached `main`**, so
this re-file carries the full scope again. Verified 2026-08-15:
`grep -rn "RequestBudget\|RateLimit\|retryAfter" src/ tests/` is empty on
`main`.

## What

The server instructions state the budget plainly:

> You get **3 requests/second sustained, with up to 120 banked while you
> are idle** — a full bank refills in 40s.

And publish the meter on every response:

| Header | Meaning |
|---|---|
| `RateLimit-Limit` | bank ceiling |
| `RateLimit-Remaining` | spendable right now |
| `RateLimit-Reset` | seconds until the bank is full |
| `Retry-After` | on a 429 only |

The server's own guidance: *"If you plan a fan-out wider than
`RateLimit-Remaining`, split it across turns or pace it — a 429 arrives too
late to steer a batch you have already dispatched."*

Where `main` stands: HTTP 429 maps to a named domain error and that is the
whole of it. No code reads `RateLimit-Remaining`; nothing paces a fan-out;
`Retry-After` is not surfaced.

## Why it matters

Not hypothetical — three places on `main` carry comments about a probe that
already hit it: `src/infrastructure/battlegrid/market-grid-adapter.ts`,
`src/application/use-cases/watch-arena.query.ts`, `src/ports/market-grid.ts`
(the last describes the exact failure the server warns about: one call in a
batch 429s and degrades the whole view).

## What would settle it

1. Read the four headers in the adapter's `rpc` into a transport-side
   budget snapshot (not the domain).
2. Batch-shaped callers (the arena watch, any sweep) size the next dispatch
   against `remaining` before it goes out; the getter is promoted to the
   port together with that first consumer — a port method with no caller is
   an unread control.
3. Honour `Retry-After` on 429 rather than a fixed backoff.
4. A budget the platform did not declare is exposed as unstated, never
   defaulted or carried forward from an earlier answer.

**A reference implementation of the reading half exists** on tag
`archive/claude/agent-creation-data-strategies-fw6av8`: adapter parsing
into a `RequestBudget` snapshot (`lastRequestBudget()`), `Retry-After` in
the operator's 429 sentence, and `tests/connection/request-budget.test.ts`
holding all of it (plus `tests/support/canonical-json.ts`). It was written
against v17.x — re-verify the headers against the live platform before
porting; the deployments since have moved contracts that looked stable
(#285, #287).

## Notes

- Over-budget calls return HTTP 429 **with a JSON-RPC `-32000` error, and
  run no tool** — worth a test, because it makes a 429 safe to retry even
  on a mutating call, which is not true of most transport failures.
- Two declined delta-spec requirements from PR #82 describe the contract
  shape for this work ("The Platform's Declared Request Budget Is Read",
  "A Rate-Limited Request Names The Wait") — on the same tag, under
  `openspec/changes/archive/2026-08-11-the-record-learns-the-other-three-surfaces/specs/battlegrid-connection/spec.md`.
  Declined only because the spec must not claim unbuilt behavior; the text
  is a usable starting point for the change that builds it.
