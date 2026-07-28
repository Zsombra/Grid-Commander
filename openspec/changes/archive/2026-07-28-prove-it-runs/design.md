# Design: Prove It Runs

## Technical Approach

Five defects, one theme: nothing in this project has ever executed. The work is
to make the application build, make a schema exist, and then put a gate behind
each so neither can quietly stop being true.

The order matters. The build fixes come first because nothing else can be
observed until the application assembles. The migration is generated from the
schema as it will finally stand — which means the dead column comes out
*before* generation, not after, since a column removed after the first migration
costs a second one. The two defects found by probing (the callback race, the
dead column) are fixed in the same change because both were found by running the
thing, and both would otherwise be filed and forgotten.

Every fix here is paired with the gate that keeps it fixed. A change that
repairs the build without adding `next build` to CI has bought one green run.

## Decisions

### Decision: Resolve `.js` specifiers with a webpack `extensionAlias`
The project writes `import { x } from '@/presentation/session.js'` throughout,
which is correct under `moduleResolution: "bundler"` and is what `tsc`, vitest
and the Node ESM story all expect. Next's webpack does not apply that mapping,
so it looks for a `.js` file that does not exist.

Chosen because it is three lines in `next.config.ts` and changes no source file.

Rejected: **dropping the `.js` extensions** — several hundred import sites, a
convention the rest of the toolchain already agrees on, and a change that would
bury the two real build defects in an unreviewable diff. Rejected: **switching
to Turbopack** — it may well resolve these specifiers, but swapping the bundler
to avoid a resolver setting is a much larger bet than the problem justifies, and
`next build` is what deploys.

### Decision: `next build` is its own CI step, not folded into an existing one
The `app` job already runs typecheck, lint and test as three separate steps, on
the stated reasoning that a failure should name which gate broke. The build is a
fourth gate and gets the same treatment.

This is the finding that matters most in this change. Typecheck passing was read
as evidence the application was sound; it is evidence that the files are
well-typed. The gap between those two claims is exactly where this defect lived
for the entire life of the project, and a scenario in the delta spec now says so
in as many words.

### Decision: The identity for a subject is resolved in one statement
`upsert` currently inserts the user with an untargeted `onConflictDoNothing()`,
then inserts the connection against the id it just made up. When two callbacks
for one new subject race, the loser's user insert is swallowed by the unique
index on `battlegrid_subject` and the connection insert then references a user
that was never created — surfacing
`violates foreign key constraint "connections_user_id_users_id_fk"` to someone
in the middle of connecting their account.

The insert becomes an upsert on `battlegrid_subject` that returns the surviving
id, and everything downstream uses the *returned* id rather than the minted one.
The loser adopts the winner's identity, which is the correct outcome and the one
the spec now requires.

Rejected: **catching the foreign-key error and retrying.** It turns a race into
a retry loop, and it cannot distinguish this violation from a real one.
Rejected: **an advisory lock around the whole upsert.** The unique index already
serializes exactly the contended step; a lock would add a second mechanism for
one invariant.

### Decision: Drop `confirmation_tokens.actor` before generating the migration
The column is written by nobody — `DrizzleConfirmationStore.issue` does not set
it — and read by nobody, since `ConfirmationToken` has no `actor` field. Its
comment says it is defaulted so that rows written before the column existed read
as the user's own, which describes a backfill that never happened because the
table has never existed.

Removing it now costs a line. Removing it after the first migration ships costs
a migration, a deploy, and a paragraph explaining why a column nobody used is
being dropped from a table holding evidence of user consent.

`audit_entries.actor` stays. It is written on every entry and read on every
list; its comment is equally fictional, and is corrected rather than the column.

### Decision: The database suite fails without a database rather than skipping
A suite that skips when `DATABASE_URL` is absent reads as a pass. That is the
failure mode this project keeps finding — `merge_conflict` unreachable,
`design_surface_incomplete_sources` silent on non-JS stacks, a coercion guard
that matched three patterns and not the fourth — and it is not worth
re-introducing deliberately.

So `npm run test:db` is a separate script that **errors** when no database is
configured, and CI runs it as its own step against a service container. Locally
you run `npm test` and it does not require Postgres. There is no configuration
under which the database tests appear to have run and did not.

Rejected: `describe.skipIf(!process.env.DATABASE_URL)`. Convenient, and it makes
"nobody has run these in months" indistinguishable from green.

### Decision: Commit the tsconfig edit Next makes rather than fighting it
`next build` rewrites `tsconfig.json` — it adds `allowJs: true` and reformats
the file. Left alone, every build dirties the working tree, and the first person
to see it will assume something is wrong.

The edit is applied in this change so the build is idempotent. It is called out
here because a reviewer seeing `allowJs` appear in a change about migrations
would reasonably want to know who asked for it: Next.js did.

## Data Flow

The identity resolution, which is the only behaviour that moves:

1. The callback resolves `findUserIdBySubject(subject)`. Present → that id.
   Absent → a freshly minted id, which is a *proposal*, not yet a fact.
2. `upsert` inserts the user on that proposed id, `ON CONFLICT (battlegrid_subject)
   DO UPDATE`, and returns the row's id.
3. The returned id is the identity. When the row already existed — because a
   concurrent callback won — the returned id is the winner's, and the proposed
   id is discarded.
4. The connection is inserted against the returned id, `ON CONFLICT (user_id)
   DO UPDATE`, as it is today.

Step 3 is the fix. Today step 4 uses the id from step 1.

## File Changes

- `app/layout.tsx` (new) — the root layout App Router requires; structural only
- `next.config.ts` (modified) — `resolve.extensionAlias` so `.js` specifiers find `.ts`
- `tsconfig.json` (modified) — the `allowJs` and formatting `next build` applies
- `drizzle/migrations/0000_*.sql` (new) — the initial schema
- `drizzle/migrations/meta/` (new) — drizzle-kit's journal and snapshot
- `src/infrastructure/db/schema/index.ts` (modified) — drop `confirmation_tokens.actor`; correct the `audit_entries.actor` comment
- `src/infrastructure/db/repositories/drizzle-connection-repository.ts` (modified) — resolve identity from the returned row
- `.github/workflows/validate.yml` (modified) — a `next build` step; a Postgres service and a `test:db` step
- `package.json` (modified) — `test:db`
- `tests/db/*.test.ts` (new) — the repositories against real PostgreSQL
- `tests/db/support.ts` (new) — connection, truncation, and the hard failure when unconfigured
- `vitest.db.config.ts` (new) — the database suite, excluded from the default run
