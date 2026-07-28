# Tasks

## 0. Recon (complete)

- [x] 0.1 Start a real PostgreSQL 16, generate the migration, apply it, and run
      all four repositories against it — findings in `findings-first-run.md`
- [x] 0.2 Establish what `next build` actually does today, and what it does with
      a root layout added
- [x] 0.3 Reproduce the duplicated-callback race against a real database

## 1. Make the application build

- [x] 1.1 Add `app/layout.tsx` — `html`/`body`, `lang`, a title. Structural
      only: no styling, no tokens, no imports from `src/`
- [x] 1.2 Add `resolve.extensionAlias` to `next.config.ts` so `.js` specifiers
      resolve to `.ts`/`.tsx`
- [x] 1.3 Apply the `tsconfig.json` edit `next build` makes, so the build does
      not dirty the working tree
- [x] 1.4 Confirm `npm run build` succeeds and lists every declared route

## 2. Put the gate behind it

- [x] 2.1 Add a `Build` step to the `app` job in `.github/workflows/validate.yml`,
      separate from typecheck/lint/test, with the build-time environment it needs
- [x] 2.2 Prove the gate catches the defect it was added for: delete
      `app/layout.tsx`, confirm the build step fails and typecheck still passes,
      restore it

## 3. The schema

- [x] 3.1 Remove `actor` from `confirmationTokens` in the schema — written by
      nobody, read by nobody — before any migration is generated
- [x] 3.2 Correct the `audit_entries.actor` comment, which describes a backfill
      that never happened
- [x] 3.3 `npm run db:generate` and commit `drizzle/migrations/` including the
      journal and snapshot, unedited
- [x] 3.4 Apply the committed migration to an empty database and confirm the five
      tables, five indexes and one foreign key the repositories need exist

## 4. The identity race

- [x] 4.1 Change `DrizzleConnectionRepository.upsert` to resolve the user row with
      `ON CONFLICT (battlegrid_subject) DO UPDATE ... RETURNING id`, and use the
      returned id for the connection insert
- [x] 4.2 Return the resolved identity to the caller where it differs from the one
      proposed, so a losing callback signs in rather than failing

## 5. Prove it against a real database

- [x] 5.1 `tests/db/support.ts` — connect, truncate between tests, and **throw**
      when no database is configured. No skip path
- [x] 5.2 `vitest.db.config.ts` and a `test:db` script; keep `tests/db/**` out of
      the default `npm test` run
- [x] 5.3 Connection repository: round-trip, upsert idempotence, revoked
      connections do not receive refreshed tokens, scopes survive `text[]`
- [x] 5.4 OAuth transactions: single-use, expiry, the sweep
- [x] 5.5 Audit: begin/complete, many entries with no idempotency key, a second
      entry with the same key rejected, newest-first ordering
- [x] 5.6 Confirmations: single-use, binding to (tool, target), expiry, and two
      concurrent consumes where exactly one wins
- [x] 5.7 The race: two concurrent first-time upserts for one subject leave one
      identity, both callers resolve to it, neither raises a storage error
- [x] 5.8 Add a PostgreSQL service container and a `test:db` step to the `app` job

## 6. Verification

- [x] 6.1 `npm run build` succeeds; every route in the source appears in the
      output — R: The Application Builds Into A Servable Artifact
- [x] 6.2 Serve the built application and request each capability page with no
      connection; each returns the not-connected outcome and reaches no
      BattleGrid tool — R: The Application Builds Into A Servable Artifact,
      R: Every Capability Is Reachable
- [x] 6.3 Apply the committed migration to an empty database and run the whole
      `test:db` suite green against it — R: The Schema Is Created By A Committed
      Migration
- [x] 6.4 Re-run `db:generate` against the committed migration and confirm it
      produces no second migration — R: The Schema Is Created By A Committed
      Migration, second scenario
- [x] 6.5 Re-inject the untargeted `onConflictDoNothing` and confirm 5.7 fails —
      R: The Connection Is The Identity, third scenario
- [x] 6.6 Confirm `npm test` still passes with no database present, and that
      `npm run test:db` fails rather than skips — R: Stored-Data Behaviour Is
      Proven Against A Real Database, fourth scenario
- [x] 6.7 `npm run typecheck`, `npm run lint`, `npm test`, `python3
      .claude/tools/openspec.py validate --all`
