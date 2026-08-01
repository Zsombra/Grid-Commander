# Proposal: Apply Sends The Plan The Platform Requires

## Why

The sixth dead write path, found the first time `apply_strategy_plan` was
walked live (2026-07-31, the operator-authorized slot shuffle). `toApplyPlan`
projects the compiler's `approvedPlan` into the wire plan — and the
projection, built against an older schema (findings-strategies F-2), omits
three fields the platform now requires: `expectedRevision` (top level of the
approved plan), `conditions` and `conditionVerdicts` (in `postState`).
Verbatim: `-32602 … "path": ["request","plan","expectedRevision"] …
"Required"`. Every apply this product ever composed was rejected by input
validation.

The guard that should have seen it could not: `payload-conformance` lists
`request.plan` as PASS_THROUGH — "the server's own approvedPlan handed
straight back — the product never constructs its 22 required internal
paths". That belief was wrong: the product *does* construct the plan, via
the projection, and the pass-through exemption is exactly where the defect
hid.

## What Changes

- `toApplyPlan` carries `conditions` and `conditionVerdicts` from
  `postState`, and `expectedRevision` from the approved plan's top level
  when present (CREATE plans do not accept it; UPDATE/RESTORE require it) —
  matched against the live shape mapped by a read-only compile probe.
- The PASS_THROUGH exemption for `request.plan` is deleted;
  `payload-conformance` now holds `toApplyPlan`'s real output against the
  declared required paths and closed variant sets, with `anApprovedPlan`
  updated to the live shape.
- Live proof: `tests/live/apply-probe.test.ts` (committed, key-gated) runs
  the operator's slot shuffle — archive an unbound strategy, fork, compile,
  **apply**, verify, archive the fork, restore the strategy.

## Capabilities

None modified — `strategy-authoring` already requires apply to work; this
makes it true.
