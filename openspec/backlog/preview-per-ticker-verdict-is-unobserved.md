---
id: preview-per-ticker-verdict-is-unobserved
title: conditionOutcomes declares a required per-ticker verdict nothing has ever seen
type: question
status: done
priority: p3
created: 2026-08-06
updated: 2026-08-06
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, conditions, preview, observed-vs-declared]
---

# The declared field with no capture behind it

`the-condition-outcomes-are-legible` renders `conditionOutcomes` from the live
capture of 2026-08-04. The **declared** output schema of
`preview_strategy_report` carries one more field than that capture shows, and it
is the most decision-relevant one on the payload.

## What

`docs/battlegrid-mcp-capabilities.json`, `preview_strategy_report`,
`outputSchema.properties.conditionOutcomes.items`:

```json
{ "required": ["ticker", "outcomes", "verdict"],
  "properties": {
    "verdict": { "anyOf": [
      { "enum": ["UP", "DOWN", "NEITHER", "UNRESOLVED"] },
      { "type": "null" } ] } } }
```

Declared **required**, per ticker. Not modelled: no capture this repo holds
shows it. Neither the payload in `condition-outcomes-are-unrendered.md` nor the
one quoted in `2026-08-05-the-condition-layer-is-legible/proposal.md` carries a
`verdict` key at all, and the surface probe's own observation of the tool
(`docs/battlegrid-mcp-surface.json`) recorded `conditionOutcomes: []` because it
sent no conditions to resolve.

## Why it matters

`verdict` would be the strategy's own call on that coin — the thing every
condition on the payload exists to produce. Rendering it would turn "here is how
each rule stands" into "and so the strategy would go long on BTC", which is the
question an author is actually asking.

It is p3 rather than higher because the surface is honest without it: the
outcomes render, and nothing claims a direction. This is a field to gain, not a
defect to fix.

## Evidence

- Declared: `docs/battlegrid-mcp-capabilities.json` → `preview_strategy_report`
  → `outputSchema.properties.conditionOutcomes`
- Observed: `openspec/backlog/condition-outcomes-are-unrendered.md`, the
  2026-08-04 capture — `{ticker, outcomes}` only
- Not modelled: `src/domain/strategy/condition-outcome.ts` says so and why

## Notes

**The call that settles it, already written.** `tests/live/preview-probe.test.ts`
gained a case that finds a strategy carrying conditions, previews it over BTC and
ETH, and prints the resolved rows. Run it with a key:

```
BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/preview-probe.test.ts
```

If the field is there, `TickerOutcomes` gains it and the preview surface can
state the strategy's call per coin. Modelling it before that run would be
modelling a shape nobody has seen — the mistake this product has made and paid
for four times.

---

# Observed 2026-08-06 — the field is there, populated, on every row

The call this item names was run against `Dunkirk (fork)` (account 1, revision
4, two conditions) over BTC and ETH.

```
row[0] keys: ticker, outcomes, verdict
HAS verdict: true
```

```json
{"ticker": "BTC", "outcomes": [ … ], "verdict": "NEITHER"}
```

Both rows carried it, both `"NEITHER"` — correct for the state, since every
clause on both conditions resolved `FALSE` for BTC and the ETH rows were mixed.
`UP`, `DOWN` and `UNRESOLVED` remain undeclared-but-unseen; `null` is declared
and unseen.

## The capture also carries more than the item recorded

Two fields on each outcome that the earlier captures do not show:

```json
{"conditionKey": "ALL_AGREE_UP", "name": "…", "outcome": "FALSE",
 "evidence": [ … ], "counts": null, "provisional": true}
```

`provisional: true` on all four outcomes, and `counts: null` — the latter is
presumably the `n`-of-`m` count for a group condition, which these two are not.
Each evidence entry is `{kind, sectionKey, header, op, operand, literal,
outcome}`, e.g.

```json
{"kind": "clause", "sectionKey": "includeTrendStrength", "header": "ADX_state",
 "op": "in", "operand": "weak", "literal": "developing | trending | extreme",
 "outcome": "FALSE"}
```

Payload top level: `renderedSections, tokenCountModel, budgetUsage,
conditionOutcomes, rankScopingNote`.

## So this is now buildable

`TickerOutcomes` gains `verdict`, and the preview surface can state the
strategy's own call per coin — which is the question an author is actually
asking, and the reason this was filed. Two things to hold to when it is built:

- **`verdict` is declared `enum | null`.** A null verdict is a declared state
  nothing has seen, so it must render as a named state, not as an absence and
  not as `NEITHER`. The two mean different things: `NEITHER` is the strategy
  saying it would not act, `null` is the strategy not having answered.
- **`provisional: true` was on every outcome observed.** Nothing establishes
  what a non-provisional outcome is or when one appears. Do not caption the
  verdict with a confidence this product cannot explain — render the flag as
  the platform's own word if it is rendered at all.

Only the enum's four members are observed as *declared*; only `NEITHER` is
observed as *returned*. The surface must not enumerate the other three in prose
as though it has seen them.
