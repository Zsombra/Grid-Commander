---
id: compile-intent-shape-lives-in-two-places
title: The compile UPDATE intent literal is mirrored in the conformance guard
type: debt
status: open
priority: p3
created: 2026-07-31
updated: 2026-07-31
change: conformance-sweep-for-required-and-accepted-params
capability: strategy-authoring
blocked_by: []
tags: [conformance, refactor]
---

# The compile UPDATE intent literal is mirrored in the conformance guard

## What

The strategy edit page builds its compile `UPDATE` request as an inline
literal (`app/(app)/strategies/[id]/edit/page.tsx:272`, the `intent` object).
`tests/architecture/payload-conformance.test.ts` holds that payload against
the platform's declaration — but with no exported builder to import, it
mirrors the literal instead, with a comment on the test side saying so.

If the page's shape drifts, the guard keeps checking yesterday's shape and
passes. The create and update payloads do not have this gap: they go through
`buildTradingConfig` / `applyEdit` / `brainToArgument`, which both the product
and the guard call.

## Fix

Extract the intent assembly into a domain builder (it is pure data assembly —
no MCP import needed), have the page and the guard both call it. Product-code
refactor, hence out of the sweep change's declared scope; verifier SUGGESTION
from that change, filed rather than dropped.
