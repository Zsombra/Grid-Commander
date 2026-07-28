# Master Plan: author-strategies

| | |
|---|---|
| **Change** | `author-strategies` · **Track** | full |
| **Phase** | Execution complete |
| **Base ref** | `5026e4b` (archive of `wire-the-app`) |
| **Last updated** | 2026-07-27 |

## Objective

Deliver the compile → review → apply pipeline for strategies — the product's
largest blast radius — with the platform's own safety design intact.

## Requirement Coverage Matrix

Delta: 8 ADDED (`strategy-authoring`), **21 scenarios**.

| Req | Requirement | Implementing file(s) | Verification |
|---|---|---|---|
| T1 | A Strategy Shows How Many Agents It Governs | `strategy.ts:describeBlastRadius`, `list-strategies.query.ts`, `strategy-list.tsx` | `tests/strategy/lifecycle.test.ts::a strategy is never presented alone` (5) |
| T2 | Compiling Changes Nothing And Says So | `compile-plan.command.ts`, `plan-review.tsx` | `tests/strategy/pipeline.test.ts::compiling is free of effect` (5) + `structure.test.ts::compiling cannot apply` |
| T3 | What Is Applied Is What Was Reviewed | `compiled-plan.ts:toApplyPlan`, `apply-plan.command.ts` | `compiled-plan.test.ts::toApplyPlan projects rather than forwards` (7), `pipeline.test.ts::applying sends the projection` (2), `::a plan is bound to the intent` (3) |
| T4 | An Unusable Plan Is Refused Before It Is Sent | `plan-token.ts`, `apply-plan.command.ts` | `plan-token.test.ts` (12), `pipeline.test.ts::refusing locally` (6) |
| T5 | Applying Requires Confirmation Naming The Blast Radius | `apply-plan.command.ts`, `plan-review.tsx` | `pipeline.test.ts::the confirmation carries the platform's account` (5) |
| T6 | Advisory Findings Are Shown, Not Enforced | `compiled-plan.ts:isViable/concerns` | `compiled-plan.test.ts::viability decides` (5) + `structure.test.ts::mismatches never gate an apply` |
| T7 | Vocabulary Is Discovered, Never Written Down | `read-vocabulary.query.ts`, `strategy-adapter.ts` | `structure.test.ts::platform vocabulary is read` + route guard |
| T8 | A Private Copy Is How A Platform Strategy Is Changed | `strategy.ts:mustForkToEdit`, `strategy-lifecycle.command.ts` | `lifecycle.test.ts::forking` (2), `::strategy capacity` (3) |
| — | Retiring accounts for what depends on it | `strategy-lifecycle.command.ts` | `lifecycle.test.ts::archiving and restoring` (6) |

**8/8 requirements delivered, 0 scenarios uncovered.**

## Non-Negotiable Constraints

| Constraint | Enforcement |
|---|---|
| Compiling and applying are separate use cases | `structure.test.ts::no caller both compiles and applies` |
| The projection has one home | `structure.test.ts::the plan projection has one home` |
| Token claims may only refuse | `structure.test.ts::parsed token claims never grant` |
| `mismatches` never gate | `structure.test.ts::mismatches never gate an apply` |
| No platform vocabulary outside the adapter | `structure.test.ts::platform vocabulary is read, not written down` |
| Every strategy states its blast radius | domain `describeBlastRadius` is the only phrasing |
| Quality gate | `npm run typecheck && npm run lint && npm test` |

## File & Responsibility Inventory

| File | Action | Layer | Responsibility |
|---|---|---|---|
| `src/domain/strategy/strategy.ts` | create | domain | Strategy, quota, blast-radius phrasing, fork-vs-edit |
| `src/domain/strategy/plan-token.ts` | create | domain | Parse claims; refuse-only |
| `src/domain/strategy/compiled-plan.ts` | create | domain | `toApplyPlan`, viability gate, concerns, axes |
| `src/ports/strategies.ts` | create | ports | Compile and apply as separate methods |
| `src/application/use-cases/list-strategies.query.ts` | create | application | Roster, quota, blast radius |
| `.../compile-plan.command.ts` | create | application | Compile; intent digest |
| `.../apply-plan.command.ts` | create | application | Local refusals, confirmation, projection |
| `.../strategy-lifecycle.command.ts` | create | application | Fork, archive, restore, REPAIR_REQUIRED |
| `.../read-vocabulary.query.ts` | create | application | Vocabulary per composing session |
| `src/infrastructure/battlegrid/strategy-adapter.ts` | create | infrastructure | Tool calls, envelope trap, mapping |
| `src/presentation/components/plan-review.tsx` | create | presentation | The review screen |
| `src/presentation/components/strategy-list.tsx` | create | presentation | Roster with blast radius |
| `app/(app)/strategies/**` | create | presentation | Roster and edit → compile → review |
| `src/composition.ts` | modify | infrastructure | Wire the strategy use cases |
| `tests/strategy/*.test.ts` (5 files) | create | test | 21 scenarios + structural guards |

## Phase 2 Review Checklist (Executor)

- [x] All 21 scenarios have passing tests
- [x] `npm run typecheck` PASS
- [x] `npm run lint` PASS
- [x] `npm test` PASS — 339
- [x] `validate author-strategies --strict` clean
- [x] Mutation-checked: viability gate, projection, intent binding
- [x] Live facts established before design (`findings-strategies.md`)

## Phase 3 Review Checklist (Auditor)

- [ ] Spec parity: 8 ADDED delivered
- [ ] Prior three capabilities still hold
- [ ] Fallback-masking scan on touched paths
- [ ] The coercion guard still passes over the enlarged `src/` and `app/`
- [ ] No caller can both compile and apply
- [ ] Token claims cannot grant

---

EXECUTION READY FOR PRODUCTION GATE
