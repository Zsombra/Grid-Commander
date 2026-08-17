---
id: image-never-built
title: The Dockerfile has never been built
type: debt
status: done
priority: p1
created: 2026-07-28
updated: 2026-08-10
change: ""
capability: app-access
github: "89"
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

## Attempted 2026-08-05: a daemon is not enough

Tried in an environment that **does** have Docker — client and daemon both,
29.3.1, `dockerd` starts clean. The build still cannot run, and the reason is
narrower and more useful than "no daemon":

```
FROM node:22-alpine AS deps
  → failed to resolve source metadata for docker.io/library/node:22-alpine:
    Get "https://production.cloudfront.docker.com/registry-v2/…": Forbidden
```

The agent proxy confirms it as a policy denial rather than a transient failure:

```
recentRelayFailures: [{
  kind: "connect_rejected",
  detail: "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  host: "production.cloudfront.docker.com:443"
}]
```

`registry-1.docker.io/v2/` itself answers 401 — the normal unauthenticated
reply — so **manifests resolve and blobs do not**. Docker Hub serves layer
blobs from that CDN, so every pull fails at the first `FROM` regardless of the
image, and no images are cached locally. Not worked around: circumventing the
environment's egress policy is not a fix.

**So the requirement is sharper than "somewhere with a daemon".** It needs an
environment whose egress allows `production.cloudfront.docker.com` (or a
mirror), or one with `node:22-alpine` already in its image cache. A session with
Docker but the default network policy gets exactly this far and no further —
worth knowing before spending the setup time again.

Everything below still stands: what was proven, what is left, and why it is P1.

## Fix

Run it, somewhere with a daemon **and registry egress**:

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

## Resolved 2026-08-10 — built, run, and proven

The blocker was never the Dockerfile. Built on the first attempt that could
reach a registry.

- **Defect fixed**: `docker-entrypoint.sh` contained Windows CRLF line endings which caused the `migrate` entrypoint to fail with `no such file or directory` under Alpine's `/bin/sh`. Converted to LF.
- **Built**: 355MB, `node:22-alpine`, from `mirror.gcr.io` (the Docker Hub CDN
  is still policy-blocked; the mirror is not — the issue anticipated exactly
  this out). No issues with musl-libc incompatibility for `sharp` or `swc`.
- **Alpine runs it**: the standalone server boots in 374ms on musl.
- **The gate holds in the real image**: serve against an unmigrated database
  refuses with exit 1 and the documented message; `migrate` applies the
  journal; serve then boots.
- **It serves**: `/` 307 → `/connect`; `/agents` `/strategies` `/audit`
  `/connect` `/pending` all 200 — the same answers the 2026-08-05
  hand-assembled layout gave, now from the image itself.
- **`commander` owns its process**: `whoami` inside the container answers
  `commander`, and it can read everything copied `--chown`ed to it.

The sandbox-specific build recipe (mirror pull + `--network=host` + explicit
proxy build-args, because this docker CLI does not auto-forward proxy env into
BuildKit) is recorded in #89's closing comment and the journal — it is
environment lore, not repository configuration, which is why nothing in the
repo changed (other than the CRLF fix).
