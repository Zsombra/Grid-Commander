# Architecture Review — prove-it-runs

- Checklist source: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`
- Status: `EXECUTION EVIDENCE COMPLETE`
- Evidence window: `7f4cea3..HEAD`

## Scope Summary

Build configuration, one repository method, one port, the schema module, CI, and
a new test suite. No adapter, no domain entity. The composition root is not
edited.

The architectural claim this change had to preserve is the one `wire-the-app`
established: there is exactly one route to BattleGrid, through `composition.ts`.
Changing how modules resolve at build time is precisely the kind of change that
could break it invisibly, which is why the structural tests matter here more
than the diff size suggests.

## Component Checklist Matrix

| Component | File | Checklist section | Status |
|---|---|---|---|
| Root layout | `app/layout.tsx` | Presentation / route boundary | PASS — imports only `ReactNode` from `react`; nothing from `src/` |
| Build resolution | `next.config.ts:16-27` | — (build) | PASS — webpack `extensionAlias`; not one source file changed to satisfy the bundler |
| Schema module | `src/infrastructure/db/schema/index.ts:71-74` | Repository → Query Safety | PASS — `confirmation_tokens.actor` removed; 7 columns confirmed in the applied database |
| Connection repository | `src/infrastructure/db/repositories/drizzle-connection-repository.ts:66-104` | Repository → CQRS, Mapper, Query Safety | PASS — see DL-008 for the return-type change |
| Connection port | `src/domain/connection/connection-repository.ts:19-33` | Repository → CQRS | PASS — `ResolvedConnection` is two identifiers, not an aggregate |
| Database test suite | `tests/db/**` | — (test) | PASS — 51 tests, 4 files |
| CI workflow | `.github/workflows/validate.yml` | Code Quality / gates | PASS — Build, Apply migrations, Database tests; Postgres 16 service |

## Repository Review — `DrizzleConnectionRepository`

### CQRS Separation

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Readers and writers are separate | PASS | `ConnectionReader` / `ConnectionWriter`, `connection-repository.ts:5,34` |
| 2 | Reader methods `find*`/`get*`/`list*`/`count*` | PASS | `findByUserId`, `findUserIdBySubject` |
| 3 | Writer methods named for the write | PASS | `upsert`, `markRevoked`, `updateTokens` |
| 4 | **Writers return void or an identifier, not an aggregate** | PASS | `upsert` returns `ResolvedConnection` — two identifiers. No scopes, no status, no tokens, no timestamps. A writer that returned the connection would be returning an aggregate; this returns which ids the write landed under |
| 5 | Readers return domain objects | PASS | `toDomain`, `drizzle-connection-repository.ts:154` |

### Mapper Pattern

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Row → domain mapping in a dedicated mapper | PASS | `toDomain`, `drizzle-connection-repository.ts:154` |
| 2 | No business calculation in the mapper | PASS | Field copies and one `filter(isScope)` |
| 3 | **No fallback or default that masks missing data** | PASS | `rg "\?\?"` over touched paths returns nothing in `src/`. The only null handling is `x === null ? null : encrypt(x)`, which preserves null rather than replacing it |
| 4 | Nullable columns map to nullable types | PASS — **now proven against real rows** | `tests/db/connections.test.ts`, "carries an absent expiry as absent, not as an instant" |

### Query Safety (Drizzle Specific)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | All queries use the Drizzle query builder | PASS | Every production query. `tests/db/support.ts:60` uses `pool.query` to truncate — test infrastructure, table names from a `const` tuple, no user input |
| 2 | Column references use schema objects | PASS | `users.battlegridSubject`, `connections.userId` |
| 3 | No raw SQL bypassing compile-time validation | PASS | No `sql.raw` and no `db.execute` anywhere in `src/` |
| 4 | No string interpolation in queries | PASS | Test assertions that take a value use parameterised `pool.query(text, [v])` |
| 5 | Every query touching user-owned rows filters by `userId` | PASS — **now proven** | `tests/db/audit.test.ts` "shows a user only their own entries"; `tests/db/confirmations.test.ts` "refuses another user, even with the right token" |

## Project-Specific Policies

| Policy | Applies | Status | Evidence |
|---|:--:|---|---|
| P1 — Scope is not a safety boundary | ✗ | N/A | Unaffected |
| P2 — Capabilities discovered at runtime | ✗ | N/A | Unaffected |
| P3 — Every write is audited, recorded before the attempt | ✓ | PASS | `tests/db/audit.test.ts` "begins as attempted" — the row exists, and reads as unfinished, before the outcome does |
| P4 — Optimistic concurrency surfaced, never retried | ✓ | PASS | The identity fix contains no `catch`, no retry and no lock — one `ON CONFLICT … RETURNING` |
| P5 — Compile is free of effect; apply is not | ✓ | PASS | Structural tests green within the 390 |
| P6 — One way in | ✓ | PASS | `tests/architecture/**` green; the ESLint `no-restricted-imports` rule unchanged and passing after the resolver change |

## Anti-Patterns Checked

| Anti-pattern | Found | Evidence |
|---|:--:|---|
| Infrastructure leak into a use case | No | `connect.commands.ts` speaks only to ports |
| Console logging | No | No `console.` in `src/` |
| String literals for enums | No | `satisfies ConnectionStatus` / `AuditOutcome` retained |
| Missing idempotency check | No | Now enforced by the database and tested — `tests/db/audit.test.ts` |
| **Swallowed errors** | No | `upsert` has no `try`/`catch`. The foreign-key violation is prevented, not caught — `design.md` decision 3 |
| Unsafe queries | No | Builder throughout |
| Trusting scope | No | Untouched |
| **Dual path / fallback branch** | No | No `if (process.env.DATABASE_URL)` anywhere. `tests/db/support.ts:18` throws instead |
| Stale / redundant / deprecated code | No | One column removed; nothing left behind for it |

## Guard Evidence (DL-003)

### Task 2.2 — the build gate

```
########## npm run typecheck (layout deleted) ##########
> grid-commander@0.1.0 typecheck
> tsc --noEmit

typecheck exit=0

########## npm run build (layout deleted) ##########
> grid-commander@0.1.0 build
> next build

   ▲ Next.js 15.5.22
   Creating an optimized production build ...
 ⨯ connect/page.tsx doesn't have a root layout. To fix this error, make sure every page has a root layout.
build exit=1
```

Same working tree, same minute. `tsc` reports a clean type-check of an
application that cannot be assembled. That is the finding this change exists for,
reproduced on demand — and the reason `Build` is a fourth CI step rather than an
assumption that typecheck covers it.

### Verifier finding — the schema drift guard

```
########## in sync ##########
PASS — schema matches migrations                       exit=0

########## schema drifted (a column added, no migration) ##########
FAIL — schema changed without a migration:
 M drizzle/migrations/meta/_journal.json
?? drizzle/migrations/0001_soft_night_thrasher.sql
?? drizzle/migrations/meta/0001_snapshot.json          exit=1

########## restored ##########
PASS — schema matches migrations                       exit=0
```

Against the same drifted schema, `drizzle-kit check` reports
`Everything's fine 🐶🔥` (exit 0), typecheck exits 0, and all 390 unit tests
pass. The named check is the only one that sees it — which is why
`drizzle-kit check` is not in the workflow despite being the obvious candidate.
DL-014.

### Task 6.5 — the identity fix

```
########## typecheck (defect re-injected) ##########
typecheck exit=0

########## unit suite (defect re-injected) ##########
 Test Files  37 passed (37)
      Tests  390 passed (390)

########## database suite (defect re-injected) ##########
   × one subject, one identity > two first-time callbacks at once leave one identity, and both find it
     → neither callback may surface a storage-level failure: expected [ Array(1) ] to deeply equal []
 Test Files  1 failed (1)
      Tests  1 failed | 15 passed (16)
```

Typecheck clean, all 390 unit tests green, and the defect caught by exactly one
assertion — the one written for it. Restored, the suite returns 16/16.

Worth noting which fifteen passed: every other test in that file, including two
that also exercise the race. `Promise.allSettled` hides a rejection unless
something asserts on it, so the assertion that catches this defect is the
explicit `failures` check, not the "one identity survives" count. A weaker test
would have gone green against the defect.

## Quality Gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | PASS — exit 0 |
| Lint | `npm run lint` | PASS — exit 0, 0 problems |
| Unit tests | `npm test` | PASS — 37 files, 390 tests |
| Build | `npm run build` | PASS — compiled, 14 routes |
| Database tests | `npm run test:db` | PASS — 4 files, 51 tests |
| Harness tests | `python3 -m unittest discover -s tests` | PASS — 124 tests |
| Spec layer | `python3 .claude/tools/openspec.py validate --all` | PASS — 0 errors |

Run as `npm`, not `pnpm` — see DL-006.

## Findings

**F-A — the plan's contract claim was wrong.** The master plan states
"Contracts impacted: none" and that `upsert` keeps its signature. Delivering the
third scenario of `The Connection Is The Identity` required changing it to
return `ResolvedConnection`. Surfaced here rather than left for the auditor:
fixing only the storage side would have converted a loud foreign-key error into
a silent wrong sign-in, which is worse. DL-008.

**F-B — the fake modelled a weaker rule than the database.**
`FakeConnectionRepository.upsert` keyed on the proposed `userId`, so no unit test
could ever have caught the identity defect — the fake would have agreed with
whatever the code did. Corrected in `tests/support/fakes.ts:132`; all 390 unit
tests pass unchanged against the stricter fake. DL-009.

**F-C — lint became order-dependent the moment the build ran.** `next build`
generates `next-env.d.ts`; it is gitignored, documented as not-to-be-edited, and
failed `@typescript-eslint/triple-slash-reference`. CI runs lint before build, so
CI would have stayed green while every developer who had built once saw a
failure. Added to the ESLint ignore list. DL-012.

**F-D — 213 Tailwind class names and no Tailwind.** Visible for the first time
once the product served. Out of scope; filed as
`tailwind-classes-with-no-tailwind` (p2). DL-013.

No stale code, no redundant implementation, no deprecated path, and no
unnecessary defensive branch was introduced. One column was removed and nothing
was left behind for it.

## Verdict

`EXECUTION EVIDENCE COMPLETE` — ready for the production gate.
