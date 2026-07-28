# Findings: the first time anything ran

Task 0. PostgreSQL 16.13, empty database, the schema as committed at `855c77c`.

## What was expected, and was wrong

The backlog item `generate-initial-migration` predicted three disagreements on
first contact: the `text[]` column, the unique index on
`(user_id, idempotency_key)`, and the `onConflictDoUpdate` target.

**All three were wrong.** The migration generates cleanly, applies cleanly, and
fourteen repository tests pass on the first run. `text[]` round-trips, including
the empty array. The unique index permits many rows with a null idempotency key,
because PostgreSQL treats nulls as distinct by default, which is the behaviour
the code assumes. `onConflictDoUpdate({ target: connections.userId })` resolves
against `connections_user_id_idx` without complaint.

Worth recording plainly: the prediction was made from reading the code, and
reading the code got it wrong three times out of three. What running it found
instead was worse than what was predicted.

## F-1 — There is no root layout, so the application has never built

`next build` fails on the first route it reads:

```
⨯ connect/page.tsx doesn't have a root layout.
```

App Router requires `app/layout.tsx`. The repository has thirteen route files
and zero layout files. The `wire-the-app` change delivered the claim that the
product is reachable; the artifact that would serve it has never existed.

## F-2 — Webpack cannot resolve the project's own import specifiers

With a layout added, the build fails differently:

```
./app/(app)/agents/[id]/archive/page.tsx
Module not found: Can't resolve '@/presentation/session.js'
```

The file is `src/presentation/session.ts`. Under `moduleResolution: "bundler"`,
`tsc` maps a `.js` specifier onto the `.ts` file, and vitest's resolver does the
same. Next's webpack does not, so it looks for a `.js` file that was never
emitted.

Fixed by `resolve.extensionAlias` in `next.config.ts`. With F-1 and F-2 both
addressed, all fourteen routes compile.

## F-3 — CI has never run `next build`

This is the finding, rather than F-1 and F-2 themselves.

The `app` job runs three gates — typecheck, lint, test — and the workflow
comments explain why they are separate steps and why typecheck is not redundant
with the tests. The build is not among them. `tsc --noEmit` type-checks every
file under `app/` and has no opinion about whether Next.js can assemble them
into an application, so the build has been broken for the entire life of the
project with every check green.

The same shape as the coercion guard that matched three patterns and missed the
fourth: a gate that covers something adjacent to the thing it is trusted for.

## F-4 — A duplicated first-time callback surfaces a constraint name

Reproduced, not inferred:

```
RACE attempt 0 => ok
RACE attempt 1 => REJECTED: insert or update on table "connections" violates
                  foreign key constraint "connections_user_id_users_id_fk"
```

`CompleteConnectionCommand` reads `findUserIdBySubject` and mints a fresh id
only when it comes back null. Two concurrent callbacks for one new subject both
read null and both mint. In `upsert`, the loser's `insert into users ...
onConflictDoNothing()` is untargeted, so the unique index on
`battlegrid_subject` swallows it silently — and the connection insert then
references a user that was never created.

The outcome is safe: one subject still resolves to one identity, and a retry
succeeds because `findUserIdBySubject` now returns the winner. What the user
sees is a Postgres constraint name in the middle of connecting their account.

Not reachable by any unit test with a fake, because the behaviour belongs
entirely to the unique index.

## F-5 — `confirmation_tokens.actor` is written by nobody and read by nobody

`DrizzleConfirmationStore.issue` does not set it. `ConfirmationToken` has no
`actor` field, so `consume`'s `returning()` discards it. Every row would carry
the default `'user'` forever.

Its comment — "Defaulted so a row written before this column existed reads as
the user's own" — describes a backfill of a table that has never existed,
because no migration has ever run.

`audit_entries.actor` is real: written on every entry, read on every list. Its
comment is equally fictional and is corrected rather than the column.

## Minor, recorded and not fixed here

- **`listForUser` has no tiebreak** for entries sharing a `created_at`. Two
  writes in one millisecond return in unspecified order. Filed.
- **`complete()` on an unknown id is a silent no-op.** The entry stays
  `attempted`, which is the honest unknown, so the failure mode is acceptable —
  but a wrong id is indistinguishable from a successful completion. Filed.

## What does work

The whole product, once it builds. Served against a real database, `/connect`,
`/agents`, `/audit`, `/strategies` and `/assistant` all return 200 to an
unconnected visitor and render *"You are not connected to BattleGrid"* — the one
outcome `app-access` requires for every way of lacking authority. Nothing leaked,
and no BattleGrid call was attempted.

## Reproduction

```bash
pg_ctlcluster 16 main start
psql -c "CREATE ROLE gridcommander LOGIN PASSWORD '...'" \
     -c "CREATE DATABASE gridcommander OWNER gridcommander"
npm run db:generate
psql -d gridcommander -f drizzle/migrations/0000_*.sql
npm run test:db
npm run build && npm run start
```
