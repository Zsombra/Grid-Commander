# Design: Ship A Deployable Image

## Decision: Migrating and serving are separate operations

**Decision.** The image exposes `migrate` and `serve`. A platform's release step
runs `migrate` once; every replica then runs `serve`.

**Why.** Drizzle's journal is a shared, ordered resource. N replicas each
migrating on boot is N processes racing on it, and the winner is decided by
scheduling. The failure is not theoretical — it is a half-applied migration on a
database holding other people's BattleGrid credentials.

**Rejected: migrate on boot.** Simpler to deploy and wrong at any replica count
above one. A single-replica deployment would work and would silently become
incorrect the first time someone scaled it.

## Decision: The gate refuses rather than warns

**Decision.** `serve` runs `tools/check-schema.mjs` first. Behind by any
migration, the container exits non-zero and serves nothing.

**Why.** A deployment whose migration was skipped is indistinguishable from one
whose migration ran, until a user touches the feature that needed it. By then it
reads as a defect in the product rather than a missing step in the deploy. A
failed start is something a platform reports; a broken request an hour later is
not.

**Cost, accepted.** No zero-downtime deploy across a migration. For a product
that holds credentials configuring other people's agents and can move their
money, refusing is the right way round.

**Asymmetry, deliberate.** A database *ahead* of the build serves, with a
warning. Refusing there would turn a rollback into an outage, and an older
version against a newer schema usually works.

## Decision: The gate compares `when`, not hashes

**Decision.** Compare the journal's `when` against `drizzle.__drizzle_migrations.created_at`.

**Why.** Drizzle sets `created_at` to the journal entry's `when`, so the two are
the same value by construction. Comparing hashes would mean recomputing drizzle's
hash of each SQL file — a second implementation of someone else's bookkeeping,
which would drift.

**What it does not catch.** A migration file edited after being applied. That is
a real gap, and the schema-drift check in CI already covers the case that
matters: schema changed without a migration.

## Decision: `drizzle-orm` is copied, not reinstalled

**Decision.** `COPY /app/node_modules/drizzle-orm` into the runtime stage.

**Why.** `output: 'standalone'` traces the dependencies reachable from the
server. `drizzle-orm` is *bundled into the server chunks* by webpack rather than
traced, so it is absent from `node_modules` in the standalone output — and
`tools/migrate.mjs` is a separate process that must import it. It has zero
runtime dependencies of its own, which makes this one directory rather than a
second `npm install`.

**Rejected: a runner written here.** `drizzle-kit` is a build dependency and too
heavy for the runtime image, but the answer is
`drizzle-orm/node-postgres/migrator` — the same logic without the CLI. Ordering,
and what "applied" means, are drizzle's to define. A second opinion on them would
be a bug waiting for a migration to expose it.

## Decision: The image carries no secret

**Decision.** No `ARG`, no `ENV` holding a credential, `.env` excluded from the
build context, and everything supplied at run time.

**Why.** The builder stage does `COPY . .`, so a developer's local `.env` would
otherwise reach a layer — and layers are pushed to registries. A build argument
holding a placeholder is how a real one ends up there, which is why the guard
forbids the shape rather than the value.

## Decision: `.dockerignore` keeps `openspec/design/system.json`

**Decision.** Exclude `openspec/` except that one file.

**Why.** `prebuild` regenerates `app/tokens.css` from it. Excluding the whole
directory made `next build` fail inside the image while succeeding everywhere
else. The design tokens are an *input to the build*, not documentation — found by
building from a tree pruned exactly as `.dockerignore` prunes it, which is now
the only way this class of mistake surfaces before a deploy.
