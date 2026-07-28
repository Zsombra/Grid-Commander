# Data Pipeline Review — close-the-reachability-gap

- Checklist source: `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`
- Status: `PENDING EXECUTION EVIDENCE`

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
| 0 BattleGrid | ✗ | No new call site outside the composed adapter | PENDING |
| 1 Database | ✗ | No migration; `db:generate` reports no change | PENDING |
| 2 Schema definitions | ✗ | Untouched | PENDING |
| 3 Queries | ✗ | Untouched | PENDING |
| 4 Mappers | ✗ | Untouched | PENDING |
| 5 Use case | ✗ | **None modified** — the falsifiable claim of DL-107 | PENDING |
| 6 Route handlers | ✓ | Every new page reads via `acting()`; every write via a server action | PENDING |
| 7 Client state | ✗ | None exists | PENDING |
| 8 Client components | ✓ | Components gain a prop, not a decision | PENDING |
| 9 Pipeline completeness | ✓ | Four paths reach their use case for the first time | PENDING |

## Iron Rule Check

| Question | Answer | Evidence |
|---|---|---|
| Does any new page recompute what a use case already decided? | PENDING | |
| Does the apply action re-derive the plan instead of using `toApplyPlan`? | PENDING | |
| Does any new page introduce a default that masks missing data? | PENDING | `rg "\?\?"` over touched paths |

## Contract Map

`Internal only.` Three components gain a required `action` prop. No port, DTO,
or domain type changes.

## Findings

_To be filled by the executor with `path:line` evidence._

## Verdict

`PENDING EXECUTION EVIDENCE`
