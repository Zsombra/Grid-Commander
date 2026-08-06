# Master Plan — a-drafted-condition-can-be-saved

Current phase: Execution complete, live walk outstanding (task 1.9)

## Non-Negotiable Constraints (from config + checklists)
1. Domain never imports the MCP client; BattleGrid stays behind the port.
2. Every write confirmed by a person against the exact described values; the
   token minted by a describe and spent by a perform, and the target built only
   in `confirmation.ts` (edit-binding guard). This write reuses
   `strategyPlan(strategyId, intentDigest)` — no new target, no second digest.
3. `expectedRevision` from a read someone made — never defaulted, never `?? 0`.
4. Every write audited; refusals reach the surface acted from (`?problem=`).
5. No platform vocabulary written down; nothing modelled that has not been
   observed — and where a behaviour *was* observed once, it is re-checked at
   runtime rather than assumed (`postStateDrift`).
6. Results of writes are read (write-results guard; here the redirect's fresh
   strategy read, with the ledger row carrying the verdict).
7. Quality gates: `npx tsc --noEmit`, the vitest suites, `eslint` on changed files.

## File Inventory
See design.md, File changes. No drift during execution.

## Requirement Coverage Matrix

| Requirement | Impl | Proof |
|---|---|---|
| A Condition Is Written Only As The Whole List, Behind The Ceremony | `condition-write.ts` + `describe-condition-write.query.ts` + `conditions/save` page + existing `ApplyPlanCommand` | `tests/strategy/condition-write.test.ts` — the list submitted whole and the platform's own objects untouched; replace-in-place; removal; a removal of a key the strategy lacks mints nothing; an unexpressible form never compiles; the agreement dies against a moved digest; `tests/rendering/condition-write.test.ts` for every branch |
| A Condition Write Names The Whole List And What It Would Strand | `addendum()` in the describe, appended before minting | unit: the stored token's consequence carries the list, the "takes the condition list whole" sentence, the stranded reference and the agent count; the pre-existing dangle is not blamed on the edit; rendering: the same sentences on the page |
| A Plan That Would Save Something Else Is Refused, Not Described | `postStateDrift` in `compiled-plan.ts` | unit: clean when the compiler echoes; catches a list not taken whole, an absent list, a moved tagline, moved sections; tolerates empty-vs-absent tagline and compiler section order; describe-level: drift mints nothing; rendering: the branch says nothing was written |
| A Drafted Condition Can Be Tried Without Being Saved (MODIFIED) | unchanged try surface + the separate route | `tests/strategy/condition-draft.test.ts` still holds that the five try-surface files reach no compile, no apply and carry no server action — untouched by this change; `tests/rendering/condition-draft.test.ts` holds the narrowed promise |

## Phase 2 Review Checklist
- [x] Architecture: port boundary, composition wiring, one confirmation target,
      one digest, `postState` read in one place
- [x] Data: the compile request against BattleGrid's declared UPDATE variant; the
      condition payload against the declaration rather than the flattened record
- [x] UI: every failed read explains itself; every refusing branch says nothing
      was written; declining goes to the strategy, never the roster

EXECUTION READY FOR PRODUCTION GATE — with task 1.9 (the live walk) open by
design: live MCP calls are the integrator's, and the gate should read DL-9
before deciding whether to pass on evidence or hold for it.
