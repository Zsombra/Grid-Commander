# Proposal: The Probes Catch Up To v17

## Why

The 2026-08-11 write-gated probe runs — the first ever, on both accounts —
proved every mutation path live and failed only on three expectations that
encode an older platform: a refusal shape DL-3 recorded before it drifted, a
demand that a thinking log span more than one page, and two config-width
literals set when the config was 23 fields wide. Each failure blamed healthy
behavior. A probe that fails a working platform gets ignored, and then it
guards nothing.

## What Changes

- `radar-probe` accepts either known refusal shape for a first deployment
  (`RevisionConflictError` or `ToolRefusedError` with `VALIDATION_ERROR`) and
  fails loudly only if a create is ever *accepted* — the moment the product's
  own refusal should be lifted. The stale comment at
  `deploy-agent.command.ts` now records the drift instead of the retired
  shape.
- `write-probe`'s thinking-log check asserts the page never exceeds what the
  server reports, instead of demanding a second page exist.
- Both config-width assertions derive their floor from the committed surface
  record (`tests/support/recorded-surface.ts`: the count of `tradingConfig`
  children the write schema requires — 15 at v17.2) instead of `> 20` / `> 19`
  literals, so the next platform reshaping moves them automatically.

No observable product behavior changes; `skip_specs: true`.

## Capabilities

**New**: none
**Modified**: none — test and comment changes only.

## Out of Scope

- Recording the authoring vocabulary's *values*
  (`the-surface-map-is-two-majors-stale`, p1) — adjacent record work, its own
  change.
- Recording observed tool *response* behavior in the freshness guards — the
  radar drift shows the gap; scoping that is not a lite change.

## Impact

- `tests/live/radar-probe.test.ts`, `tests/live/write-probe.test.ts`,
  `tests/live/proposal-probe.test.ts` — assertions repaired
- `tests/support/recorded-surface.ts` — new shared floor helper
- `src/application/use-cases/deploy-agent.command.ts` — comment only
- Closes backlog: `radar-first-deployment-refusal-drifted`,
  `write-probe-thinking-pagination-assertion-too-strict`,
  `create-probes-assert-a-pre-v17-config-width`

## Amended during execution

Verification on the testing account reached `proposal-probe`'s audit-count
assertion for the first time anywhere and found a fourth stale expectation:
`toBe(1)` over the whole trail, written for the reuse path, fails a fresh
acquisition (arm + agree = 2 writes, both correct). The count is now scoped
to the agree step. Same class, same change.
