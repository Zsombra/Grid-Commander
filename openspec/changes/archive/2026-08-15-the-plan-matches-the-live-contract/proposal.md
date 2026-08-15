# Proposal: The plan matches the live contract

## Why

The platform deployed mid-session on 2026-08-15 and its apply began
rejecting `regimeAutoDerive`/`regimeTimeframe` as unrecognized keys —
fields the pre-deployment schema declared required and `toApplyPlan`
still sent. Every strategy apply the product's UI composes was refused by
input validation (#285, the seventh dead write path). Observed both ways
in one minute: the plan with the keys refused, the identical plan without
them accepted (Salamis revision 3 → 4).

## What Changes

- The two keys move from `PLAN_FIELDS_FROM_POST_STATE` to
  `FIELDS_APPLY_REJECTS` — the codebase's own named-rejection mechanism,
  so their absence is asserted by name, with the dated observation in the
  comment.
- The projection test's required-field list drops the two names; the
  existing carries-no-rejected-field loop now covers them automatically.
- The conformance guard's apply case expects **exactly the four
  missing-required rows** the stale artifact produces, by name and dated —
  any other violation still fails, and the expectation self-expires when
  the artifact is re-probed (the rows vanish, the assertion fails, the
  block is deleted).

## Capabilities

**New**: none. **Modified**: none — `skip_specs: true`: this restores the
behavior the strategy-authoring spec already promises (applies the product
composes are accepted); no spec text names the projection's field list.

## Out of Scope

- **Re-probing the surface record.** The artifact is now provably one
  deployment behind and refreshing it needs the BattleGrid key, which this
  environment does not hold. Filed as
  `the-surface-record-is-a-deployment-behind`.

## Impact

`src/domain/strategy/compiled-plan.ts`, `tests/strategy/compiled-plan.test.ts`,
`tests/architecture/payload-conformance.test.ts`. The live proof already
exists: the successful 08:18Z apply used exactly the shape the projection
now produces.
