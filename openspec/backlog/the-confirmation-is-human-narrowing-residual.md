---
id: the-confirmation-is-human-narrowing-residual
title: confirmation-is-human's MINTS can be narrowed past the action scan — accepted
type: risk
status: wontfix
priority: p3
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: harness-integrity
github: "87"
blocked_by: []
tags: [guards, mutation-testing, accepted-risk]
---

# The confirmation-is-human narrowing residual, accepted

## What

`tests/architecture/confirmation-is-human.test.ts` holds that no server action
both mints a confirmation and spends it. Its two patterns, `MINTS` and
`PERFORMS`, are asserted against **real source** — the file survives having
either killed outright, which is why it was the only guard in the directory to
pass the 2026-08-10 mutation audit on its first measurement.

The residual, from #87: **narrowing** `MINTS` to a form that occurs only in
page render keeps the mints-somewhere assertion green while the per-action scan
goes blind. A kill is caught; a careful reshaping is not.

## Why wontfix

- The file already does the strong thing twice, and its approach is the one
  every other guard was repaired to copy. The residual requires an edit that
  *changes* the pattern to a shape that still matches page-render code while
  missing action code — materially harder to produce by accident than the dead
  or permissive matchers found everywhere else, all of which arrive by an
  ordinary refactor going slightly wrong.
- Closing it would mean proving `MINTS` against a fixture of every syntactic
  form a mint can take inside an action, which is exactly the enumerate-the-
  spellings shape this repository's six recorded misses all share. A wrong
  guard here is worse than an accepted narrow residual, because it would be
  trusted.

Accepted, on the record, rather than left as an omission. If a real narrowing
of `MINTS` ever ships, this item is the first thing to reopen — reopen it as a
bug, and bring the mutation with it.

## GitHub

Mirrored by #87, which documents the residual in full and closes with this
acceptance stated. No separate issue: opening one to immediately wontfix it
would put the record two clicks from the audit it belongs to.
