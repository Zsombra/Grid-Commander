---
id: no-composition-root
title: Nothing wires the use cases to a request — there are no routes and no session
type: debt
status: done
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: wire-the-app
capability: battlegrid-connection
blocked_by: []
tags: [architecture, presentation, blocking]
---

# Nothing wires the use cases to a request — there are no routes and no session

## What

Two changes have shipped a complete domain, application and infrastructure
layer, plus presentational components. Neither shipped a single `page.tsx` or
route handler, and there is no composition root that constructs the adapters
from `loadConfig()`.

`app/` currently holds three empty directories (`connect/`,
`api/auth/battlegrid/callback/`, `(app)/audit/`) and two component files. The
components are pure and tested; nothing renders them.

The missing piece underneath is a **session**. Every use case takes
`{ userId, accessToken }`, and nothing in the product answers where a request
gets those. `connect-battlegrid-account` established that the BattleGrid
connection *is* the identity, but stopped at storing it — reading it back on a
subsequent request was never built.

## Why it matters

The product is not runnable. Every requirement in both changes is implemented
and tested at the layer that owns it, and none of it is reachable by a user.

It also means an important class of defect is currently untestable: nothing
exercises the path from an HTTP request through the guard sequence to
BattleGrid and back. The tests prove each layer honours its contract; they
cannot prove the layers are connected, because they are not.

This is P1 and it blocks the MVP, not just the next change.

## Why it happened

Both changes were specified as behaviour — what the system does when a user
connects, creates, rebinds — and delivered against that. Neither delta spec has
a requirement that says "a user can reach any of this", because that reads like
plumbing rather than behaviour. It is plumbing, and it is also the difference
between a library and a product.

Worth noting for the next spec: a requirement set that never says *reachable*
can be fully satisfied by something nobody can use.

## Fix

A change of its own — call it `wire-the-app`:

1. A session: read the connection back on a request, from a cookie carrying the
   Grid-Commander user id, and refuse the request when there is none.
2. A composition root that builds `McpBattleGridAdapter` and `McpAgentAdapter`
   from `loadConfig()` once.
3. Routes: `/connect`, the OAuth callback, `/audit`, `/agents`, `/agents/new`,
   `/agents/[id]`, and the rebind / archive / journal surfaces.
4. At least one end-to-end test that goes request → guard → adapter → response,
   so "the layers are connected" stops being an assumption.

Token refresh (`needsRefresh` exists and is tested; nothing calls it) belongs
here too — it is the same missing seam.


## Resolved

Closed in `wire-the-app`. Session, composition root, ten routes, and an
end-to-end test through the real path.

**This item understated the gap.** It described missing routes and a missing
session. `src/infrastructure/db/repositories/` was also empty — nothing had ever
written a row, and every test in both prior changes ran against in-memory
doubles. The four Drizzle repositories were written here too. Recorded as WL-2.
