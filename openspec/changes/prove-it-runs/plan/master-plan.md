# Prove It Runs — Implementation Plan (Master Handoff Document)

## Status

- Change ID: `prove-it-runs`
- Change folder: `openspec/changes/prove-it-runs/`
- Track: `full`
- Current phase: `Ready for Production Gate`
- Base ref for diffs: `origin/main`
- Evidence base: `7f4cea3` (the proposal commit; execution starts from here)
- Last updated: `2026-07-28`

## Objective

Make the application build and serve, give it a schema created by a committed
migration, and put a gate behind each so neither can quietly stop being true.
Fix the two defects that only appeared once the thing was run.

## Requirement Coverage Matrix

| Requirement | Capability | Delta op | Implementing file(s) | Scenario → verification |
|---|---|---|---|---|
| The Application Builds Into A Servable Artifact | `app-access` | ADDED | `app/layout.tsx` (create), `next.config.ts` (modify), `tsconfig.json` (modify), `.github/workflows/validate.yml` (modify) | The production build → task 6.1, `npm run build` route table<br>A route that cannot be assembled → task 2.2, delete-layout-and-rebuild<br>A type check is not a build → task 2.2, typecheck passes while build fails<br>Serving a capability page without a connection → task 6.2, served-app probe |
| The Schema Is Created By A Committed Migration | `app-access` | ADDED | `drizzle/migrations/0000_*.sql` (create), `drizzle/migrations/meta/**` (create), `src/infrastructure/db/schema/index.ts` (modify) | A fresh database → task 6.3, apply to empty DB then run `test:db`<br>The schema is changed without a migration → task 6.4, re-run `db:generate`, expect no second migration |
| Stored-Data Behaviour Is Proven Against A Real Database | `app-access` | ADDED | `tests/db/support.ts` (create), `tests/db/*.test.ts` (create), `vitest.db.config.ts` (create), `package.json` (modify), `.github/workflows/validate.yml` (modify) | Single-use tokens → `tests/db/confirmations.test.ts`, `tests/db/oauth-transactions.test.ts`<br>Two requests presenting one token at the same instant → `tests/db/confirmations.test.ts`<br>Uniqueness the code relies on → `tests/db/audit.test.ts`<br>A guarantee the fake cannot show → task 6.6, `test:db` errors without a database |
| Every Capability Is Reachable | `app-access` | MODIFIED | `app/layout.tsx` (create), `next.config.ts` (modify) | Connecting and disconnecting → existing, unchanged<br>Reading the record of what was done → existing, unchanged<br>Authoring agents → existing, unchanged<br>Reachable in a served build → task 6.2, route table + served probe |
| The Connection Is The Identity | `battlegrid-connection` | MODIFIED | `src/infrastructure/db/repositories/drizzle-connection-repository.ts` (modify) | Returning user → `tests/db/connections.test.ts`<br>A connection is removed → existing unit coverage, plus `tests/db/connections.test.ts`<br>One authorization completed twice at once → `tests/db/connections.test.ts` (task 5.7), mutation-checked by task 6.5 |

Out of scope (from the proposal — do not implement):
- Applying the migration to any deployed environment
- The three partial surfaces (`agent-edit-form`, `strategy-section-editor`, `assistant-conversation-history`)
- Styling, design tokens, any visual design in the root layout
- Wiring a model behind the assistant
- Migration tooling beyond the first migration — no runner, no deploy hook, no rollback
- Turbopack

## Non-Negotiable Constraints

From `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` Quick Reference Card:

- **Dependencies** — domain interfaces and ports only; never import infrastructure in a use case
- **BattleGrid** — always through `BattleGridPort`; the MCP client exists only at the composition root
- **Scope** — never a safety signal; classify the tool
- **Unknown tools** — fail closed
- **Audit** — written before the attempt, updated with the outcome
- **Concurrency** — `expectedRevision` always; surface conflicts, never retry
- **Logging** — structured, contextual, and never a token
- **Queries** — Drizzle builder only, always scoped by `userId`
- **Quality gate** — typecheck and lint pass before every commit

**Quality gate commands, as this repository actually runs them:**

```bash
npm run typecheck
npm run lint
npm test
npm run build          # added by this change
npm run test:db        # added by this change; requires a database
python3 .claude/tools/openspec.py validate --all
```

