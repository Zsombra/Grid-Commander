---
id: condition-outcomes-are-unrendered
title: preview_strategy_report resolves every condition against real coins, and nothing renders it
type: feature
status: done
priority: p2
created: 2026-08-04
updated: 2026-08-06
change: the-condition-outcomes-are-legible
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, conditions, preview, derived-truth]
---

# The platform resolves conditions and the preview does not show it

Split out of `the-condition-layer-is-legible`, which renders condition
*definitions* on `/strategies/[id]`. This is the *outcomes* half, deliberately
deferred rather than rushed: the payload is richer than anyone expected and it
belongs on the preview surface that produces it, not on the strategy page.

## What was observed (2026-08-04, live)

`preview_strategy_report` returns `conditionOutcomes`, **per ticker**:

```json
{ "ticker": "BTC",
  "outcomes": [
    { "conditionKey": "ALL_AGREE_UP", "outcome": "FALSE",
      "provisional": true, "counts": null,
      "evidence": [
        { "kind": "clause", "sectionKey": "includeRegimeContext",
          "header": "regTrend_now", "op": "is",
          "operand": "ranging", "literal": "trending up", "outcome": "FALSE" } ] } ] }
```

And on a threshold group: `counts: {trueCount: 4, total: 4, unresolvedCount: 0}`.

## Three things that must not be flattened

1. **`evidence` is the clause-level reason.** `operand` is what was actually
   observed, `literal` what was required. This answers *why* a condition failed
   rather than only that it did — the single most useful thing on the payload,
   and the reason this deserves its own change rather than a footnote.
2. **`provisional: true`** — the bar is not closed and the outcome can still
   change. A provisional `FALSE` shown identically to a settled one is this
   product's characteristic mistake in a new place.
3. **`unresolvedCount`** is a **third state**, not a synonym for false. The
   declared schema gives no hint it exists; it was found by calling.

## Why P2

`/strategies/[id]/preview` already answers "what would the agent read". It can
now also answer "and which of your direction rules would fire, on which coins,
and why not" — from a call the surface already makes.

## First step when taken

Render on the preview surface, per ticker, beside the section text already
shown. Grid-Commander must not compute any of it —
`the-condition-layer-is-legible` makes that a requirement with a test.

## Taken 2026-08-06

`the-condition-outcomes-are-legible`. One thing this item did not know: the
surface's `conditionOutcomes` was empty because the tool resolves only the
conditions it is **sent**, and the preview sent none — so the change is a round
trip, not only a render. The `verdict` field the output schema declares per
ticker is still unobserved and is filed separately as
`preview-per-ticker-verdict-is-unobserved`.
