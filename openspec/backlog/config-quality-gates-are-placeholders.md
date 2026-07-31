---
id: config-quality-gates-are-placeholders
title: openspec/config.yaml still carries placeholder quality_gates
type: debt
status: done
priority: p2
created: 2026-07-28
updated: 2026-07-31
change: quality-gates-are-real
capability: ""
blocked_by: []
tags: [config, pipeline]
---

# openspec/config.yaml still carries placeholder quality_gates

## What

`openspec/config.yaml` has:

```yaml
quality_gates:
  - [e.g. npm run type-check]
  - [e.g. npm run lint]
  - [e.g. npm test]
```

Those are the template's example values, never replaced. The real gates for
this project are `typecheck`, `lint`, `test`, `build`, schema-matches-migrations
and `test:db` — six, not three, and two of them (`build`, the schema check) were
added precisely because their absence let real defects ship.

## Why it matters

`CLAUDE.md` says quality gates come from "`quality_gates:` in
openspec/config.yaml, or the Quality Gate section of
docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md". The auditor reads them from there.

With the config holding placeholders, every audit falls through to the
checklist — which names `pnpm lint` and `pnpm typecheck` while the project uses
npm (`checklist-says-pnpm`, P3). So the documented gates are wrong in one place
and absent in the other, and an auditor that trusted either would run the wrong
commands or too few of them.

The `close-the-reachability-gap` audit worked around this by reading the real
scripts out of `package.json`. That is the right answer for a human and the
wrong one for a gate that is supposed to be a computation.

Notably, `build` is missing from both sources — and `prove-it-runs` exists
entirely because "a type check is not a build" and the application had never
been built.

## Evidence

Found during the production gate for `close-the-reachability-gap`, 2026-07-28.

`openspec/config.yaml`, `quality_gates:` block — bracketed example values.
`docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` — `pnpm lint`, `pnpm typecheck`.
`package.json` scripts — `typecheck`, `lint`, `test`, `build`, `db:generate`,
`test:db`.

## Fix

Set the real six in `openspec/config.yaml`, and fix the package manager in the
checklist at the same time so the two sources agree:

```yaml
quality_gates:
  - npm run typecheck
  - npm run lint
  - npm test
  - npm run build
  - npm run db:generate && git diff --quiet drizzle/
  - npm run test:db
```

Worth resolving alongside `checklist-says-pnpm` — they are the same
inconsistency seen from two directions, and fixing one without the other leaves
the contradiction in place.