The checklist writes these as `pnpm`. The repository has no pnpm lockfile and CI
uses `npm ci`. Executor runs npm; the checklist drift is filed (DL-006), not
fixed here.

**Constraints this change adds, and the auditor should hold it to:**

- The root layout is **structural only**. No colours, no spacing values, no
  fonts, no design tokens. Design is the `/surface` → `/design` handoff, and a
  layout that quietly establishes a visual language pre-empts it.
- `app/layout.tsx` must not import from `src/` — the route-boundary rule that
  already moved `audit-list.tsx` out of `app/` in `wire-the-app`.
- The generated migration is committed **unedited**. A hand-touched migration is
  no longer the thing `db:generate` will produce, and the drift is undetectable.
- The database suite has **no skip path**.

## Architectural Boundaries (Design Slice)

- Packages/apps touched: single package — `app/`, `src/infrastructure/db/`, `tests/`, `drizzle/`, `.github/workflows/`
- Layers touched (from the architecture checklist Layer Overview):
  - **Presentation** — `app/layout.tsx` only; no route or component logic changes
  - **Infrastructure / Repositories** — `drizzle-connection-repository.ts`
  - **Infrastructure / Schema** — `schema/index.ts`
  - **Build & CI** — `next.config.ts`, `tsconfig.json`, `package.json`, workflow
  - **Domain, Application, Ports** — *untouched*. If the executor finds itself
    editing a use case, the plan is wrong; stop and say so.
- Contracts impacted: none. No port signature, DTO, or domain type changes.
  `DrizzleConnectionRepository.upsert` keeps its signature — what changes is
  which id it uses internally and returns.

## File & Responsibility Inventory (SOLID)

### Component / Module Hierarchy (Touched)

```text
Grid-Commander/
  app/
    layout.tsx                                    (create)
  drizzle/
    migrations/
      0000_<generated>.sql                        (create)
      meta/_journal.json, meta/0000_snapshot.json (create)
  src/infrastructure/db/
    schema/index.ts                               (modify)
    repositories/drizzle-connection-repository.ts (modify)
  tests/db/
    support.ts                                    (create)
    connections.test.ts                           (create)
    oauth-transactions.test.ts                    (create)
    audit.test.ts                                 (create)
    confirmations.test.ts                         (create)
  next.config.ts                                  (modify)
  tsconfig.json                                   (modify)
  vitest.db.config.ts                             (create)
  package.json                                    (modify)
  .github/workflows/validate.yml                  (modify)
```

### Inventory Table

| File | Action | Layer/Area | Responsibility (SRP) | Notes |
|------|--------|------------|-----------------------|-------|
| `app/layout.tsx` | create | Presentation | The document shell App Router requires | No imports from `src/`. No styling. |
| `next.config.ts` | modify | Build | Teach webpack the `.js` → `.ts` mapping `tsc` already applies | Webpack only; Turbopack unproven and filed |
| `tsconfig.json` | modify | Build | Hold the edit `next build` writes, so the build is idempotent | `allowJs`, plus Next's reformatting |
| `src/infrastructure/db/schema/index.ts` | modify | Schema | Drop `confirmation_tokens.actor`; correct the `audit_entries.actor` comment | Must land **before** `db:generate` |
| `drizzle/migrations/**` | create | Database | Create the schema from empty | Generated, committed unedited |
| `src/infrastructure/db/repositories/drizzle-connection-repository.ts` | modify | Repository | Resolve the identity for a subject from the returned row | Signature unchanged; DIP unaffected |
| `tests/db/support.ts` | create | Test infrastructure | Connect, truncate, and refuse to run unconfigured | The no-skip rule lives here |
| `tests/db/*.test.ts` | create | Test | One file per repository | |
| `vitest.db.config.ts` | create | Test infrastructure | The database suite, excluded from `npm test` | |
| `package.json` | modify | Build | `test:db` | |
| `.github/workflows/validate.yml` | modify | CI | Build gate; Postgres service; `test:db` step | Four named steps, not one |

## Dependency / Call-Tree Sketch

