---
id: the-preview-cannot-carry-a-market-read
title: v19 gave preview_strategy_report two market-read inputs the product does not offer
type: feature
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: strategy-authoring
github: "302"
blocked_by: []
tags: [battlegrid, v19, preview]
---

# The preview cannot carry a market read

## What

v19.1.0 replaced `preview_strategy_report`'s two regime inputs with two new
optional ones: **`marketReadLensTicker`** and **`marketReadText`**. The
product sends neither, and nothing in the authoring UI can produce them.

The same deployment grew the tool's *output* schema by 66 leaves — the largest
output growth in the release — so whatever these inputs turn on is answered in
the response the product already reads and currently maps without.

## Why it matters

The report preview is the one surface holding live market state, and the only
place "would this rule fire right now" can be asked at all. If a market read
changes what the preview renders, the product is previewing a narrower thing
than the platform can show, and the operator cannot tell.

p3 because the inputs are optional and the preview works without them — this
is unclaimed capability, not a defect.

## Evidence

- `docs/battlegrid-mcp-capabilities.json` at v19.1.0:
  `preview_strategy_report.inputSchema.properties` is
  `{coinSelection, conditions, marketReadLensTicker, marketReadText, sections,
  timeframe}`, `additionalProperties: false`, required
  `{coinSelection, sections, timeframe}`. The v18.2.0 generation had
  `regimeAutoDerive` (required) and `regimeTimeframe` in their place.
- The product's composer:
  `src/infrastructure/battlegrid/strategy-adapter.ts` `previewReport`, whose
  regime arguments were removed by `the-preview-matches-the-live-contract`
  (this session) — the same change that made this gap visible.

## Notes

Two questions before any UI work, both answerable read-only against the live
platform:

1. What do the two inputs *do* — does `marketReadText` feed prose into the
   rendered report, and is `marketReadLensTicker` the coin it is read
   through?
2. Which of the +66 output leaves appear only when they are sent?

Neither is answered by the declared schema; both are one preview call each.
Related: [[v19-moved-thirty-four-output-schemas]] (the output half of the
same deployment), and the change `the-preview-matches-the-live-contract`.
