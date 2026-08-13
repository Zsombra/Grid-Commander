# Proposal: A Live Grant Is Not Disposable Data

## Why

`npm run test:db` truncates `connections`. Twice on 2026-08-13 it truncated a
database holding a **live delegated connection**, and both times the
authorization at BattleGrid survived — the access and refresh tokens existed only
as ciphertext in the deleted rows, so afterwards nothing in the product could
revoke them. Two grants are now orphaned (#208).

`assertDisposable` did its job correctly both times. It asks whether the
**database** is disposable, and it was. Nothing asks whether the **data** is, and
a row holding a live credential is not disposable just because the database
around it is.

**The second occurrence is why this is a guard rather than a warning.** #208 was
filed at p3 recommending *"a sentence, not a mechanism"* — and then it happened
again ninety minutes later, run by the person who had written that sentence.
`npm run test:db` is one of six quality gates, run on every change, by reflex.
Reflex does not consult documentation.

## What Changes

- The database suite **refuses to truncate a database holding an active
  connection**, and names the remedy: disconnect through the product first.
- The refusal is checked once, at the point of truncation, rather than on URL
  shape — because the fact it protects is in the data, not the name.
- `DB_TESTS_MAY_TRUNCATE=yes` deliberately does **not** override it. That flag
  asserts the database is disposable; this is a different claim, and conflating
  them is the confusion that produced the bug.

## Capabilities

**New**: none

**Modified**: `harness-integrity` — what the database suite refuses to destroy.

## Out of Scope

- **Revoking the two grants already orphaned.** Their tokens are gone; only the
  account's own interface can withdraw them. Recorded in #208 and in the journal.
- **A teardown that revokes before truncating.** It would put live BattleGrid
  calls inside the test suite — a worse trade than refusing, and it would need a
  credential the suite does not have.
- **Widening `assertDisposable` to other data.** The signal record is already
  covered by the existing name check and its own warning; this change adds one
  fact, not a framework.

## Impact

| Area | Effect |
|---|---|
| `tests/db/support.ts` | one async check at the truncation point, and its message |
| `npm run test:db` | refuses where it previously destroyed; **no change** on a database with no active connection, which is every CI run |
| Consumers | the 85-test db suite runs unchanged against a clean database |
| Live/platform | none — the check is a local `select`, no BattleGrid call |
