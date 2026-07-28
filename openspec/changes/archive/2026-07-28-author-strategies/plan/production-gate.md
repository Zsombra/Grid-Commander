# Production Gate: author-strategies

**Track**: full · **Evidence window**: `5026e4b..HEAD`

## Handoff Integrity

| Check | Result | Evidence |
|---|---|---|
| Master plan handoff marker | VALID | `EXECUTION READY FOR PRODUCTION GATE` |
| Execution checklist | VALID | Phase 2 checked; 4.2/5.x annotated where partial |
| Review artifacts with path-level evidence | VALID | three files, `EVIDENCE RECORDED` |
| Decision log, both phases | VALID | SL-1…SL-7 (planning), SL-8…SL-10 (execution) |
| Live facts before design | VALID | `findings-strategies.md`, nine findings |
| Inventory matches the diff | VALID | one addition (`read-vocabulary.query.ts`) |

## Spec Parity

8 ADDED (`strategy-authoring`), **21 scenarios**.

| Req | Delivered at | Verdict |
|---|---|---|
| T1 A Strategy Shows How Many Agents It Governs | `strategy.ts`, `list-strategies.query.ts`, `strategy-list.tsx` | DELIVERED — 3/3 |
| T2 Compiling Changes Nothing And Says So | `compile-plan.command.ts`, `plan-review.tsx` | DELIVERED — 3/3 |
| T3 What Is Applied Is What Was Reviewed | `compiled-plan.ts:toApplyPlan`, `apply-plan.command.ts` | DELIVERED — 3/3 |
| T4 An Unusable Plan Is Refused Before It Is Sent | `plan-token.ts` | DELIVERED — 3/3 |
| T5 Applying Requires Confirmation Naming The Blast Radius | `apply-plan.command.ts` | DELIVERED — 3/3 |
| T6 Advisory Findings Are Shown, Not Enforced | `compiled-plan.ts:isViable` | DELIVERED — 2/2 |
| T7 Vocabulary Is Discovered, Never Written Down | `read-vocabulary.query.ts`, edit route | DELIVERED — 2/2 |
| T8 A Private Copy Is How A Platform Strategy Is Changed | `strategy-lifecycle.command.ts` | DELIVERED — 2/2 |

**8/8 delivered, 0 scenarios uncovered.**

**Regression**: all 26 requirements across the three prior capabilities still
hold; their tests are unchanged and green. `tests/access/end-to-end.test.ts` and
`tests/agent/wager.test.ts` both pass over the enlarged `src/` and `app/`.

**Scope adherence**: no wager tool; no `update_strategy_signal_rule` (SL-7);
no deployment; no backtesting. The proposal's Out of Scope holds.

## Violation Tracker

### PG-301 · MAJOR · CONTRACT · A strategy id and revision were defaulted

| Field | Value |
|---|---|
| **Requirement** | T3 — What Is Applied Is What Was Reviewed |
| **Evidence** | `strategy-adapter.ts:mapStrategy` (pre-fix: `id: String(s['id'] ?? '')`, `revision: … : 0`), found by the mandated `rg "\?\?"` scan on touched paths |
| **Impact** | Neither is a display field. The id becomes `strategyId` on a **destructive apply**; the revision becomes `expectedRevision` on a compile and `sourceRevision` on a fork. An id-less payload would key on `''` — two such strategies colliding, and the empty id reaching an apply. A revision-less payload would compile against revision **0**, a value nobody read, on an operation that reconfigures every bound agent. |
| **Required fix** | Refuse the payload, as `mapAgent` already does for the same two fields. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `strategy-adapter.ts` throws `StrategyPayloadError`; `tests/strategy/mapper.test.ts` — three tests. |

**This is the fourth appearance of one shape in this project**, and the first
caught *during* execution rather than at the gate:

| | Where | Value |
|---|---|---|
| PG-003 | domain error | `expectedRevision ?? -1` |
| PG-101 | agent mapper | `slotUsage.limit ?? 0` |
| PG-201 | route handler | `Number(formData.get(…))` |
| **PG-301** | **strategy mapper** | **`id ?? ''`, `revision : 0`** |

The mechanical guard added in `wire-the-app` covers `expectedRevision` and form
coercions; it does not cover a mapper defaulting an identifier, which is why this
one still needed a human scan. Extending it is filed as PG-303.

### PG-302 · MINOR · DEFENSIVE_CODE · `payload['strategy'] ?? payload`

| Field | Value |
|---|---|
| **Evidence** | `strategy-adapter.ts:106,131` |
| **Impact** | Tolerates a response shape the tools are documented to wrap. Fails closed — `mapStrategy` now throws without an id and a revision — so a genuinely wrong shape raises rather than producing a half-strategy. |
| **Status** | WONTFIX — deferred |
| **Owner** | the change that first performs a live fork or apply |
| **Verification** | Same family as PG-102; folded into `confirm-agent-write-response-shape`. |

### PG-303 · MINOR · TEST_COVERAGE · The coercion guard does not cover mappers

| Field | Value |
|---|---|
| **Evidence** | `tests/agent/concurrency.test.ts::no identifier is coerced into existence` scans for `Number(form.get(…))` and `<identifier> ?? <value>`; PG-301 was `String(s['id'] ?? '')`, which matches neither pattern |
| **Impact** | The guard was added precisely so a fourth occurrence would fail the build. A fourth occurred and the build stayed green. |
| **Required fix** | Extend the scan to `String(x['id'] ?? …)` and to numeric identifier defaults inside mappers. |
| **Status** | WONTFIX (this change) — deferred, **escalated** |
| **Owner** | next change |
| **Verification** | Filed as `extend-coercion-guard-to-mappers` at **P2**. |

### PG-304 · MINOR · UI · The editor composes one field

| Field | Value |
|---|---|
| **Evidence** | `app/(app)/strategies/[id]/edit/page.tsx` — tagline only |
| **Impact** | The pipeline is complete and tested; the section editor is declared out of scope in the proposal. |
| **Status** | WONTFIX — deferred · **Owner**: backlog `strategy-section-editor` |

## Mandatory Recheck Evidence

| Check | Result |
|---|---|
| `validate author-strategies --strict` | PASS |
| `validate --all` | PASS — 0 errors |
| `npm run typecheck` / `lint` | PASS |
| `npm test` | PASS — 22 files, 351 tests |
| harness regression | PASS — 124 |
| conflict markers / debt markers / console | PASS — none |
| fallback masking on touched paths | PASS after PG-301; remainder judged individually |
| no caller both compiles and applies | PASS — and the exemption is itself tested (SL-8) |
| token claims never grant | PASS — return type and unknown-token behaviour both asserted |
| mismatches never gate | PASS |
| no platform vocabulary outside the adapter | PASS — nine literals scanned |
| routes reach no deeper than the application layer | PASS |
| no wager tool reachable | PASS |

**SL-4 auditor note discharged.** The token parser was to be verified on two
counts. `structure.test.ts::parsed token claims never grant` asserts the return
type is `LocalRefusal | null` and that no `valid`/`permitted`/`ok` shape is
returned; `::an unknown token yields no refusal` asserts the other direction. A
format change degrades to "submit and let the server judge" rather than to an
outage or an authorisation bug. **The exception holds as declared.**

## Gate Decision

One MAJOR fixed; three MINOR deferred with owners, one escalated.

```
Open violations: 0
```

## **DECISION: PASS** — 2026-07-27

Handoff: **archiver**.
