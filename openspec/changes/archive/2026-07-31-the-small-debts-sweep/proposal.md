# Proposal: The Small Debts Sweep

## Why

Five filed P3 debts, each under an hour, all offline — batched while the
platform outage blocks live work. No spec deltas: every fix tightens an
implementation against behavior already required.

## What Changes

1. **`audit-order-tiebreak`** — `listForUser` orders by `created_at DESC, id
   DESC`; two entries in one millisecond come back stably. The fake mirrors
   it.
2. **`audit-complete-unknown-id`** — `complete()` checks the affected row
   count and throws on zero; a completion aimed at nothing stops reporting
   success. No replacement row is manufactured.
3. **`a-refused-confirmation-does-not-say-which-way-it-failed`** —
   `ConfirmationStore` gains `diagnose()`, a read-only post-mortem the guard
   calls after a failed consume. The four causes get four messages with four
   different next steps (expired / already used / values changed / not
   recognised). `consume` itself stays the single atomic spender.
4. **`compile-intent-shape-lives-in-two-places`** — the compile UPDATE
   intent gets a domain builder (`compileUpdateIntent`); the edit page (via
   the presentation wrapper, W-D) and the conformance guard both call it, so
   the guard can no longer keep checking yesterday's shape.
5. **`import-check-js-only`** — `design_surface_incomplete_sources` says so
   when a surface's sources contain no JS-family files instead of silently
   checking nothing.

## Capabilities

None modified. Verification-and-hygiene only.