```text
next build
  -> app/layout.tsx  (root shell)
  -> app/**/page.tsx -> src/presentation/*  [resolved via extensionAlias]
       -> src/composition.ts -> loadConfig() -> Pool(DATABASE_URL)

npm run test:db
  -> vitest.db.config.ts -> tests/db/*.test.ts
       -> tests/db/support.ts   -> Pool -> PostgreSQL
       -> Drizzle{Connection,Transaction,Audit,Confirmation}* repositories
            -> src/infrastructure/db/schema/index.ts
                 ~ must agree with ~
            -> drizzle/migrations/0000_*.sql
```

The last edge is the one this change exists to make real. Today the schema
module and the repositories agree because both are TypeScript; nothing has ever
checked either against SQL.

## DATA_PIPELINE_REVIEW_CHECKLIST Coverage

- Checklist source: `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`
- Source-of-truth statement: BattleGrid owns agents, strategies and positions.
  This change touches only the layers where **Grid-Commander's own** data lives —
  connections, OAuth transactions, audit entries, confirmations. No BattleGrid
  data is stored, cached, or recomputed here.
- Contract map status: `N/A (No contract changes)`

### Layer Coverage Matrix

| Layer | Touched | What must hold | Where checked |
|---|:--:|---|---|
| 0 — BattleGrid | ✗ | Nothing in this change reads or writes BattleGrid | Architecture review |
| 1 — Database | ✓ | New data has a migration; column types match application types; NOT NULL unless genuinely optional; no computed columns; every user-owned table has a `userId` column and an index on it | `data-review.md`, tasks 3.3–3.4 |
| 2 — Schema Definitions | ✓ | Table definitions mirror the columns exactly; no invented fields | Task 3.1 removes the one invented field |
| 3 — Queries | ✓ | Drizzle builder only; filtered by `userId` where rows are user-owned | Task 4.1 keeps the builder; `tests/db/**` exercise it |
| 4 — Mappers | ✓ | Shape conversion only; no fallback masking missing data; nullable maps to nullable | `toDomain` unchanged; re-checked against real rows |
| 5 — Use Case | ✗ | Untouched | — |
| 6 — Route handlers | ✗ | Untouched | — |
| 7 — Client state | ✗ | None exists | — |
| 8 — Client components | ✗ | The root layout renders `children` and nothing else | UI review |
| 9 — Pipeline completeness | ✓ | The pipeline now terminates in a real database rather than a type | `tests/db/**` |

**Layer 1 check 5 — the one exception, stated rather than hidden.**
`oauth_transactions` has no `user_id` column and no index on one. This is
correct: the row exists *before* an identity does, and `state` is both the
primary key and the only key it is ever looked up by. Recorded as DL-005 so the
auditor sees a justified exception rather than a missed check.

## ARCHITECTURE_REVIEW_CHECKLIST Coverage

