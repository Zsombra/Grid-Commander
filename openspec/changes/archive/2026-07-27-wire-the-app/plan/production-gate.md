# Production Gate: wire-the-app

**Track**: full · **Evidence window**: `edb292d..HEAD`

## Handoff Integrity

| Check | Result | Evidence |
|---|---|---|
| Master plan handoff marker | VALID | `EXECUTION READY FOR PRODUCTION GATE` |
| Execution checklist checked | VALID | 29/29, with 4.7 annotated as partial rather than silently ticked |
| Review artifacts with path-level evidence | VALID | three files, `EVIDENCE RECORDED` |
| Decision log has both phases | VALID | WL-1…WL-3 (planning), WL-4…WL-8 (execution) |
| Inventory matches the diff | VALID | one addition beyond the plan (`read-catalog.query.ts`, so a route need not touch a port) |

## Spec Parity

6 ADDED (`app-access`), 16 scenarios.

| Req | Delivered at | Verdict |
|---|---|---|
| X1 A Request Acts For Exactly One Identified User | `session.ts`, `cookie-session.ts`, `current-user.query.ts` | DELIVERED — 4/4 |
| X2 A Session Is Not A BattleGrid Credential | `cookie-session.ts` | DELIVERED — 2/2 |
| X3 Authority Refreshed Before Use | `resolve-authority.query.ts` | DELIVERED — 3/3 |
| X4 Losing Authority Is One Outcome | `resolve-authority.query.ts`, `current-user.query.ts`, `require-connection.tsx` | DELIVERED — 2/2 |
| X5 Every Capability Is Reachable | 10 route files | DELIVERED — 3/3, two surfaces partial and declared (WL-6) |
| X6 Assembled Once, From Configuration | `composition.ts`, `config.ts` | DELIVERED — 2/2 |

**6/6 delivered, 0 scenarios uncovered.**

**Regression against the two prior capabilities**: all 20 requirements still
hold; their tests are unchanged and green. `tests/access/end-to-end.test.ts` is
the first evidence any of them holds *through a request* rather than in
isolation.

**Scope adherence**: no new identity system, no new BattleGrid capability, no
wager tool. `tests/agent/wager.test.ts` still passes over the enlarged `app/`.

## Violation Tracker

### PG-201 · MAJOR · FALLBACK · A revision coerced from a form field

| Field | Value |
|---|---|
| **Requirement** | `agent-authoring` — Every Agent Mutation Carries The Revision It Was Formed Against |
| **Evidence** | `app/(app)/agents/[id]/rebind/page.tsx` and `archive/page.tsx` (pre-fix: `expectedRevision: Number(formData.get('expectedRevision'))`) — `rg "\?\?"` and coercion scan on touched paths |
| **Impact** | `Number(null)` is **0** and `Number('nonsense')` is **NaN**. Either would be sent to BattleGrid as the optimistic-concurrency token for a destructive rebind. A revision of 0 does not match any real agent, so the platform would refuse it — but the product would have *composed and sent* a mutation carrying a revision no one read, which is exactly what the requirement forbids. The route had quietly become the one place the guarantee did not hold. |
| **Required fix** | Refuse a missing or malformed revision rather than coercing one. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `src/presentation/form.ts::requiredInteger` throws `FormError`; five tests in `tests/access/form.test.ts`. |

### PG-202 · MAJOR · CONTRACT · A behavior profile cast rather than validated

| Field | Value |
|---|---|
| **Requirement** | `agent-authoring` — Agent Fields Are Offered Only From Values The Platform Confirms |
| **Evidence** | `app/(app)/agents/new/page.tsx` (pre-fix: `risk: String(formData.get('risk') ?? 'MODERATE') as 'MODERATE'`) |
| **Impact** | The cast type-checks and asserts nothing. A form posting `risk=RECKLESS` would have been typed as valid and sent to BattleGrid. The domain has `isRisk`, `isOutlook` and `isConviction` — written in `author-agents` and, until this fix, called by nothing. A guard nobody calls is not a guard. |
| **Required fix** | Use the domain guards; refuse an unrecognised value. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `src/presentation/form.ts::behavior`; four tests in `tests/access/form.test.ts`. |

