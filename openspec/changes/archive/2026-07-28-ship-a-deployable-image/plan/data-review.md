# Data Review: ship-a-deployable-image

Against `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`.

## Data this change moves

Almost none, and that is worth stating precisely. The change adds no read path,
no write path, and no transformation of user or account data. Two processes are
introduced and both concern *schema*, not rows:

| Process | Reads | Writes |
|---|---|---|
| `tools/check-schema.mjs` | `drizzle.__drizzle_migrations.created_at`; the committed journal | nothing |
| `tools/migrate.mjs` | the committed journal | DDL, and drizzle's own bookkeeping |

`check-schema.mjs` opens a connection, runs one `select`, and closes it. It holds
no pool and shares no client with the application.

## No hidden recomputation

The comparison is a set difference on values the two sides already agree on
(DL-5). Nothing is derived, inferred, or recomputed — deliberately, because a
second implementation of drizzle's bookkeeping would drift from the first.

## Credentials

`DATABASE_URL` is read from the environment in both processes and never logged.
Failure messages carry the driver's message, not the URL — checked:
`Could not reach the database: ${err.message}`, where `err.message` for a
connection failure is `connect ECONNREFUSED <host>:<port>`. A host and port, not
credentials.

## Verdict

No violations.
