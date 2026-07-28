---
id: generate-initial-migration
title: No migration has ever been generated, so no schema exists to deploy against
type: chore
status: done
priority: p1
created: 2026-07-27
updated: 2026-07-28
change: prove-it-runs
capability: app-access
blocked_by: []
tags: [database, deployment, blocking]
---

# No migration has ever been generated, so no schema exists to deploy against

## What

`drizzle.config.ts` and the full schema exist. `drizzle-kit generate` has never
been run, so there is no SQL, and no database has ever had these tables.

Recorded as WL-7 and as F-2 in `wire-the-app`'s data review.

## Why it matters

It is the last thing between this product and running. The repositories are
written against the schema and typecheck against it, but nothing has executed a
statement — so the first real query is also the first test of whether the schema
and the repositories agree.

Generating a migration in an environment with no database would produce a file
claiming more than it has earned. It is worth doing where it can be applied and
verified.

## Fix

`npx drizzle-kit generate`, apply it to a real PostgreSQL, and run the
repositories against it. Expect to find at least one disagreement — the array
column, the partial unique index on `(user_id, idempotency_key)`, and the
`onConflictDoUpdate` target are the three most likely.