- Checklist source: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`

| Rule area | Applies | What must hold here |
|---|:--:|---|
| Use Case review | ✗ | No use case is touched |
| Repository — CQRS separation | ✓ | `upsert` is a writer and must keep returning an identifier, never an aggregate |
| Repository — mapper pattern | ✓ | `toDomain` gains no default; the real-database tests are the first check of it against real rows |
| Repository — query safety | ✓ | Drizzle builder only; no raw SQL, no interpolation. `tests/db/support.ts` may use `pool.query` for truncation — test infrastructure, not a query path, and it takes no user input |
| Infrastructure adapter | ✗ | No adapter touched |
| DI wiring / composition root | ✓ | `composition.ts` is untouched; the build must still reach BattleGrid only through it |
| P1 Scope is not a safety boundary | — | Unaffected |
| P2 Capabilities discovered at runtime | — | Unaffected |
| P3 Every write is audited | ✓ | The audit repository's behaviour is now proven against a real database rather than a fake |
| P4 Optimistic concurrency surfaced | — | Unaffected |
| P5 Compile is free of effect | — | Unaffected; the structural test still runs under `npm test` |
| P6 One way in | ✓ | Must still hold after the build changes; the structural test covers it |

**Anti-pattern watch, specific to this change:**

- *Silent default* — the migration must not introduce a column default that
  erases "absent". The two `actor` defaults are the only ones; one is being
  removed and the other is load-bearing and already written on every insert.
- *Swallowed errors* — the identity fix must not become a `catch` around the
  foreign-key violation. Design decision 3 rejects that explicitly.
- *Dual paths* — no "if a database is configured" branch anywhere. The database
  suite requires one; the unit suite does not run it.

## UI_COMPONENT_REVIEW_CHECKLIST Coverage

- Checklist source: `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`
- Scope: **one file**, `app/layout.tsx`.

| Rule area | Applies | What must hold |
|---|:--:|---|
| Component structure | ✓ | Server component, no `'use client'`, no data fetching, renders `children` |
| Hooks / store design | ✗ | None |
| shadcn/ui, Tailwind | ✗ | Neither is installed; none is introduced here |
| Consequence & confirmation | ✗ | The layout has no actions |
| Accessibility & semantics | ✓ | `<html lang="en">`, a `<title>` via `metadata`, and a landmark for page content |
| Responsive layout | ✓ | Nothing fixed-width; the layout must not constrain what routes render |
| State & interaction | ✗ | None |

This is deliberately the smallest possible layout. Every visual decision it does
not make is one the design agent still gets to make.

## Phase-by-Phase Tasks

Task numbering matches `tasks.md`. Groups 1–5 are implementation; 6 is
verification.

### Phase 1 — Make the application build (tasks 1.1–1.4)

| Task | File | Action | Specific change | Notes |
|---|---|---|---|---|
| 1.1 | `app/layout.tsx` | create | `metadata` export; `html[lang=en]` → `body` → `children` | Build fails on the *first route file* without this, so it must land first or nothing else can be observed |
| 1.2 | `next.config.ts` | modify | Add `webpack` fn setting `resolve.extensionAlias` for `.js`/`.jsx` | Do not remove `serverExternalPackages` |
| 1.3 | `tsconfig.json` | modify | Apply Next's edit | Verify by building twice: the second build must leave the tree clean |
| 1.4 | — | verify | `npm run build` | Expect 14 routes; `/connect` and `/_not-found` static, the rest dynamic |

**Failure mode to expect:** the build emits an ESLint warning that the Next
plugin is not in the flat config. That is pre-existing, out of scope, and must
not be silenced by loosening lint.

### Phase 2 — Put the gate behind it (tasks 2.1–2.2)

| Task | File | Action | Specific change | Notes |
|---|---|---|---|---|
| 2.1 | `.github/workflows/validate.yml` | modify | A fourth step, `Build`, in the `app` job, after Test | Needs the env `loadConfig` requires — build-time placeholders only, never a real credential |
| 2.2 | — | verify | Delete `app/layout.tsx`, run typecheck then build | Typecheck must pass and build must fail. **This is the evidence that the new gate covers the defect it was added for** — record both outputs in `architecture-review.md` |

**The point of 2.2.** This project has now twice added a guard that did not
cover the case it was written for. The cheapest defence is to re-inject the
defect and watch the guard fail.

### Phase 3 — The schema (tasks 3.1–3.4)

| Task | File | Action | Specific change | Notes |
|---|---|---|---|---|
| 3.1 | `schema/index.ts` | modify | Delete the `actor` column from `confirmationTokens` and its comment | **Ordering is load-bearing**: after 3.3 this costs a second migration |
| 3.2 | `schema/index.ts` | modify | Rewrite the `audit_entries.actor` comment | It describes a backfill of a table that has never existed |
| 3.3 | `drizzle/migrations/**` | create | `npm run db:generate`, commit unedited | Includes `meta/_journal.json` and the snapshot — without them `db:generate` will produce a second full migration |
| 3.4 | — | verify | Drop and recreate the database, apply the committed SQL | Confirm 5 tables, 5 indexes, 1 FK |

### Phase 4 — The identity race (tasks 4.1–4.2)

| Task | File | Action | Specific change | Code region | Notes |
|---|---|---|---|---|---|
| 4.1 | `drizzle-connection-repository.ts` | modify | `insert(users)…onConflictDoUpdate({ target: users.battlegridSubject, set: { battlegridSubject } }).returning({ id: users.id })`; use the returned id for the connection insert | `upsert`, ~line 49 | `DO UPDATE` rather than `DO NOTHING` because `DO NOTHING` returns no row on conflict — the returning clause would be empty and the fix would not work |
| 4.2 | `drizzle-connection-repository.ts` | modify | Use the resolved id for `connections.userId` and its conflict target | same method | The proposed id is discarded when it loses |

**Invariant:** after this, one `battlegrid_subject` has exactly one row in
`users`, and every `connections.user_id` references a row that exists. Both are
asserted in 5.7 rather than assumed.

**What must not happen:** a `try/catch` on the foreign-key violation, a retry
loop, or an advisory lock. All three are rejected in `design.md` decision 3.

### Phase 5 — Prove it against a real database (tasks 5.1–5.8)

| Task | File | Action | Specific change | Notes |
|---|---|---|---|---|
| 5.1 | `tests/db/support.ts` | create | Pool from `DATABASE_URL`; `truncate … cascade` between tests; **throw** when unset | The throw is the requirement, not a convenience |
| 5.2 | `vitest.db.config.ts`, `package.json` | create/modify | `include: ['tests/db/**']`; `test:db` script; ensure the default config excludes `tests/db/**` | The default `include` is `tests/**/*.test.ts` — it **will** pick these up unless excluded, and then `npm test` fails without a database |
| 5.3 | `tests/db/connections.test.ts` | create | Round-trip, upsert idempotence, revoked-no-refresh, `text[]` incl. empty | |
| 5.4 | `tests/db/oauth-transactions.test.ts` | create | Single-use, expiry, sweep | |
| 5.5 | `tests/db/audit.test.ts` | create | begin/complete; many null idempotency keys; duplicate key rejected; newest-first | |
| 5.6 | `tests/db/confirmations.test.ts` | create | Single-use; (tool, target) binding; expiry; two concurrent consumes, exactly one wins | The concurrent case is the one the fake cannot show |
| 5.7 | `tests/db/connections.test.ts` | create | Two concurrent first-time upserts for one subject | The F-4 regression test |
| 5.8 | `.github/workflows/validate.yml` | modify | `services: postgres:16`, health-checked; a `Database tests` step with `DATABASE_URL` | Job-level service, step-level env |

**Trap in 5.2.** `vitest.config.ts` currently includes `tests/**/*.test.ts`.
Adding files under `tests/db/` without excluding them makes `npm test` require
PostgreSQL on every developer machine. Exclude, then confirm `npm test` still
passes with the database stopped.

### Phase 6 — Verification (tasks 6.1–6.7)

Each row is a requirement's evidence. The verifier and auditor read this table.

| Task | Proves | How |
|---|---|---|
| 6.1 | The Application Builds Into A Servable Artifact — scenario 1 | `npm run build`; capture the route table |
| 6.2 | Same, scenario 4; Every Capability Is Reachable, scenario 4 | Serve the build; request `/connect`, `/agents`, `/audit`, `/strategies`, `/assistant`; each 200 and each showing the not-connected outcome; confirm no BattleGrid call was attempted |
| 6.3 | The Schema Is Created By A Committed Migration — scenario 1 | Empty database, apply committed SQL, `npm run test:db` green |
| 6.4 | Same, scenario 2 | Re-run `db:generate`; no second migration file appears |
| 6.5 | The Connection Is The Identity — scenario 3 | Re-inject the untargeted `onConflictDoNothing`; 5.7 must fail; restore |
| 6.6 | Stored-Data Behaviour Is Proven — scenario 4 | `npm test` passes with the database stopped; `npm run test:db` **errors** rather than skipping |
| 6.7 | Quality gates | typecheck, lint, test, `openspec.py validate --all` |

**6.5 and 2.2 are the same technique** applied to the two new guards. Neither
guard is trusted until the defect it exists for has been put back and seen to
fail it.

## Phase 1 Review Checklist (Planner)

- [x] Every ADDED/MODIFIED requirement has a row in the coverage matrix
- [x] Every scenario names a verification
- [x] File inventory drafted before tasks
- [x] Constraints extracted from the architecture checklist rather than invented
- [x] Layer coverage matrix filled, with the one exception stated (DL-005)
- [x] UI scope is one file and its rules are named
- [x] Out-of-scope list copied from the proposal
- [x] Ordering hazards called out (3.1 before 3.3; 1.1 before everything)
- [x] Rejected implementations named so the executor does not rediscover them

## Phase 2 Execution Checklist (Executor)

- [ ] 1.1–1.4 build fixes; `npm run build` succeeds and lists 14 routes
- [ ] 2.1 CI build step added
- [ ] 2.2 **guard proven** — layout deleted, typecheck passed, build failed, both recorded
- [ ] 3.1–3.2 schema edits land *before* generation
- [ ] 3.3 migration generated and committed unedited, with `meta/`
- [ ] 3.4 applies to an empty database
- [ ] 4.1–4.2 identity resolved from the returned row; no catch, no retry, no lock
- [ ] 5.1–5.7 database suite written; no skip path
- [ ] 5.2 `npm test` still passes with no database
- [ ] 5.8 CI Postgres service and `test:db` step
- [ ] 6.1–6.7 all verification tasks run and recorded
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:db`
- [ ] `python3 .claude/tools/openspec.py validate --all`
- [ ] `data-review.md`, `architecture-review.md`, `uiux-review.md` filled with path-level evidence
- [ ] `decision-log.md` has an EXECUTION entry for every deviation
- [ ] Master plan final line set to `EXECUTION READY FOR PRODUCTION GATE`

