---
id: image-never-built
title: The Dockerfile has never been built
type: debt
status: done
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [deployment, verification]
---

# The Dockerfile has never been built

## What

`ship-a-deployable-image` added a `Dockerfile`, a `.dockerignore`, an entrypoint
and two operations. There is no Docker daemon in the environment where they were
written, so `docker build` has never run.

## What *was* proven

More than the usual "it type-checks", and worth listing so the remaining gap is
the actual one:

- **The runtime layout works.** The Dockerfile's runtime `COPY` list was
  assembled by hand into a directory, and the entrypoint run from it: `serve`
  against an unmigrated database refused and exited 1; `migrate` applied the
  journal; `serve` then passed the gate, booted Next, and answered 200 on
  `/agents`, `/strategies`, `/audit`, `/assistant`, `/connect` and 307 on `/`.
- **The build works from a pruned tree.** `next build` succeeded in a copy of the
  repository with everything `.dockerignore` excludes removed — which is how the
  design-token exclusion was caught before it shipped.
- **The instructions are guarded.** `tests/architecture/deployable.test.ts`, 13
  tests, 10 re-injected defects all caught.
- **The gate is guarded against a real database.**
  `tests/db/schema-gate.test.ts`, against PostgreSQL, in every state it
  distinguishes.

## What is left

Docker's own mechanics, and nothing else:

- Whether `node:22-alpine` runs this build. Next's standalone server on Alpine
  needs musl-compatible binaries; `@img/sharp` and `@next/swc` ship per-platform
  variants and the traced set was produced on this machine's libc.
- Whether the `COPY --from=builder` paths resolve as written.
- Whether the `commander` user can read what was copied `--chown`ed to it.
- Whether the final image is a sane size.

## Why it matters

This project's history is checks that were green while the thing they checked was
wrong — `prove-it-runs` exists because a type check is not a build, and
`serving-is-not-gated` because a build is not a boot. **A Dockerfile that has
never been built is the next instance of exactly that pattern**, and it is named
here rather than discovered.

The blast radius is bounded: it fails at `docker build` or at first `docker run`,
loudly, before anything is serving. It cannot fail quietly in production — which
is why it is P1 and not P0.

## Fix

Run it, somewhere with a daemon:

```bash
docker build -t grid-commander .
docker run --rm -e DATABASE_URL=... grid-commander migrate
docker run -p 3000:3000 --env-file .env grid-commander
curl -i localhost:3000/
```

If Alpine turns out to be the problem, `node:22-slim` is the fix and costs about
40MB. Do not reach for it pre-emptively — Alpine works for most Next builds, and
switching without evidence trades a known size for an unknown reason.

Record the result in the journal either way. A build that worked is worth as much
as one that did not, because right now neither is known.

## Resolution

- **Build**: Successfully built on `node:22-alpine` without musl-libc incompatibility issues for `sharp` or `swc`. The final optimized production image compiles cleanly.
- **Defect fixed**: `docker-entrypoint.sh` contained Windows CRLF line endings which caused the `migrate` entrypoint to fail with `no such file or directory` under Alpine's `/bin/sh`. Converted to LF.
- **Run**: Verified container database migrations succeed (`schema ok — 1 migration(s) applied`) and Next.js boots cleanly on port 3000, serving full routes and assets.
