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
