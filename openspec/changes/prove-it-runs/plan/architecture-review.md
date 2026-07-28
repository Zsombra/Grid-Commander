# Architecture Review — prove-it-runs

- Checklist source: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`
- Status: `PENDING EXECUTION EVIDENCE`

## Scope Summary

Build configuration, one repository method, the schema module, CI, and a new
test suite. No use case, port, adapter, or domain type is touched. The
composition root is not edited.

The architectural claim this change has to preserve is the one `wire-the-app`
established: there is exactly one route to BattleGrid, and it runs through
`composition.ts`. Changing how modules resolve at build time is precisely the
kind of change that could quietly break that, so the structural tests matter
more here than the diff size suggests.

## Component Checklist Matrix

| Component | File | Checklist section | Status |
|---|---|---|---|
| Root layout | `app/layout.tsx` | Presentation / route boundary | PENDING |
| Build resolution | `next.config.ts` | — (build) | PENDING |
| Schema module | `src/infrastructure/db/schema/index.ts` | Repository → Query Safety | PENDING |
| Connection repository | `src/infrastructure/db/repositories/drizzle-connection-repository.ts` | Repository → CQRS, Mapper, Query Safety | PENDING |
| Database test suite | `tests/db/**` | — (test) | PENDING |
| CI workflow | `.github/workflows/validate.yml` | Code Quality / gates | PENDING |

## Repository Review — `DrizzleConnectionRepository`

### CQRS Separation

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Readers and writers are separate | PENDING | |
| 2 | Reader methods `find*`/`get*`/`list*`/`count*` | PENDING | |
| 3 | Writer methods named for the write | PENDING | |
| 4 | **Writers return void or an identifier, not an aggregate** | PENDING | `upsert` must keep returning the connection id |
| 5 | Readers return domain objects | PENDING | |

### Mapper Pattern

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Row → domain mapping in a dedicated mapper | PENDING | `toDomain` |
| 2 | No business calculation in the mapper | PENDING | |
| 3 | **No fallback or default that masks missing data** | PENDING | |
| 4 | Nullable columns map to nullable types | PENDING | |

### Query Safety

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | All queries use the Drizzle query builder | PENDING | `tests/db/support.ts` uses `pool.query` for truncation — test infrastructure, no user input |
| 2 | Column references use schema objects | PENDING | |
| 3 | No raw SQL bypassing compile-time validation | PENDING | |
| 4 | No string interpolation in queries | PENDING | |
| 5 | Every query touching user-owned rows filters by `userId` | PENDING | |

## Project-Specific Policies

| Policy | Applies | Status | Evidence |
|---|:--:|---|---|
| P1 — Scope is not a safety boundary | ✗ | N/A | Unaffected |
| P2 — Capabilities discovered at runtime | ✗ | N/A | Unaffected |
| P3 — Every write is audited, recorded before the attempt | ✓ | PENDING | The audit repository's behaviour is proven against a real database for the first time |
| P4 — Optimistic concurrency surfaced, never retried | ✓ | PENDING | The identity fix must not become a retry |
| P5 — Compile is free of effect; apply is not | ✓ | PENDING | Structural test must still pass |
| P6 — One way in | ✓ | PENDING | Must survive the build-resolution change |

## Anti-Patterns Checked

| Anti-pattern | Found | Evidence |
|---|:--:|---|
| Infrastructure leak into a use case | PENDING | |
| Console logging | PENDING | |
| String literals for enums | PENDING | |
| Missing idempotency check | PENDING | |
| **Swallowed errors** | PENDING | The identity fix must not catch the FK violation — `design.md` decision 3 |
| Unsafe queries | PENDING | |
| Trusting scope | PENDING | |
| **Dual path / fallback branch** | PENDING | No "if a database is configured" branch anywhere |

## Guard Evidence (DL-003)

Both new guards must be shown failing against the defect they exist for. Record
the actual output, not a summary.

### Task 2.2 — the build gate

```
[ npm run typecheck, with app/layout.tsx deleted — expected: PASS ]
PENDING

[ npm run build, with app/layout.tsx deleted — expected: FAIL ]
PENDING
```

The pair is the point: the typecheck passing while the build fails is the
finding this change was opened for, reproduced deliberately.

### Task 6.5 — the identity fix

```
[ tests/db/connections.test.ts, with the untargeted onConflictDoNothing
  re-injected — expected: FAIL ]
PENDING
```

## Quality Gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | PENDING |
| Lint | `npm run lint` | PENDING |
| Unit tests | `npm test` | PENDING |
| Build | `npm run build` | PENDING |
| Database tests | `npm run test:db` | PENDING |
| Spec layer | `python3 .claude/tools/openspec.py validate --all` | PENDING |

Run as `npm`, not `pnpm` — see DL-006.

## Findings

_To be filled by the executor with `path:line` evidence._

## Verdict

`PENDING EXECUTION EVIDENCE`
