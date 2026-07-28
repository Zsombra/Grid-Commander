# Proposal: Ship A Deployable Image

## Why

There is no way to deploy this. No `Dockerfile`, no target, nothing. The product
builds, serves, and — since `build-the-front-door` — can be used by someone who
knows only its address. The gap between that and a launch is entirely this.

Two things make it more than adding a container file.

**Migrations have no owner.** `drizzle-kit migrate` runs in CI against an empty
database, and by a developer by hand. Nothing runs it on deploy. A first
deployment therefore starts against a database with no tables, and every route
fails on its first query — which reads as a broken application rather than a
missing step.

**Nothing notices when it happens.** That is the worse half. A deployment whose
migration was skipped looks exactly like one whose migration ran, right up until
a user touches the feature that needed the new column. This product's entire
history is checks that were green while the thing they checked was wrong; a
schema gate that nobody runs would be the next one.

## What Changes

- **A multi-stage `Dockerfile`** producing a runtime image with no build
  toolchain, no source, and no secrets. Runs on anything that takes a container.
- **`migrate` as a first-class command in the image**, so a platform's release
  step can apply the journal before the new version serves — rather than every
  replica racing to migrate itself on boot.
- **A schema gate that refuses to serve.** Before the server starts, compare the
  migrations the database has applied against the journal committed in this
  repository. Behind by even one, the container exits non-zero and serves
  nothing. **A missed migration becomes a failed deploy instead of a corrupted
  session an hour later.**
- **`.dockerignore`**, so `.env`, `.git` and local `node_modules` cannot reach
  an image by accident.
- **`docs/DEPLOYING.md`** — the out-of-band steps that cannot be inferred from
  the repository, chiefly that `BATTLEGRID_REDIRECT_URI` must be registered at
  BattleGrid, exactly, before a new hostname can complete one connection.

## Capabilities

**Modified**: `app-access` — one ADDED requirement covering what a deployment
must be true of before it serves. The capability already says the application is
assembled once from configuration and refuses to start without it; this extends
the same idea from *configuration it was given* to *a database it was pointed
at*.

## Out of Scope

- **Choosing a platform.** The image runs anywhere. A `fly.toml` or a render
  blueprint is a thin file on top of this and belongs to whoever picks one.
- **Provisioning PostgreSQL.** Out of the product's hands; documented, not
  automated.
- **Rolling back a migration.** Drizzle's journal is forward-only, and a
  down-migration story invented here would be worse than none. The gate makes a
  failure loud, which is what makes a manual rollback possible.
- **Zero-downtime deploys.** The gate deliberately refuses to serve an old
  version against a new schema, and that trade is correct for a product holding
  credentials that configure other people's agents.
- **A health endpoint.** Worth having and not required for a first deployment.
  Filed rather than smuggled in.
