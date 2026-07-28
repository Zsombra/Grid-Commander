---
id: serving-is-not-gated
title: The build is gated; serving is not
type: debt
status: open
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [ci, testing]
---

# The build is gated; serving is not

## What

`prove-it-runs` added `next build` to CI, so a route that cannot be assembled
now fails the change that broke it. It did not automate the other half: starting
the built application and requesting a page.

The strongest evidence in that change is a manual probe — seven routes served
against a real PostgreSQL, each returning 200, each rendering the not-connected
outcome, with no BattleGrid call attempted and no row written. Nothing re-runs
it. Raised by the verifier as a WARNING on that change.

## Why it matters

Building and serving fail in different ways. A build proves the modules resolve
and the routes compile; it says nothing about a page that throws on first
render, a composition root that cannot reach the database, or a capability page
that leaks something to a visitor with no session.

The concrete near-miss: during that change the served application returned 500
on every capability page because `TOKEN_ENCRYPTION_KEY` decoded to the wrong
length. The build was green. Only serving it found that.

## Fix

A CI step that starts the built application against the existing Postgres
service and requests each capability route, asserting three things per route —
status 200, the not-connected wording, and no BattleGrid call attempted. The
last is the one worth the effort; the first two are nearly free.

`app-access` already requires that every way of lacking authority produces one
outcome. This would be the first check that observes it rather than asserting it
against a fake.

Do not reach for a browser driver. These are server-rendered pages and `curl`
plus a string match covers what the requirement actually claims.

## Second instance, found 2026-07-28

Verifying `close-the-reachability-gap` served every route from a production
build against real PostgreSQL — the first time anything had. **Every capability
route returned 500**; only `/connect` worked.

Cause: `.env.example` documents four of the five variables `loadConfig()`
requires. `SESSION_SECRET` is missing, and it is read on every request that
resolves a session. Filed as `env-example-missing-session-secret`.

Adding the variable and changing nothing else took all 16 routes to 200.

This is the second time this exact gap has produced a live defect — the first
was a malformed encryption key during `prove-it-runs`. Both were invisible to
build, typecheck, lint, 394 unit tests and 51 database tests, because the
database suite builds its own configuration rather than going through
`loadConfig()`.

**The gate that would catch it**: start the built application with only what
`.env.example` provides, request one authenticated route, and require a
non-5xx. That is a handful of lines and it is the only check that exercises
`loadConfig()` the way a deployment does.