### PG-203 · MAJOR · CONTRACT · The confirmation store would have been replayable

| Field | Value |
|---|---|
| **Requirement** | `battlegrid-connection` — Destructive Operations Require Confirmation Naming The Consequence |
| **Evidence** | `drizzle-audit-repository.ts::consume`, caught while writing it; recorded as WL-4 |
| **Impact** | Single-use and expiry were checked *after* the update, reading from `.returning()` — which returns the post-update row, so `consumedAt !== null` could never fail. A spent confirmation token would have been reusable indefinitely. Both prior changes prove the domain enforces single use, against a fake that got it right; the real implementation would have silently not. |
| **Required fix** | Every condition in the `WHERE`. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `drizzle-audit-repository.ts:129-146`. Not covered by a test — see PG-204. |

### PG-204 · MAJOR · TEST_COVERAGE · No repository is executed against a database

| Field | Value |
|---|---|
| **Requirement** | — (coverage, not behaviour) |
| **Evidence** | `tests/` contains no database test; no migration has been generated (WL-7) |
| **Impact** | Four repositories are written, typecheck against the schema, and have never run a statement. PG-203 was found by reading, not by a failing test, and a second defect of that kind would not be caught. The three most likely disagreements are the `text[]` column, the unique index on `(user_id, idempotency_key)`, and the `onConflictDoUpdate` target. |
| **Required fix** | Generate the migration, apply it to a real PostgreSQL, and run the repositories against it — including a replay of a spent confirmation token, which is now the specific regression worth pinning. |
| **Status** | WONTFIX (this change) — deferred, **escalated** |
| **Owner** | first deployment |
| **Verification** | Filed as `generate-initial-migration` at **P1**. There is no database in this environment; generating a migration that cannot be applied would be a file claiming more than it has earned. |

### PG-205 · MINOR · UI · Two surfaces are partial

| Field | Value |
|---|---|
| **Evidence** | `agents/[id]/rebind` takes its target as a query parameter; the agent detail page has a rename action rather than an edit form |
| **Impact** | The rebind placeholder disappears when `author-strategies` lands. The edit gap means a user can see their agent's money limits and not change them. |
| **Status** | WONTFIX — deferred |
| **Owner** | `author-strategies` / backlog `agent-edit-form` |
| **Verification** | Both stated in `uiux-review.md` F-1 and F-2, and in WL-6. |

## Mandatory Recheck Evidence

| Check | Result |
|---|---|
| `validate wire-the-app --strict` | PASS |
| `validate --all` | PASS — 0 errors |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 20 files, 267 tests |
| harness regression | PASS — 124 |
| conflict markers | PASS — none |
| fallback masking on touched paths | PASS after PG-201/PG-202 |
| debt markers | PASS — none |
| console logging | PASS — none |
| routes reach no deeper than the application layer | PASS — `boundaries.test.ts::W-D` |
| one composition root | PASS |
| one decryption point | PASS |
| session flags httpOnly/secure/sameSite | PASS — `session.test.ts` |
| no wager tool reachable | PASS |

### On the coercion pattern

PG-201 is the **third** appearance in this project of one defect: a fabricated
number standing in for one that was never supplied. `expectedRevision ?? -1`
(PG-003), `slotUsage.limit ?? 0` (PG-101), `Number(formData.get(...))` (PG-201).
Each was in a different layer, each was invisible to a green suite, and each was
found by the same scan.

Three occurrences is a pattern, not a coincidence. The lesson has been written
into the journal twice and recurred anyway. `tests/agent/concurrency.test.ts`
already forbids `expectedRevision ??` outside `?? null` in `src/`; extending that
scan to `app/` and to `Number(` coercions is the mechanical guard this needs, and
it is now in place: `tests/agent/concurrency.test.ts::no identifier is coerced
into existence` scans `src/` and `app/` for `Number(form.get(...))` and for any
identifier defaulted with `??` to something other than `null`. A fourth
occurrence fails the build rather than waiting for a fourth gate.

## Gate Decision

Three MAJOR fixed; PG-204 deferred at P1 with a named owner; PG-205 deferred.

```
Open violations: 0
```

## **DECISION: PASS** — 2026-07-27

Handoff: **archiver**.
