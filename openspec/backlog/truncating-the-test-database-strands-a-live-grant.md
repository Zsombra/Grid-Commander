---
id: truncating-the-test-database-strands-a-live-grant
title: Truncating the test database strands a live grant at BattleGrid
type: risk
status: open
priority: p3
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
