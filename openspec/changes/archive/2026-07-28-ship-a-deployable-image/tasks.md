# Tasks: Ship A Deployable Image

## The build

- [x] `output: 'standalone'` in `next.config.ts` — traced deps only
- [x] Multi-stage `Dockerfile`: deps → builder → runner
- [x] Runtime stage carries no toolchain, no source, no secret
- [x] Runs as a non-root user
- [x] `.dockerignore` excluding `.env`, `.git`, `node_modules`, `.next`

## The two operations

- [x] `tools/check-schema.mjs` — compares the committed journal against
      `drizzle.__drizzle_migrations`, using `pg` and nothing else
- [x] `tools/migrate.mjs` — drizzle's own migrator, not a runner written here
- [x] `docker-entrypoint.sh` dispatching `migrate` / `serve`, defaulting to serve
- [x] `serve` runs the gate first and does not serve if it fails
- [x] `migrate` does not also serve — one release step, not one per replica
- [x] An unrecognised command exits 2

## Guards

- [x] `tests/db/schema-gate.test.ts` — the gate against a real PostgreSQL in
      every state it distinguishes: never migrated, migrated, migrated twice,
      ahead of the build, unreachable, and no `DATABASE_URL`
- [x] `tests/architecture/deployable.test.ts` — 13 tests on the instructions
      themselves
- [x] Re-inject each defect and watch the guard fail — 10 injected on the
      deployment artifacts, 10 caught

## Verification without a Docker daemon

- [x] Assemble the Dockerfile's runtime `COPY` list by hand and run the
      entrypoint from it: `serve` refused an unmigrated database and exited 1;
      `migrate` applied the journal; `serve` then booted Next and answered on
      `/`, `/agents`, `/strategies`, `/audit`, `/assistant`, `/connect`
- [x] `next build` from a tree pruned exactly as `.dockerignore` prunes it —
      **this caught a real defect**, see below
- [x] File what remains unproven rather than implying it was checked

## Documentation

- [x] `docs/DEPLOYING.md` — the out-of-band steps, chiefly registering
      `BATTLEGRID_REDIRECT_URI` at BattleGrid before a new hostname can complete
      one connection
- [x] Say plainly that the image has never been built, and where that is tracked

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run test:db` — 60 passing, up from 51
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh`

## What building it found

**Excluding all of `openspec/` broke the build inside the image only.**
`prebuild` regenerates `app/tokens.css` from `openspec/design/system.json`, so
the design tokens are an *input to the build*, not documentation. It succeeded
everywhere else, and would have failed on the first `docker build`. Caught by
building from a pruned tree; now guarded.

**`drizzle-orm` is not traced into the standalone output.** Webpack bundles it
into the server chunks, so it is present in the server and absent as a module —
and `tools/migrate.mjs` is a separate process that must import it. Found by
checking `.next/standalone/node_modules` rather than assuming. Dropping that
`COPY` breaks `migrate` only, so serving still works and nothing notices until a
deploy needs it; that mutation is now caught.

**The test helper dropped stderr.** The ahead-of-this-build warning goes to
stderr, `execFileSync` returns stdout only, and the test reported the warning
missing when it had been printed. Switched to `spawnSync`.

## Not done

**The image has never been built** — no Docker daemon in this environment. The
instructions are guarded and the runtime layout is proven; Docker's own mechanics
are not. Owned by `image-never-built` (P1), which states exactly what is left and
what to do about it, rather than restated here.
