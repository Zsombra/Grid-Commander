# Tasks: A Gate That Checks Its Database

## The check

- [x] `check-serving.sh` runs `tools/check-schema.mjs` before probing routes
- [x] Before rather than after — the routes answer 200 either way, so they
      cannot be the thing that reports it
- [x] The failure message says why the routes would still have passed, so the
      next reader does not conclude the probe is broken

## The bug it surfaced

- [x] Caller-supplied variables now win over `.env.example`'s values.
      `.env.example` ships a placeholder `DATABASE_URL`, and the loop preferred
      it — silently discarding CI's real one and any developer's. Nothing had
      noticed because no probed route used the connection.
- [x] Confirm this does not weaken the script's purpose: the loop still iterates
      only variables the *example* declares, so an undocumented one is still
      never set and the boot still fails

## Proven in three directions

- [x] Reachable and migrated → exit 0, reports `schema ok — 1 migration(s) applied`
- [x] Reachable, not migrated → exit 1
- [x] Unreachable → exit 1

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh`

## Not done

**No route is probed as an authenticated user**, so nothing proves a *query*
works — only that the database is reachable and migrated. `check-schema.mjs`
connects with `pg` directly and the application connects through Drizzle's pool:
two paths to the same database, one exercised. Owned by
`no-route-exercises-the-database` (P2), which states the residual risk and what
minting a session would cost.
