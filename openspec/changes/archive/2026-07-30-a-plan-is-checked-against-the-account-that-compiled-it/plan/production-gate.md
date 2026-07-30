# Production Gate: a-plan-is-checked-against-the-account-that-compiled-it

**Decision: PASS** — 2026-07-30

Zero open violations. The checks that caught the previous change's CRITICAL were run
first and deliberately: inventory against diff, and a duplication scan on everything
this change introduced.

## Handoff integrity: VALID

| Check | Result |
|---|---|
| Master plan ends `EXECUTION READY FOR PRODUCTION GATE` | PASS |
| Tasks checked or tracked | PASS — 22/23; 4.2 is this gate |
| Review artifacts on disk | PASS — architecture, data, uiux |
| Decision log has planner + executor entries | PASS — DL-1..DL-5, with DL-2 carrying its own correction |
| Review artifacts carry true path-level evidence | PASS — spot-checked below |
| Master plan inventory matches the diff | PASS — see reconciliation |

## Evidence window

`4128261~1..HEAD` — commit `4128261` plus `tests/access/subject-brand.test.ts`, added
by the verifier.

## Inventory reconciliation

Run before anything else, because this is what found PG-001 last time.

- **Touched but not planned: none.**
- **Planned but not touched: `current-user.query.ts`** — already recorded
  in the plan as struck through, with the reason: the new field passes through
  untouched because `CurrentUserQuery` returns the authority `ResolveAuthorityQuery`
  produced. A recorded divergence, not drift.
- Two further "misses" were citations in *What is already true*
  (`schema/index.ts:12-13`, `plan-token.test.ts:34`), not inventory rows.

## Duplication scan — the PG-001 class

The previous change shipped two `digestOf`s past every quality gate, so everything
this one introduces was counted:

| Symbol | Definitions | Verdict |
|---|---|---|
| `BattlegridSubject` | 1 | `src/domain/connection/subject.ts` |
| `asSubject` | 1 | same file, and it is the only constructor |
| `subjectFor` | 1 declaration + 1 implementation | `AccountPort` and `McpAccountAdapter` — an interface and its single impl |
| `implements AccountPort` | 1 | no second implementation |

`asSubject` has three call sites, each a genuine boundary: the platform read
(`account-adapter.ts:52`) and the stored subject
(`resolve-authority.query.ts:82,114`). No call site asserts a locally-minted value.

## Spec parity: 2/2 requirements delivered, 0 scenarios uncovered

| Requirement | Op | Delivered | Evidence |
|---|---|---|---|
| An Unusable Plan Is Refused Before It Is Sent | MODIFIED | YES | `plan-token.ts:98` compares `battlegridSubject`; old behaviour gone — the `userId` field no longer exists on the context and `TS2322` blocks the local id |
| The Connection Is The Identity | MODIFIED | YES | `resolve-authority.query.ts:82,114`, `owner-only-user.ts:44`, `subject.ts` |

| Scenario | Covered | Evidence |
|---|---|---|
| The plan has expired | YES | `plan-token.test.ts` |
| The plan belongs to someone else | YES | `plan-token.test.ts`, distinct subjects |
| A plan that looks usable | YES | `plan-token.test.ts` |
| A plan compiled with this deployment's own credential | YES | `pipeline.test.ts` |
| The acting account is not known | YES | `plan-token.test.ts` ×2 — null skips one check, the others keep running |
| Acting under a delegated connection | YES | `authority.test.ts` |
| Acting under the owner's own credential | YES | `personal-key.test.ts` ×4 |
| The two identifiers are not interchangeable | YES | `subject-brand.test.ts` via `tsc`; re-injected |

**Regression**: 775 tests pass. `Every Modifying Operation Is Recorded` — audit rows
still key on `userId`, unchanged, which is the point of DL-1. No stored value moves.

**Unspecified behaviour**: none. Every diff element maps to a requirement clause or a
decision-log entry.

**Scope**: PASS. No migration, no relabelled rows, `refuseLocally` not weakened.

## Violations

**None open.** Two findings were raised and closed before this gate:

| ID | Sev | Category | Evidence | Status | Verification |
|---|---|---|---|---|---|
| PG-001 | MAJOR | DECISION_LOG | `plan/decision-log.md` DL-2 claimed a rename made the local id a compile error. False — `battlegridSubject: req.userId` type-checked. Found by re-injection during execution | FIXED | The brand now makes it `TS2322`; DL-2 records the false claim rather than hiding it |
| PG-002 | MINOR | TEST_COVERAGE | The brand was the only thing enforcing the property, and nothing enforced the brand | FIXED | `tests/access/subject-brand.test.ts`; removing the brand yields `TS2578` on both directives |

Both were found by the process rather than by this gate, which is the intended
order — and PG-001 is the second decision log in two changes to assert a
verification that was never run. Worth naming as a pattern.

## Mandatory recheck evidence

| Check | Result |
|---|---|
| Conflict markers | PASS — none |
| Debt markers in touched source | PASS — none |
| Stale exports | PASS — `asSubject`, `AccountPort`, `McpAccountAdapter` all live; no field survives beside a replacement |
| Fallback masking | PASS — the one `catch` returns `null`, which is a **declared** answer; the port says so and the consumer treats unknown as unknown |
| Dependency direction | PASS — `boundaries.test.ts`. The adapter's `OWNER_USER_ID` import is infrastructure → application, which the layering permits; justified in the architecture review |
| Runtime dual-path | PASS — one source of the subject per mode, picked once at composition; `null` removes one check rather than adding a path |
| Contract consistency | PASS — `BattlegridSubject \| null` spelled identically in four places, enforced by the brand |
| `npm run typecheck` | PASS — 0 |
| `npm run lint` | PASS — 0 |
| `npx vitest run` | PASS — 775 passed, 6 skipped |
| `./scripts/check.sh` | PASS |
| `npm run build` | PASS |
| `check-serving.sh` | PASS — schema applied, 4 routes answered |
| `validate` | PASS — clean |

## Not verified, and it is the important line

**Whether BattleGrid accepts the applied call.** This change removes the product's
own refusal. It does not prove the platform then succeeds, and no key is on disk.

The last two changes to `apply_strategy_plan` each removed exactly one block and
revealed another — a confirmation target that never matched, then an account check
that never matched. A third is possible, and the only thing that would find it is a
live apply against a strategy the operator is willing to see change. **This gate
should not be read as "applying works".** It says the product no longer refuses it.

## Gate rationale

Every requirement is delivered with old behaviour removed, the property is held by a
type rather than a convention, the type is itself guarded, and the two checks that
caught the previous CRITICAL were run first and came back clean.
