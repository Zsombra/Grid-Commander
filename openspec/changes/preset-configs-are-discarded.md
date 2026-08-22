---
id: preset-configs-are-discarded
title: The catalog ships each preset's fourteen values and the mapper drops them
type: feature
status: done
priority: p2
created: 2026-07-29
updated: 2026-07-31
change: preset-configs-are-discarded
capability: agent-authoring
blocked_by: []
tags: [battlegrid, agent-authoring, catalog]
---

# The catalog ships each preset's fourteen values and the mapper drops them

## What

`get_trading_config_catalog` returns, for each of the five position-management
presets, the **complete fourteen-field configuration** that preset stands for:

```json
{ "preset": "COLT", "label": "Colt", "description": "Patient / wide",
  "tagline": "…", "cardSummary": "…",
  "config": { "enabled": true, "breakEvenEnabled": true, "trailingEnabled": true,
              "timeDecayEnabled": true, "trailingType": "ATR",
              "trailingAtrMultiple": 4, "trailingFixedPct": 2,
              "trailingBufferPct": 0.5, "breakEvenTriggerTpProgressPct": 70,
              "timeDecayGracePeriodMinutes": 120, … } }
```

`mapPositionPresets` (`agent-mapper.ts:211`) keeps `preset`, `label` and
`description`. The `config` block, the `tagline` and the `cardSummary` are
discarded at the boundary and never reach the domain.

## Why it matters

The product currently creates every agent as `positionManagementPreset: CUSTOM`
with values assembled from flat catalog defaults plus three booleans this
product chose itself (`OURS` in `trading-config.ts`). That is the *only* thing
it can do, because the real preset configurations were thrown away one function
earlier.

So an operator cannot say "manage positions like a COLT". They get CUSTOM and a
set of numbers nobody picked deliberately — which is precisely the shape of
problem `An Agent's Spending Limits Are Stated Before It Exists` exists to
prevent, one object over.

There is a second cost. Three of the values this product supplies
(`breakEvenEnabled`, `trailingEnabled`, `timeDecayEnabled`) are chosen by
Grid-Commander because the platform declines to default them — but the platform
*does* state them, five times over, inside these preset configs. Every preset
sets all three to `true`. This product sends `false`. Not wrong, since the
master switch is off, and not informed either.

## Fix

1. Carry `config` (and `tagline`, `cardSummary`) through `mapPositionPresets`
   into `PositionManagementPreset`.
2. Offer the five presets on the create form, sending the preset's own fourteen
   values alongside its label — the shape established in
   `a-preset-does-not-constrain-its-config`.
3. Keep `CUSTOM` for an operator who sets the fourteen themselves.
4. Once a real preset can be sent, revisit whether `OURS` still needs its three
   booleans, or whether the chosen preset answers them.

## Related

- `a-preset-does-not-constrain-its-config` — establishes that a preset is a
  label sent *alongside* its values, not a shorthand the server expands
- `agent-edit-form` — the surface this feeds
- change `every-value-sent-is-one-the-platform-accepts` — declared this out of
  scope, being a defect fix

## Closed 2026-07-31

All four fix points landed (change `preset-configs-are-discarded`): the mapper
carries `config`/`tagline`/`cardSummary`, the create form offers the catalog
presets that arrived with their configuration (plus CUSTOM, the default),
choosing one sends the platform's own fourteen values with the label beside
them, and an unanswerable preset name is refused like an unknown brain preset.

On fix #4 (revisit `OURS`): kept. The three booleans remain the product's own
answers **for the CUSTOM path only** — a chosen preset answers all three
itself, five times over, and the preset path takes none of `OURS`. The list
stays exactly as honest as before, now with a smaller blast radius.
