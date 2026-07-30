# Master Plan: ship-a-deployable-image

## Goal

Make this deployable: a container image that runs anywhere, applies its own
migrations as a separate operation, and refuses to serve against a schema it does
not recognise.

## File & Responsibility Inventory

| File | Responsibility | Status |
|---|---|---|
| `Dockerfile` | Three stages; runtime carries no toolchain, source or secret | added |
| `.dockerignore` | Keeps `.env` and build noise out of the context; keeps design tokens in | added |
| `docker-entrypoint.sh` | Dispatches `migrate` / `serve`; gates serving on the schema | added |
| `tools/check-schema.mjs` | Compares the committed journal against what the database applied | added |
| `tools/migrate.mjs` | Applies the journal via drizzle's own migrator | added |
| `next.config.ts` | `output: 'standalone'` so the runtime stage has something to copy | modified |
| `docs/DEPLOYING.md` | The out-of-band steps nobody can infer from the repository | added |
| `tests/db/schema-gate.test.ts` | The gate against a real PostgreSQL, in every state | added |
| `tests/architecture/deployable.test.ts` | The instructions themselves | added |

Verified against `git status`: nine files, no drift.

## Constraints

- The runtime image must hold no credential (spec requirement).
- Migrating must not happen once per replica (DL-2).
- The gate must refuse, not warn, when the database is behind (DL-3).
- No bespoke migration runner (backlog `apply-migrations-on-deploy` says so
  explicitly, and DL-6 honours it).

## Coverage Matrix

| Requirement | Implementation | Test |
|---|---|---|
| A Deployment Serves Only Against A Schema It Recognises | `tools/check-schema.mjs`, `docker-entrypoint.sh` | `tests/db/schema-gate.test.ts` (real PostgreSQL) |
| The Deployable Artifact Carries No Secret | `Dockerfile`, `.dockerignore` | `tests/architecture/deployable.test.ts` |

## Risks

| Risk | Handling |
|---|---|
| `output: 'standalone'` incompatible with the webpack `extensionAlias` | Tested first, before anything else was written. It works. |
| `drizzle-orm` absent from the traced output | Found by checking rather than assuming; copied explicitly (DL-6) |
| `.dockerignore` excluding a build input | Build run from a pruned tree; caught the design tokens |
| No Docker daemon to build with | Runtime layout assembled by hand and exercised end to end; remainder filed as `image-never-built` (P1) |

EXECUTION READY FOR PRODUCTION GATE
