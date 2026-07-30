# Decision Log: Ship A Deployable Image

| # | Decision | Rationale | Recorded |
|---|---|---|---|
| DL-1 | Docker image rather than a platform target | User selected it: runs anywhere, no lock-in, and a platform file is thin on top | proposal |
| DL-2 | `migrate` and `serve` as separate operations | N replicas migrating on boot race on one journal | design |
| DL-3 | The gate refuses, and accepts losing zero-downtime deploys | A skipped migration must fail the deploy, not a user's request an hour later | design |
| DL-4 | A database ahead of the build serves, with a warning | Refusing would turn a rollback into an outage | design |
| DL-5 | Compare `when` against `created_at`, not hashes | Drizzle sets one from the other; rehashing is a second implementation | design |
| DL-6 | Copy `drizzle-orm` rather than reinstall or reimplement | Bundled not traced, zero runtime deps, and drizzle owns what "applied" means | design |
| DL-7 | `openspec/design/system.json` stays in the build context | `prebuild` reads it; excluding it broke the build only inside the image | design |
| DL-8 | The image is not built here, and this is filed rather than hidden | No daemon in the environment; `image-never-built` (P1) states exactly what is unproven | executor |

## Executor phase

Built in this order, largest risk first: standalone output → the gate → the
migrator → the Dockerfile → verification.

**`output: 'standalone'` was the first risk and it worked**, including with this
project's webpack `extensionAlias` for `.js` → `.ts` specifiers.

**`drizzle-orm` turned out not to be traced.** Discovered by checking
`.next/standalone/node_modules` rather than assuming — webpack bundles it into
the server chunks, so it is present in the server and absent as a module. That
changed the Dockerfile (DL-6).

**Verification without a daemon** took three forms, each proving something the
others do not: the runtime `COPY` list assembled by hand and exercised end to end
(refuse → migrate → serve → six routes answering); `next build` run from a tree
pruned exactly as `.dockerignore` prunes it; and 23 re-injected defects across
the instructions and the gate.

**The pruned-tree build caught a real defect** — excluding all of `openspec/`
removed the design tokens `prebuild` reads, which would have failed only inside
the image.

## Audit phase

See `production-gate.md`.
