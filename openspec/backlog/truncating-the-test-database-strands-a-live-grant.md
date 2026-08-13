---
id: truncating-the-test-database-strands-a-live-grant
title: Truncating the test database strands a live grant at BattleGrid
type: risk
status: open
priority: p2
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: battlegrid-connection
github: "208"
blocked_by: []
tags: [oauth, tests, teardown, live]
---

# Truncating the test database strands a live grant at BattleGrid

## What

`npm run test:db` truncates `connections` and `users`. If that database also
holds a **delegated connection**, the rows go and the authorization at BattleGrid
does not: the access and refresh tokens are encrypted in the deleted rows, so
after the truncation nothing in the product can revoke them.

Observed 2026-08-13. A walk stored a live connection in `grid_commander_test`;
the re-audit ran the full quality gate over the same database; the connection
vanished and the grant stayed standing at BattleGrid with no local record that it
exists.

## Why it matters

p3 — nothing breaks, and it will only ever bite where someone connects a real
account to a disposable database, which is exactly what verifying the delegated
path requires.

It matters because it is **the failure `DisconnectCommand` was written to
prevent, arriving through a door that command does not watch**. Its own comment:
*"Local deletion alone would leave a live grant the user believes they revoked."*
The product refuses to do that. A test suite does it without asking, and the user
is not present to believe anything either way.

The residue is small but real: an authorization nobody can enumerate, held by a
client registered for a one-off walk, revocable only from BattleGrid's own
interface.

## Evidence

- `tests/db/support.ts:32` — *"This suite TRUNCATES. It must not do that to a
  database somebody is using."* The comment anticipates destroying **data** —
  it cites a truncated recorder record — and not stranding **authority**.
- `src/application/use-cases/connect.commands.ts` — `DisconnectCommand` revokes
  upstream *before* marking the local record revoked, deliberately.
- `src/infrastructure/db/repositories/drizzle-connection-repository.ts:156` —
  the tokens exist only as ciphertext in the row that truncation removes.
- 2026-08-13: `connections` 1 row → 0 after `npm run test:db`; the grant at
  BattleGrid unaffected.

## Notes

Not a defect in `assertDisposable`, which did its job — the database *was*
disposable. The gap is that "disposable" is a claim about the data and this row
is a handle on something that is not local.

Cheapest fix is a sentence, not a mechanism: say in `tests/db/support.ts` and in
`.env.example` that a database holding a delegated connection should be
disconnected through the product before the suite runs. A teardown that revoked
before truncating is possible but would have the test suite making live calls to
BattleGrid, which is a worse trade than a warning.

Found while settling [[a-refresh-is-trusted-to-be-the-same-account]] (#206) —
the connection needed for that observation had been truncated by the gate run
that preceded it.

---

# Re-priced p3 -> p2 on 2026-08-13, after it happened a second time

**The p3 was wrong, and the recommended fix was wrong with it.**

This item was filed at p3 with the reasoning *"nothing breaks, and it will only
ever bite where someone connects a real account to a disposable database"*, and
recommended *"a sentence, not a mechanism"*. Within the same session it fired
again, in the same way, run by the same person who had just written that
sentence.

## Two occurrences, hours apart

| | connection | destroyed by |
|---|---|---|
| first | `users.id 3smvWg_Hs_-wVvEtLcKPEA`, subject `0eccbf37-…` | `npm run test:db` during the production-gate re-audit |
| second | `users.id s8mcA7rlg5xmTbyoVs5u-w`, same subject | `npm run test:db` during the post-verifier gate sweep |

Both were live delegated connections in `grid_commander_test`. Both left an
authorization standing at BattleGrid that **can no longer be revoked from
here**, because the tokens existed only as ciphertext in the truncated row. Two
grants are now orphaned, revocable only from the account's own interface.

## Why the priority moves

The consequence did not change; the **rate** did. A hazard that recurs twice in
one session, the second time after being documented, is not waiting on someone
to read a warning — it is waiting on a guard.

The specific evidence against "a sentence" is that the sentence existed and did
not work. The person who truncated it the second time had written the item
describing the hazard about ninety minutes earlier. Documentation loses to habit,
and `npm run test:db` is habit: it is one of six quality gates, run on every
change, by reflex.

## What the fix should be now

`tests/db/support.ts` already refuses a database that is not named disposable.
It should also refuse to truncate one holding an **active delegated
connection**, and name `DisconnectCommand` — or the disconnect surface — as the
repair.

That is a real guard rather than a warning, it is the same shape as the check
already there, and it fails closed. `assertDisposable` asks whether the
*database* is disposable and answers correctly; nothing asks whether the *data*
is, and a row holding a live credential is not disposable just because the
database around it is.

Small: one condition, one test, `lite` track. The 85-test db suite is already
the harness for it.
