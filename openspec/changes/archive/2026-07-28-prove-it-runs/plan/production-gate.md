# Production Gate — prove-it-runs

- Change ID: `prove-it-runs`
- Track: `full`
- Evidence window: `7f4cea3..3b9abb8`
- Audit timestamp: `2026-07-28 05:45 UTC`
- Decision: **PASS**

## Handoff Integrity

| # | Check | Result |
|---|---|---|
| 1 | Master plan ends `EXECUTION READY FOR PRODUCTION GATE` | VALID |
| 2 | Execution checklist complete | VALID — 30/30, 0 unchecked |
| 3 | Required review artifacts on disk | VALID — data, architecture, uiux, decision-log |
| 4 | Decision log has planner and executor entries | VALID — 7 PLANNING, 8 EXECUTION |
| 5 | Review artifacts carry path-level evidence | VALID — `file:line` throughout, plus verbatim command output |
| 6 | File inventory matches `git diff --name-status` | VALID — 29 paths, all planned or expected process artifacts |

**Verdict: VALID.** One planned claim was contradicted during execution and
disclosed rather than quietly corrected — see PG-002.

## Spec Parity

`openspec.py validate prove-it-runs --strict` → clean. 5 requirements, 13
scenarios.

### `app-access` — The Application Builds Into A Servable Artifact (ADDED)

| Scenario | Delivered | Evidence |
|---|---|---|
| The production build | YES | `app/layout.tsx:26`, `next.config.ts:16-27`. `npm run build` PASS, 14 routes |
| A route that cannot be assembled | YES | `.github/workflows/validate.yml` `Build` step |
| A type check is not a build | YES | Guard demonstrated: typecheck exit 0 / build exit 1 on one tree, `architecture-review.md` |
| Serving a capability page without a connection | YES | Served probe, 7 routes, `uiux-review.md` — 200 + not-connected + no BattleGrid call + no rows written |

### `app-access` — The Schema Is Created By A Committed Migration (ADDED)

| Scenario | Delivered | Evidence |
|---|---|---|
| A fresh database | YES | `drizzle/migrations/0000_sleepy_paibok.sql` applied to an empty database: 5 tables, 5 non-PK indexes, 1 FK |
| The schema is changed without a migration | YES | `Schema matches migrations` CI step. Guard demonstrated: PASS in sync, FAIL with a column added, PASS restored |

The second scenario was **not** delivered at first submission. Found by the
verifier, fixed in `3b9abb8`. Recorded as PG-001.

### `app-access` — Stored-Data Behaviour Is Proven Against A Real Database (ADDED)

| Scenario | Delivered | Evidence |
|---|---|---|
| Single-use tokens | YES | `tests/db/confirmations.test.ts` "cannot be spent twice"; `tests/db/oauth-transactions.test.ts` "cannot be consumed a second time" |
| Two requests presenting one token at the same instant | YES | `tests/db/confirmations.test.ts` "exactly one succeeds" |
| Uniqueness the code relies on | YES | `tests/db/audit.test.ts` "refuses a second entry with the same key for one user" |
| A guarantee the fake cannot show | YES | `tests/db/support.ts:18` throws. Confirmed at audit, accidentally: PostgreSQL was down and all 51 tests **failed** rather than skipping |

### `app-access` — Every Capability Is Reachable (MODIFIED)

| Check | Result |
|---|---|
| New behaviour in effect | YES — the added scenario "Reachable in a served build" verified by the 7-route probe |
| Old behaviour gone | N/A — this MODIFIED tightens the requirement; the three original scenarios are preserved verbatim and still hold |

### `battlegrid-connection` — The Connection Is The Identity (MODIFIED)

| Check | Result | Evidence |
|---|---|---|
| New behaviour in effect | YES | `drizzle-connection-repository.ts:66-104` — `ON CONFLICT (battlegrid_subject) DO UPDATE … RETURNING`; `connect.commands.ts:117-135` |
| **Old behaviour gone** | YES | The untargeted `onConflictDoNothing()` is absent from the file; `rg "onConflictDoNothing" src/` returns nothing |
| Scenario: Returning user | YES | `tests/db/connections.test.ts` "a returning user keeps the identity they had" |
| Scenario: A connection is removed | YES | `tests/db/connections.test.ts` "keeps the record and discards the authority" |
| Scenario: One authorization completed twice at once | YES | `tests/db/connections.test.ts`; mutation-checked — the defect fails exactly one assertion while typecheck and all 390 unit tests stay green |

### Regression Against Existing Specs

| Capability | Requirements not modified | Result |
|---|---|---|
| `app-access` | 5 | HOLD — the composition root is untouched; `tests/architecture/**` and `tests/access/**` green |
| `battlegrid-connection` | 9 | HOLD — the guard sequence, scope handling, confirmation and audit paths are untouched; the audit and confirmation behaviours are now additionally proven against a real database |
| `agent-authoring`, `strategy-authoring`, `assistant`, `harness-integrity`, `spec-validation` | all | HOLD — not touched; 390 unit + 124 harness tests green |

**Load-bearing check.** `app/api/auth/battlegrid/callback/route.ts:31-32`
destructures `userId` from the response and passes it to `sessions.issue`. The
DL-008 return-type change therefore reaches the session directly: without it, a
losing concurrent callback would have issued a session for an identity holding
no connection.

### Unspecified Behaviour

`isReturningUser` (`connect.commands.ts:133`) had its condition widened. No
requirement describes it and no production code reads it. Recorded as PG-003.

### Scope Adherence

