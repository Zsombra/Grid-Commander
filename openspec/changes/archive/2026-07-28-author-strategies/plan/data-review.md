# Data Pipeline Review: author-strategies

Against `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`.

## Scope

No new tables. BattleGrid owns strategy state; the only local writes are the
existing audit log and a confirmation token.

## Checklist Matrix

| Rule | Where | Evidence |
|---|---|---|
| Iron Rule — one source of truth | `strategy-adapter.ts` | No strategy is persisted; the roster is read live |
| **The blast radius is the platform's number** | `strategy-adapter.ts:mapStrategy`, `compiled-plan.ts:blastRadius` | Read from `boundAgentCount`, never derived by grouping agents — which would be wrong whenever an agent moved between two reads |
| **The diff is the platform's** | `compiled-plan.ts:changedAxes` | Taken from `diff.changedAxes`; recomputing it would be a second opinion on a question the server answered |
| **The confirmation copy is the platform's** | `compiled-plan.ts:confirmationSummary` | `reviewContext.confirmationSummary` verbatim; refused rather than composed when absent |
| No client-side recomputation | `plan-review.tsx` | Renders decided values; computes nothing |
| Missing data is a state, not a zero | `mapQuota`, `blastRadius` | Both return `null` when the platform said nothing — the defect three gates have caught |
| No silent defaults on identifiers | `toApplyPlan` | Throws `PlanProjectionError` rather than sending a partial plan |
| Nothing is sent that was not compiled | `apply-plan.command.ts` | `toApplyPlan` is the only transformation between review and apply |

## Contract Map

| Fact | BattleGrid | Domain | Notes |
|---|---|---|---|
| Blast radius | `boundAgentCount`, `bindingImpact.boundAgentCount` | `Strategy.boundAgentCount`, `blastRadius()` | `null` when unreported |
| Quota | `quota.{used,limit,remaining}` | `StrategyQuota \| null` | `null` when no limit reported |
| Plan validity | `planToken` claims | `PlanTokenClaims` | Refuse-only |
| Applicability | `viability.viable` | `isViable()` | The gate |
| Concerns | `mismatches[]` | `concerns()` | **Advisory** |
| Changed axes | `diff.changedAxes` | `changedAxes()` | Server's diff |
| The plan | `approvedPlan` (11 keys) | `toApplyPlan()` → 15 keys | Projection, not forward |

## Findings

**F-1 — `mapQuota` returns `null` rather than zeroes when `limit` is absent.**
Written that way from the start because this is the fourth appearance of the same
shape in this project — `expectedRevision ?? -1`, `slotUsage.limit ?? 0`,
`Number(formData.get(...))`, and now a strategy quota. Zeroes would render as
"you have none left", a specific claim nobody made.

**F-2 — `approvedPlan` is carried whole and projected once.** It is stored as
received on `CompiledPlan.approvedPlan` and narrowed only at the moment of apply.
Narrowing earlier would discard `viability`, `diff` and `bindingImpact` — which
the review screen needs — and narrowing at each call site would be the second
projection F-1 of the architecture review forbids.

## Status

EVIDENCE RECORDED
