---
id: preview-per-ticker-verdict-is-unobserved
title: conditionOutcomes declares a required per-ticker verdict nothing has ever seen
type: question
status: open
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
