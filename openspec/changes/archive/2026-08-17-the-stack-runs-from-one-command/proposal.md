# The stack runs from one command

Issue: **#346** · backlog: `the-docker-stack-is-untracked` · track **lite**

## Why

The repository already carries everything needed to run this product in containers —
a three-stage `Dockerfile`, a `docker-entrypoint.sh` that keeps `migrate` and `serve`
deliberately separate, and `tools/check-schema.mjs` refusing to serve an unmigrated
schema. It carries nothing that **composes** them.

On 2026-08-17 the whole product was moved onto Docker to build the rig for task 7.2
of `the-port-knows-what-costs-money`, and the accept that closed section 7 was made
through that stack. The compose file that did it stayed untracked, so the next person
starts from the same three defects — each of which cost an afternoon:

1. **`postgres:18` moved `PGDATA`** to `/var/lib/postgresql/18/docker`. Mounting the
   familiar `/var/lib/postgresql/data` looks correct, mounts cleanly, and silently
   writes the database into the container layer, where the first recreate destroys it.
2. **A native PostgreSQL 18 service and Docker both bound 5432.** `localhost:5432`
   resolved to whichever answered, which is why the app authenticated during its
   schema check and then failed on its runtime pool with
   `password authentication failed`.
3. **Both containers sat on the default bridge, which does no DNS between
   containers** — the reason a hand-rolled run reached for `host.docker.internal` and
   landed on the native server instead of its sibling.

None of these is discoverable from a stack trace. All three are one comment each.

## What changes

- **`docker-compose.yml`** at the repository root: `postgres:18`, a one-shot `migrate`
  service, and `app`, on a user-defined network, with the database published on
  **5433** so 5432 unambiguously means native.
- **`.env.example`** gains the three `POSTGRES_*` variables the compose file reads.
  Without them `docker compose up` fails on a required-variable error that names the
  variable but not where it belongs.

## What does not change

No production code, no schema, no behaviour. `next.config.ts`, the `Dockerfile` and
the entrypoint are untouched — the compose file only wires up what they already do.
`skip_specs: true` because nothing the specs describe is affected.

## Deliberately out of scope

- **Running the recorder as a compose service.** The runtime image copies
  `.next/standalone`, `drizzle`, and two `tools/` scripts — not `bin/`. Adding the
  recorder means changing what the image contains, which is a bigger change than this
  one and belongs with `#347`'s follow-up.
- **Retiring the native PostgreSQL.** It still holds the pre-consolidation copy and is
  the fallback if anything about the move proves wrong.
