# Proposal: Prove It Runs

## Why

Seven capabilities are archived and the application has never been built. Not
"has a bug" — `next build` fails on the first file it reads, because there is no
root layout, and App Router refuses to assemble an application without one. No
migration has ever been generated either, so there is also no schema for the
four repositories to write to.

Every gate has been green throughout. CI runs typecheck, lint and test; it has
never run `next build` and has never had a database. `tsc --noEmit` type-checks
every file under `app/` happily — it has no opinion about whether Next.js can
assemble them into an application, and a passing typecheck was read as if it
did.

The reachability requirement in `app-access` says every capability is reachable
"through the interface". That has been false since the interface was written,
and nothing in the harness could tell.

## What Changes

- **The application builds.** A root layout, and a webpack `extensionAlias` so
  the project's `.js` import specifiers resolve the way `tsc` already resolves
  them under `moduleResolution: bundler`.
- **CI runs `next build`.** The gate that would have caught both, added to the
  `app` job. Without it, the two fixes above are a snapshot rather than a
  guarantee.
- **The initial migration is generated and committed**, and applied to a real
  PostgreSQL to prove it produces the schema the repositories expect.
- **Repository behaviour is proven against a real database.** A suite that runs
  the four Drizzle repositories against PostgreSQL, in CI, on a service
  container. Every stored-data guarantee this product makes — single-use
  confirmations, single-use OAuth state, idempotency uniqueness, "a revoked
  connection does not get refreshed tokens" — currently rests on a fake that was
  written to agree with the code.
- **A duplicated first-time callback stops surfacing a Postgres constraint
  name.** `upsert` resolves the identity for a subject in one statement instead
  of inserting a user it then assumes exists.
- **The unused `actor` column is dropped from `confirmation_tokens`.** Written by
  nobody, read by nobody. This is the last moment it can go without a second
  migration.

## Capabilities

**New**: none

**Modified**:
- `app-access` — buildability, a committed schema, and repository behaviour
  proven against a real database are all new requirements of this capability
- `battlegrid-connection` — what a duplicated first-time authorization does

## Out of Scope

- **Applying the migration to any deployed environment.** This change commits
  the SQL and proves it applies to an empty database. Where it runs in
  production is a deployment decision.
- **The three partial surfaces** — `agent-edit-form`, `strategy-section-editor`,
  `assistant-conversation-history`. Building means the surfaces that exist
  serve; it does not mean they are finished.
- **Styling.** The root layout is structural. It ships no visual design, and no
  design tokens are invented here — that is the `/surface` → `/design` handoff.
- **Wiring a model behind the assistant** (`wire-an-assistant-model`).
- **Migration tooling beyond the first migration** — no runner, no deploy hook,
  no rollback story. One migration, generated and committed.
- **Turbopack.** The `extensionAlias` fix targets the webpack build because that
  is what `next build` uses here. Whether `next dev --turbopack` agrees is not
  established by this change.

## Impact

- **Code**: `app/layout.tsx` (new), `next.config.ts`, `tsconfig.json`,
  `src/infrastructure/db/schema/index.ts`,
  `src/infrastructure/db/repositories/drizzle-connection-repository.ts`
- **Data**: `drizzle/migrations/` (new) — the first migration. Creates five
  tables, five indexes, one foreign key.
- **CI**: `.github/workflows/validate.yml` — a build step and a PostgreSQL
  service container.
- **Tests**: a new suite that requires a database, and must be skippable so the
  unit suite still runs without one.
- **Consumers**: none. No public contract changes.