## Phase 3 Production Gate Checklist (Auditor)

- [ ] Spec parity: all 5 requirements delivered and locatable at `file:line`
- [ ] Every scenario has a test or a named manual check
- [ ] MODIFIED requirements: new behaviour in effect **and** old behaviour gone
- [ ] No behaviour implemented that no requirement describes
- [ ] Nothing from the Out of Scope list was built
- [ ] Existing `app-access` and `battlegrid-connection` requirements still hold
- [ ] `rg "\?\?"` over touched paths — the recurring defect class in this project
- [ ] No `TODO|FIXME|HACK|XXX` in touched production paths
- [ ] No skip path in the database suite; no "if configured" branch anywhere
- [ ] The migration in the diff is byte-identical to what `db:generate` produces
- [ ] The root layout contains no colour, spacing, font, or token value
- [ ] `app/layout.tsx` imports nothing from `src/`
- [ ] Task 2.2 and 6.5 evidence present — both new guards demonstrated failing
- [ ] All quality gates PASS, run as npm
- [ ] Decision log has PLANNING, EXECUTION and AUDIT entries

## Artifacts

| Path | Owner | Status |
|---|---|---|
| `openspec/changes/prove-it-runs/proposal.md` | proposer | done |
| `openspec/changes/prove-it-runs/specs/app-access/spec.md` | proposer | done |
| `openspec/changes/prove-it-runs/specs/battlegrid-connection/spec.md` | proposer | done |
| `openspec/changes/prove-it-runs/design.md` | proposer | done |
| `openspec/changes/prove-it-runs/findings-first-run.md` | proposer (task 0) | done |
| `openspec/changes/prove-it-runs/tasks.md` | proposer | done |
| `openspec/changes/prove-it-runs/plan/master-plan.md` | planner | this file |
| `openspec/changes/prove-it-runs/plan/data-review.md` | planner → executor | scaffold |
| `openspec/changes/prove-it-runs/plan/architecture-review.md` | planner → executor | scaffold |
| `openspec/changes/prove-it-runs/plan/uiux-review.md` | planner → executor | scaffold |
| `openspec/changes/prove-it-runs/plan/decision-log.md` | planner → executor → auditor | started |
| `openspec/changes/prove-it-runs/plan/production-gate.md` | auditor | not yet |

## Execution Note — one plan claim was wrong

The plan states **"Contracts impacted: none"** and that `DrizzleConnectionRepository.upsert`
keeps its signature. Delivering the third scenario of `The Connection Is The
Identity` required changing it to return `ResolvedConnection { userId, connectionId }`,
which is a port change touching four files. Recorded as DL-008 and reflected in
the data review's contract map. Fixing only the storage side would have turned a
loud foreign-key error into a silent wrong sign-in.

Three smaller deviations: `db:migrate` was added because CI has to apply the
migration somehow (DL-010); the CI `Build` step carries no environment because
the build turned out to need none (DL-011); `next-env.d.ts` was added to the
ESLint ignore list because the build generates it and lint failed on it (DL-012).

EXECUTION READY FOR PRODUCTION GATE
