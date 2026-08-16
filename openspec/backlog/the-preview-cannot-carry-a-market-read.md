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

**A live read already answered part of question 1.** `get_strategy` at
v19.1.0 returns a top-level **`marketReadText`** on the strategy itself
(observed 2026-08-15), so the market read is a persisted property of the
strategy rather than a per-preview argument — the preview input is most
likely the *override* for it. That also means the strategy detail read is
carrying a field this product does not map.

Two questions before any UI work, both answerable read-only against the live
platform:

1. What do the two inputs *do* — does `marketReadText` feed prose into the
   rendered report, and is `marketReadLensTicker` the coin it is read
   through?
2. Which of the +66 output leaves appear only when they are sent?

Neither is answered by the declared schema; both are one preview call each.
Related: [[v19-moved-thirty-four-output-schemas]] (the output half of the
same deployment), and the change `the-preview-matches-the-live-contract`.

## Both questions answered 2026-08-16 — two preview calls, read-only, at v19.2.0

The Notes say both questions are *"answerable read-only against the live
platform… one preview call each"*. Two calls were made, identical but for the
two inputs, so the diff is the answer.

**Call A (baseline)** — `timeframe 1h`, `coinSelection {explicit, [BTC]}`,
`sections [includePriceAction]`, neither market-read input sent.

**Call B** — the same, plus:

```
marketReadLensTicker: "BTC"
marketReadText: "BTC last is {last} against VWAP {VWAP}, displaced {dist_VWAP}.
                 Trend {closeChg_trend}. Bar {bar}. Unknown token {nonexistent_token}."
```

### Question 1 — what the inputs do

**`marketReadText` is a template, and the preview is a linter for it.** The
response parses `{token}` markers and returns one `marketReadMarkers[]` entry per
marker:

```json
{"token":"last","index":12,"end":18,"status":"column","resolvedName":null,"resolvedValue":null,"qualifiedForms":[]}
{"token":"VWAP","index":32,"end":38,"status":"column", …}
{"token":"dist_VWAP","index":50,"end":61,"status":"column", …}
{"token":"closeChg_trend","index":69,"end":85,"status":"column", …}
{"token":"bar","index":91,"end":96,"status":"column", …}
{"token":"nonexistent_token","index":112,"end":131,"status":"unknown", …}
```

Three things are established:

- **`status` classifies each marker.** `"column"` when the token matches a
  `markerToken` published in `conditionColumns[]`, `"unknown"` when it does not.
  The five real column tokens resolved; the invented one did not. **So the
  platform will tell an author which of their markers are real** — which is
  exactly the service an authoring UI wants, and the product cannot currently
  ask for it.
- **`index` / `end` are character offsets spanning the braces.** `{last}` at
  index 12 ends at 18 — six characters. So they are directly usable for
  underlining or error-marking the offending span in a textarea.
- **`resolvedValue` and `resolvedName` are `null` on every marker, including the
  five valid ones.** The preview validated the markers and **did not
  interpolate** them. So this call does not answer *"what will my market read
  actually say"*; it answers *"are my tokens real"*.

`marketReadLensTicker: "BTC"` produced no visible effect on its own — see below.

### Question 2 — which output leaves appear only when the inputs are sent

**Exactly one family: `marketReadMarkers[]`.** Everything else in the two
responses is byte-identical, including `renderedSections`, `conditionColumns`,
`budgetUsage` and `conditionVerdictTally`. The other four market-read outputs
stayed empty in **both** calls:

```
marketReadPreview        null   (both calls)
markerConditions         []     (both calls)
conditionsTableText      null   (both calls)
tradeConditionsBlockText null   (both calls)
```

So of the 38 market-read leaves this item shares with #301, sending the two
inputs turns on `marketReadMarkers[]` and nothing else.

### What that leaves, narrower than the item was filed as

The remaining question is no longer *"what do these inputs do"* but **"what
gates the other four?"** The most likely answer is the `conditions` input, which
was deliberately not sent in either call and which `markerConditions` /
`conditionsTableText` / `tradeConditionsBlockText` all name in their shape. That
is one more preview call for whoever takes this — send a condition alongside the
market read and diff again.

`marketReadPreview {gridText, tradeText, lensTicker}` is the one that is odd:
`lensTicker` was supplied and it still came back `null`, so it is gated on
something other than the lens.

### What is now buildable, and what is not

**Buildable, and small**: a marker check in the authoring UI. The product holds
`marketReadText` on the strategy already (this item's own note — `get_strategy`
returns it top-level, unmapped), and one preview call classifies every marker in
it with byte offsets. That turns "type prose and hope" into "the platform says
this token is not a column, here".

**Not buildable on this evidence**: any rendering of what the market read will
*say*. `resolvedValue` is null, so the product has nothing to render, and
inventing the interpolation locally would be the derivation this repository
refuses elsewhere.

Still p3 — the preview works without any of it, and this remains unclaimed
capability rather than a defect.
