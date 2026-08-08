# Proposal: The Cost Is Only Fresh

## Why

`own-evaluation-probe` failed twice on 2026-08-08 asserting that an owned
evaluation carries its cost. A raw discrimination read settled the mechanism:
BattleGrid serves `pipeline.attempt.ownerView` (the billing join — model,
costUsd, duration) **only for fresh evaluations**. Observed on one agent, six
consecutive logs: populated at ~30 minutes of age, null on every row older
than ~2 hours — including rows that were the newest when the probe failed.
The product is already honest (the spec promises cost only "where the
platform reports" it, and a null renders as unreported, never zero); only
the probe over-asserts.

## What Changes

- The probe asserts the cost **shape** when the platform reports one, and
  asserts the honest degradation (cost read as unreported, not zero) when it
  does not — printing which case ran, so a keyed run still documents the
  platform's current behavior. It fails only if `ownerView` is present but
  unmappable, which is the drift worth failing on.
- `an-owned-evaluations-cost-reads-null` closes with the discrimination
  evidence.

Test-only; no observable product behavior changes (`skip_specs: true`).

## Capabilities

**New**: none. **Modified**: none (the probe is verification tooling).

## Out of Scope

- Any product-surface change — the transient window is the platform's, and
  the surface's unreported-cost rendering already covers it.

## Impact

`tests/live/own-evaluation-probe.test.ts`; the backlog item.
