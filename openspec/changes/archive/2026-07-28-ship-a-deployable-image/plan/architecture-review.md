# Architecture Review: ship-a-deployable-image

Against `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`.

## Dependency direction

Nothing added touches the layered application. `tools/check-schema.mjs` and
`tools/migrate.mjs` are deployment operations, not part of the composed app:
they run as their own processes, import no `src/` module, and share no state with
the server. Confirmed — neither imports `@/`.

`next.config.ts` gains one build flag.

## P6 — one way in

Unchanged. `tools/migrate.mjs` reaches PostgreSQL, not BattleGrid; `BattleGridPort`
is untouched and the MCP SDK import guard still passes.

The migrator does open a second route to the *database*, alongside the
repositories. Deliberate and correct: applying DDL is not a repository's job, and
drizzle's migrator is the tool that owns the journal. It writes no application
data.

## No runtime dual-path

`docker-entrypoint.sh` branches on the command, which is dispatch rather than a
dual path — `migrate` and `serve` are different operations, not two ways to do
the same thing. `deployable.test.ts` asserts the branches stay disjoint.

## No defensive fallback masking a contract

`check-schema.mjs` catches one thing: a missing `drizzle.__drizzle_migrations`
table, treated as "no migrations applied". That is not masking — it is the state
a first deployment is actually in, and it produces a refusal, not a pass.

An empty journal is explicitly **not** tolerated (`check-schema.mjs:47`): it
would make every comparison agree with an empty database, which is a check that
passes by measuring nothing.

## Contract consistency

The journal's `when` and `drizzle.__drizzle_migrations.created_at` are the same
value by construction (DL-5). Verified against a live database: journal
`1785213926369`, applied `created_at` `1785213926369`.

## Verdict

No violations.
