# Proposal: A Stale Session Cannot 500 Every Page

## Why

Two halves of one story, found in one afternoon.

**The check.** `no-route-exercises-the-database` (P2): every route
`check-serving.sh` probes resolves a session, finds none, and renders "Not
connected" — no query. A database reachable and migrated but whose *queries*
fail passed the whole suite. The fix the item sketched is built:
`tools/check-route-queries.mjs` mints a session cookie the way
`CookieSession` signs one, requests `/audit` with it, and asserts —
via `pg_stat_database` — that the application committed a transaction while
answering. Signing drift fails loudly (cookie rejected → no transaction →
FAIL), which is what keeps the deliberate format mirror honest.

**The bug it caught on its first run.** The authenticated probe answered
**500** where anonymous probes answered 200. A valid session naming a user
with no connection row makes `CurrentUserQuery` call `sessions.clear()` —
and Next.js forbids cookie mutation during a server-component render:
`Error: Cookies can only be modified in a Server Action or Route Handler`.
Every page calls `acting()` during render, so **any visitor holding a stale
cookie — for instance anyone whose connection was removed — gets a 500 on
every page** until the cookie expires. The spec scenario "A session naming a
user who does not exist" required the discard; as implemented, the discard
is the outage.

## What Changes

- `tools/check-route-queries.mjs` (new) + a `check-serving.sh` step: one
  route is exercised with a real signed session and must both answer non-5xx
  and demonstrably touch the database through the application's own pool.
- `CurrentUserQuery` no longer clears the cookie on the read path. The
  refusal stands unchanged; the cookie is left to expire. It identifies
  nobody, is re-refused cheaply on each request (one indexed lookup), and
  the flows that legitimately write cookies — completing a connection,
  disconnecting — already replace or clear it.
- Delta spec: the scenario's "and the session discarded" becomes "and no
  new session is issued for it"; discarding is named as belonging to the
  mutation flows.

## Capabilities

**Modified**: `app-access` — the session-refusal scenario, as above.

## Out of Scope

- Middleware-based cookie cleanup (a place that MAY mutate) — possible
  later; the TTL already bounds the stale window and nothing breaks
  meanwhile.
