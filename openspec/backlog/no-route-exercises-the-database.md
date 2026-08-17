---
id: no-route-exercises-the-database
title: No route queries the database without a session, so nothing proves one can
type: debt
status: done
priority: p2
created: 2026-07-29
updated: 2026-07-31
change: a-stale-session-cannot-500-every-page
capability: app-access
blocked_by: []
tags: [verification, database]
---

# No route queries the database without a session, so nothing proves one can

## What

`scripts/check-serving.sh` now runs `tools/check-schema.mjs` before probing, so
it proves the database is **reachable and migrated**. It still does not prove a
*route* can query it.

Every route it probes resolves a session first, finds none, and renders "Not
connected" — which needs no query. So the probe establishes that the application
boots and answers, and nothing about whether a request that reaches the
repositories works.

## Why it matters

Less than it did an hour ago, and worth being precise about what is left.

The gap this closes was large: every route returned 200 with PostgreSQL stopped,
and the check said "serving ok". What remains is narrower — a database that is
reachable and correctly migrated but whose *queries* fail. That is a much smaller
class: a permissions problem on the role, a search-path oddity, a connection-pool
setting.

It is not empty, though. `tools/check-schema.mjs` connects with `pg` directly and
the application connects through Drizzle's pool — two different code paths to the
same database, and only one of them is exercised.

## Evidence

Found 2026-07-29 while adding the schema check. Running `check-serving.sh`
against a stopped PostgreSQL returned 200 on all five probed routes and reported
success — which is what motivated the change, and what makes the residual gap
visible.

## Fix

Probe one route as an authenticated user. That means minting a session cookie the
way `CookieSession` would — signing it with the `SESSION_SECRET` the check
already generates — and requesting `/agents` with it. The route then resolves a
session, reaches `ResolveAuthorityQuery`, and touches `connections`.

The cost is that the check would need to know how a session is signed, which
couples a shell script to a domain detail it currently knows nothing about.
Worth weighing against a small Node helper that imports `CookieSession` and
prints a cookie — the same shape as `tools/check-schema.mjs`, and testable.

Not urgent. The failure it would catch is real but narrow, and a first
deployment's connection is tested by the first person who connects an account.

## Closed 2026-07-31 — and the probe earned its keep on run one

`tools/check-route-queries.mjs` (the Node-helper shape this item sketched):
mints a session cookie the way `CookieSession` signs one, requests `/audit`
with it, and asserts via `pg_stat_database` that the application's own pool
committed a transaction while answering. Signing drift fails loudly — a
rejected cookie means no transaction means FAIL — which is what keeps the
format mirror honest. Wired into `check-serving.sh` after the anonymous
probes.

Its first honest run answered 500: a valid session naming a user with no
connection made `CurrentUserQuery` clear the cookie during render, which
Next.js forbids — every page 500'd for anyone holding a stale cookie. Fixed
in the same change (`a-stale-session-cannot-500-every-page`): refusing is a
read and reads do not mutate; the spec scenario now says so.