| Out-of-scope item | Respected |
|---|---|
| Applying the migration to a deployed environment | YES — no deploy hook, no startup check |
| The three partial surfaces | YES — untouched |
| Styling / design tokens in the layout | YES — no `className`, colour, font, or spacing |
| Wiring a model behind the assistant | YES — untouched |
| Migration tooling beyond the first migration | PARTIAL — `db:migrate` added for CI. Disclosed as DL-010, no runner or deploy hook. Accepted |
| Turbopack | YES — not configured; filed |

## Checklist Parity

### Data Pipeline

Layers 1–4 audited. All checks PASS. One stated exception: `oauth_transactions`
has no `user_id` (DL-005) — correct, the row exists before an identity does.

The review self-reports an Iron Rule violation **found and fixed**: the caller
was answering "which user is this" from its own proposal rather than from the
store that owns it. Correctly categorised.

### Architecture

CQRS, mapper, and query-safety checks PASS. `upsert` returning
`ResolvedConnection` remains compliant with "writers return an identifier, not
an aggregate" — two identifiers, no state.

P3, P4, P5, P6 all PASS. P6 specifically re-checked because a bundler-resolution
change is exactly what could break it invisibly: `tests/architecture/**` green
and the ESLint `no-restricted-imports` rule unchanged.

### UI

One file. All design-boundary checks PASS. The review names a non-obvious
decision — the layout must **not** wrap `children` in `<main>`, because all
thirteen routes supply their own and the obvious implementation would have given
every page two landmarks.

## Technical Debt Scans

| Scan | Command | Result |
|---|---|---|
| Conflict markers | `rg "^(<<<<<<<\|=======\|>>>>>>>)" -n` | CLEAN |
| Fallback masking | `rg "\?\?" <touched>` | 2 hits, both correct — see below |
| Debt markers | `rg "TODO\|FIXME\|HACK\|XXX\|deprecated\|legacy\|obsolete"` | CLEAN |
| Dual-path / env branching | `rg "fallback\|process\.env" src/…` | CLEAN — no "if a database is configured" branch |
| Stale exports | `rg "ResolvedConnection"` | 6 live references |

The two `??` hits, judged against the defect class this project keeps finding
(a fabricated value standing in for one never supplied):

- `connect.commands.ts:117` — `existingUserId ?? this.random.token(16)`. Not
  fabrication: no prior identity genuinely means a new one. And the value is now
  explicitly a *proposal*, superseded by the store's answer.
- `drizzle-connection-repository.ts:47` — `row?.id ?? null`. Null to null.

## Violations

| ID | Sev | Category | Requirement | Evidence | Impact | Required fix | Status | Owner | Verification |
|---|---|---|---|---|---|---|---|---|---|
| PG-001 | CRITICAL | SPEC_PARITY | The Schema Is Created By A Committed Migration | `.github/workflows/validate.yml` at `825750f` — no step detecting schema drift; `drizzle-kit check` returns exit 0 against a schema with an added column | A schema change reaching the repositories with no migration would be caught by nothing. Worse, the obvious remedy looks like a fix and is not — the third instance in this project of a guard that misses its target | Add a CI step running `db:generate` and failing on any change under `drizzle/` | **FIXED** in `3b9abb8` | executor | Re-verified at audit: PASS in sync, FAIL with a column added, PASS restored. `drizzle-kit check` explicitly excluded, with the reason in the workflow comment |
| PG-002 | MINOR | HANDOFF | — | `plan/master-plan.md:87` states "Contracts impacted: none"; `ConnectionWriter.upsert` changed its return type | A reader trusting the plan's inventory would miss a port change touching four files | Supersede in the decision log rather than editing the plan retroactively | **FIXED** — DL-008 plus an Execution Note in the master plan | executor | Both present; `data-review.md` carries a contract map replacing the `N/A` |
| PG-003 | MINOR | TECH_DEBT | — | `connect.commands.ts:74,133` — `isReturningUser` and `connectionId` are returned and read by no production code (`route.ts:31` takes only `userId`) | An unread field whose semantics were changed here is a future reader's trap: it looks load-bearing and is not | Either consume it or drop it from the response | OPEN | backlog | Filed as `unread-connect-response-fields` (p3) |

Open: **0 CRITICAL, 0 MAJOR, 1 MINOR** — filed to backlog per the gate's handoff rule.

## Mandatory Recheck Evidence

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| Unit tests | `npm test` | PASS — 390 |
| Build | `npm run build` | PASS — 14 routes |
| Database tests | `npm run test:db` | PASS — 51 |
| Harness tests | `python3 -m unittest discover -s tests` | PASS — 124 |
| Spec validation | `openspec.py validate prove-it-runs --strict` | PASS — clean |
| Spec layer | `openspec.py validate --all` | PASS — 0 errors |
| Working tree after gates | `git status --porcelain` | CLEAN — the build is idempotent |

**One incident worth recording.** The first `test:db` run at this audit reported
51 failures. Cause: PostgreSQL had stopped in this environment. The suite failed
with `ECONNREFUSED` rather than reporting a green run of zero tests — which is
the fourth scenario of `Stored-Data Behaviour Is Proven Against A Real Database`
observed by accident, under exactly the conditions it was written for. Re-run
after restarting: 51 PASS.

## Gate Decision

**PASS** — 2026-07-28 05:45 UTC.

Zero open CRITICAL or MAJOR violations. One MINOR, filed.

The change delivers all 5 requirements and all 13 scenarios. Two of the three
guards it introduces were demonstrated failing against the defects they exist
for before being trusted, and the third — the drift guard — was added only after
the verifier proved the obvious candidate did not work.

Handing to the **archiver**. The deltas must merge into `openspec/specs/` or the
spec layer will claim reachability that the next audit measures against a stale
record.

PRODUCTION GATE COMPLETE
