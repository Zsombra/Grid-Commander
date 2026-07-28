---
id: apply-migrations-on-deploy
title: A committed migration is not an applied one — nothing runs migrations
type: chore
status: open
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [database, deployment]
---

# A committed migration is not an applied one — nothing runs migrations

## What

`prove-it-runs` generates and commits the first migration, and proves it applies
to an empty database. It does not add anything that applies it anywhere else.
There is no runner, no deploy hook, and no record of which migrations a given
database has seen beyond drizzle's own journal.

## Why it matters

Not at all until there is somewhere to deploy, and then immediately. The failure
mode is the ordinary one: an application that starts against a schema older than
the code, and discovers it one query at a time.

## Fix

Decide it with the deployment target in hand rather than in the abstract. The
two shapes worth weighing are a release step that runs `drizzle-kit migrate`
before the new version starts, and a startup check that refuses to serve against
a schema it does not recognise. They are not exclusive, and the second is what
makes the first's failure visible.

Do not build a bespoke runner. `drizzle-kit migrate` reads the journal this
change commits.
