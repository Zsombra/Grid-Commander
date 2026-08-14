---
id: three-actions-live-outside-the-form-field-cross-check
title: Unexported server actions are invisible to the form-field cross-check
type: risk
status: in-progress
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: "the-hidden-actions-move-where-the-scanners-look"
capability: harness-integrity
github: "263"
blocked_by: []
tags: [tests, scanner, server-actions, vacuity]
---

# Unexported server actions are invisible to the form-field cross-check

## What

`tests/architecture/a-form-sends-what-its-action-reads.test.ts` discovers the
server actions it checks with a regex anchored on
`export async function (\w+)\(formData: FormData\)`. Three actions in the
product are module-level but **not exported** — `agree` and `decline` on
`app/(app)/pending/[id]/page.tsx`, and the connect action on
`app/connect/page.tsx` — so the cross-check that proves a form sends every
field its action reads has never covered them.

`reachability.test.ts`'s `serverActionsIn()` shares the same `export` anchor,
so its orphan-action rule (every action has a form that submits to it) also
skips the three.

## Why it matters

The cross-check exists because `RebindConfirm` shipped with a form sending
four fields to an action reading five, and every submit threw. The three
uncovered actions are exactly one refactor away from the same defect, and the
scanner would stay green. The floors in both scanners protect against the
regex matching *nothing*; they cannot protect against a correct regex whose
definition of "server action" is narrower than the product's.

p3 because the three actions are stable, tested through their pages'
rendering paths, and the pattern is no longer spreading:
`the-build-checks-what-next-generates` establishes colocated exported
`actions.ts` modules as the convention, which the scanners do see.

## Evidence

- `tests/architecture/a-form-sends-what-its-action-reads.test.ts:129` — the
  discovery regex
- `tests/architecture/reachability.test.ts:95-99` — `serverActionsIn`, same
  anchor
- `app/(app)/pending/[id]/page.tsx:181,247` — `agree` / `decline`,
  module-level, unexported
- `app/connect/page.tsx:111` — the connect action

## Notes

Found while designing `the-build-checks-what-next-generates`, which moved the
fourteen *exported* page actions into `actions.ts` modules and deliberately
did not touch these three (they already satisfy Next's page contract; moving
them is a convention sweep, not a gate fix). Two repairs are possible: move
the three into `actions.ts` modules so the existing scanners see them, or
teach both scanners the unexported module-level shape. The first is smaller
and makes the convention total; the second guards the shape wherever it
regrows.
