---
id: the-docker-stack-is-untracked
title: The whole product runs on Docker but the compose file that does it is untracked
type: debt
status: done
priority: p2
created: 2026-08-17
updated: 2026-08-17
change: ""
capability: app-access
github: "346"
blocked_by: []
tags: [docker, deployment, infrastructure, postgres, rig]
---

# The compose file that runs the product is not in the repository

## What

On 2026-08-17 the entire product was moved onto Docker to build a rig for task 7.2
of `the-port-knows-what-costs-money`: `postgres:18` plus a one-shot `migrate` plus
the app, on a user-defined network. It works, and the app was served from it for the
live accept that closed section 7.

**The compose file that does this is untracked.** It exists only in the worktree
`.claude/worktrees/github-issues-triage-169fc7/docker-compose.yml`. The repository
carries a `Dockerfile` and a `docker-entrypoint.sh` with a `migrate`/`serve` split
built exactly for this, and nothing that composes them.

It was deliberately not committed onto #340's branch: deployment infrastructure is a
different concern from the port's classification, and the production gate recorded it
as a note rather than a violation for that reason.

## Why it matters

Three defects were found and fixed *in that file*, and all three are the kind that
cost an afternoon each. If it is lost, they are rediscovered:

1. **`postgres:18` moved `PGDATA` to `/var/lib/postgresql/18/docker`.** Mounting the
   old `/var/lib/postgresql/data` looks correct, mounts cleanly, and silently writes
   the database into the container layer where the first recreate destroys it. The
   volume must be mounted at the **parent**.
2. **A native PostgreSQL 18 service and Docker both bound port 5432.** `localhost:5432`
   resolved to whichever answered, which is why the app authenticated during its
   schema check and then failed on its runtime pool. The compose file publishes
   **5433** so 5432 means native and 5433 means the product, permanently.
3. **The two containers were on the default bridge, which does no DNS between
   containers** — the reason the previous hand-rolled run reached for
   `host.docker.internal` and landed on the native server instead of its sibling.

## Evidence

- `Dockerfile` — three stages, `ENTRYPOINT ["./docker-entrypoint.sh"]`, `CMD ["serve"]`
- `docker-entrypoint.sh` — `migrate` and `serve` kept separate precisely so a release
  step can run the migration once instead of N replicas racing on one journal
- `tools/check-schema.mjs` — refuses to serve against a schema missing any migration
  the build carries. This is what caught that the pre-existing image was 18 days old
  and two migrations behind
- `plan/production-gate.md` note 1, and DE-10 of the same change

## What would settle it

A `lite` change that commits `docker-compose.yml` with its three comments intact,
plus a `.env.example` note on `POSTGRES_*`. No behaviour change, no spec delta.

## Notes

The `Dockerfile` already states the intended commands in its header comment. This
item is only about the missing compose file, not about redesigning any of it.

## Resolved — 2026-08-17

Landed as the `lite` change `the-stack-runs-from-one-command`. `docker-compose.yml` is
tracked at the repository root with all three defect comments intact, and
`.env.example` documents the `POSTGRES_*` variables it reads plus the
two-`DATABASE_URL` trap that once pointed the app at the wrong server.

Verified rather than assumed: `docker compose config` valid; the volume mount is an
**ancestor** of the image's own `PGDATA` (`/var/lib/postgresql` vs
`/var/lib/postgresql/18/docker`), with `PG_VERSION 18` read back off the volume; and
`compose ps` confirms the running stack is the one this file declares.

**Still out of scope**: running the recorder as a compose service. The runtime image
copies `.next/standalone`, `drizzle` and two `tools/` scripts — not `bin/` — so that
needs a `Dockerfile` change. See [[the-consolidated-database-diverges-from-native]].
