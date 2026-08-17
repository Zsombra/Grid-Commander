---
id: no-health-endpoint
title: There is no health endpoint for a platform to check
type: feature
status: done
priority: p3
created: 2026-07-28
updated: 2026-08-01
change: "a-health-check-that-checks"
capability: app-access
blocked_by: []
tags: [deployment, operations]
---

# There is no health endpoint for a platform to check

## What

Nothing in the product answers "are you healthy?" for a load balancer or a
platform's health check. `docs/DEPLOYING.md` points operators at `/connect`,
which serves without resolving a session — so it answers whether the process is
up, and nothing more.

Declared out of scope by `ship-a-deployable-image` and filed rather than
smuggled in.

## Why it matters

Less than it usually does, and worth saying why. The schema gate already covers
the failure a health check most often catches on a first deploy: a container that
starts against a database it does not recognise never begins serving at all, so
there is no window where it looks healthy and is not.

What `/connect` does not distinguish is a process that is up from one whose
database has gone away underneath it. A platform would keep routing traffic to
it, and every authenticated route would return 500 while the health check stayed
green.

## Fix

A route that resolves nothing about the user and does one trivial round trip to
the database — `select 1`. Two things to get right:

- **It must not resolve a session.** A health check that depends on a cookie is
  a health check that fails for the wrong reason.
- **It must not leak.** No version, no schema state, no configuration. It is
  reachable without authentication by definition.

Worth doing before running more than one replica behind anything that balances.
Not worth doing to deploy once.

## Done (2026-08-01)

`a-health-check-that-checks` (lite, archived): `GET /api/health` — no
session, no cookie, one `select 1` through the application's own pool.
200 `{"status":"ok"}` / 503 `{"status":"unavailable"}`, nothing else in
the body. Probed by the serving gate on every CI run, deliberately *after*
the transaction-accounting helper (probing it first hands that helper a
counter it did not expect to move — found and fixed on the first gate run).
