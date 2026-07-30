---
id: the-digest-has-no-uniqueness-guard
type: debt
status: done
priority: P3
capability: battlegrid-connection
created: 2026-07-30
updated: 2026-07-30
change: a-confirmation-binds-to-what-was-agreed
---

# The guard covers the target, not the digest underneath it

`tests/architecture/confirmation-binds-values.test.ts` asserts that no
confirmation *target* is composed by hand — every one comes from
`confirmationTarget`. It says nothing about `digestOf`, which is what makes those
targets mean anything.

Filed from PG-005 of that change's production gate, where the gap was not
hypothetical: the change shipped **two** definitions of `digestOf` and
`canonicalise` — one in `src/domain/capability/digest.ts` and the original left in
`src/application/use-cases/compile-plan.command.ts` — and every guard, test, lint
rule and gate command passed. The duplication was caught by reading the plan
inventory against the diff, not by anything automated.

## Why it matters

Two implementations of the digest can drift. If they do, a plan digested by one
and verified against the other produces different targets, `consume` misses, and
`apply_strategy_plan` silently dies — which is exactly the fifth dead write path
DL-7 found and fixed. The failure is invisible in tests, because the fake port
does not go through `enforce()`.

## Fix

Extend the guard: exactly one definition of `digestOf` and one of `canonicalise`
under `src/`. Then re-inject a second copy and confirm it fails, because a
uniqueness check that has only been seen passing is a comment.

Worth generalising rather than special-casing: the property is *a rule that
several layers depend on has one definition*, and `digestOf` is the second time
this project has needed it (`routeOf` in `reachability.test.ts` was the first, and
that one is still duplicated deliberately across describe blocks).

## Closed 2026-07-30 — same change, once the gate named it

`confirmation-binds-values.test.ts` now asserts exactly one definition of
`digestOf` and one of `canonicalise` under `src/`, and re-injecting a second copy
fails it. Closed in the change that created the gap rather than carried forward,
because the re-injection that proves the guard is the same one that proves PG-001
was fixed — deferring it would have meant fixing the defect and leaving the reason
it was invisible.
