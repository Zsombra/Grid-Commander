# Data Pipeline Review — close-the-reachability-gap

- Checklist source: `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`
- Status: `EXECUTION EVIDENCE COMPLETE`

## Scope Summary

Presentation only. No schema change, no migration, no query, no mapper. The
data-pipeline question this change raises is narrow and unusual: **four write
paths that exist in every layer have never had data flow through them**, because
nothing connected the form to the action.

## Source-of-Truth Statement

Unchanged. BattleGrid owns agents, strategies and positions; Grid-Commander owns
connections, audit and confirmations. Nothing here moves a fact across that line.

## Layer Coverage Matrix

| Layer | Touched | What must hold | Status |
|---|:--:|---|---|
| 0 BattleGrid | ✗ | No new call site outside the composed adapter | PASS |
| 1 Database | ✗ | No migration; `db:generate` reports no change | PASS |
| 2 Schema definitions | ✗ | Untouched | PASS |
| 3 Queries | ✗ | Untouched | PASS |
| 4 Mappers | ✗ | Untouched | PASS |
| 5 Use case | ✗ | **None modified** — the falsifiable claim of DL-107 | PASS |
| 6 Route handlers | ✓ | Every new page reads via `acting()`; every write via a server action | PASS |
| 7 Client state | ✗ | None exists | PASS |
| 8 Client components | ✓ | Components gain a prop, not a decision | PASS |
| 9 Pipeline completeness | ✓ | Four paths reach their use case for the first time | PASS |

## Iron Rule Check

| Question | Answer | Evidence |
|---|---|---|
| Does any new page recompute what a use case already decided? | PASS | |
| Does the apply action re-derive the plan instead of using `toApplyPlan`? | PASS | |
| Does any new page introduce a default that masks missing data? | PASS | `rg "\?\?"` over touched paths |

## Contract Map

`Internal only.` Three components gain a required `action` prop. No port, DTO,
or domain type changes.

## Findings

**F-1 — four write paths carried data end to end for the first time.** Layer 6
existed and layer 5 existed; nothing joined them. No layer was added — the join
was.

**F-2 — the apply path carries the reviewed plan rather than recompiling.**
Recompiling would produce the same intent digest with possibly different
contents, which is precisely the case "what is applied is what was reviewed"
exists to forbid. The plan travels through the form and is not trusted: an
altered plan digests differently, the confirmation fails to consume, and the
write is refused before BattleGrid sees it.

**F-3 — no use case, port, repository or mapper was modified.** DL-107's
falsifiable claim held.

## Verdict

`EXECUTION EVIDENCE COMPLETE`
