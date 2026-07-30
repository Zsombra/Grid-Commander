# Proposal: A Gate That Checks Its Database

## Why

`scripts/check-serving.sh` reported "serving ok" with PostgreSQL stopped.

Every route it probes resolves a session, finds none, and renders "Not
connected" — which needs no query. So all five returned 200 against a database
that was not running, and the gate whose whole job is proving a deployment
serves said it did.

The first person to discover otherwise would be a user who connected an account.

## What Changes

- **The gate runs `tools/check-schema.mjs` before probing.** Reachable *and*
  migrated, using the tool a deployment already runs as its release step. Before
  the routes rather than after, because the routes cannot tell you.
- **Caller-supplied variables now win over `.env.example`'s.** A pre-existing bug
  the new check surfaced on its first run — see below.

## What the new check found immediately

`.env.example` ships a **placeholder** `DATABASE_URL`
(`postgres://localhost:5432/grid_commander`, documenting the shape). The variable
loop preferred the example's value over the caller's, so a real `DATABASE_URL`
— CI's service container, or a developer's local database — was silently
overridden by the placeholder.

Nothing had ever noticed, because no probed route used the connection. The CI
`app` job has been passing a `DATABASE_URL` that the script discarded, and would
have started failing the moment the schema check landed.

The precedence is now caller → example → random. This does not weaken what the
script is for: the loop still iterates only the variables the *example* declares,
so one the application requires and the example omits is still never set and the
boot still fails.

## Capabilities

**None.** No product behaviour changes. `skip_specs: true`.

## Out of Scope

- **Proving a route can query.** Every route needs a session to reach the
  repositories, and minting one means signing a cookie — which couples a shell
  script to a domain detail, or wants a small Node helper. Filed as
  `no-route-exercises-the-database` (P2), with the residual risk stated: a
  database reachable and migrated but whose queries fail through Drizzle's pool
  where they succeed through `pg`.
- **A health endpoint.** Still `no-health-endpoint` (P3).
