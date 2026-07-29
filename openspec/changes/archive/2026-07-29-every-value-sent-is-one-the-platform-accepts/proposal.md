# Every value sent is one the platform accepts

## Why

`create_intelligence_agent` has never succeeded. Not once, in the life of this
product. A live probe against the operator's real account returned:

```
MCP error -32602: Input validation error:
  brain.kind — Invalid discriminator value. Expected 'PRESET' | 'CUSTOM'
  tradingConfig.positionSizePresets.sizingStrategy —
      Invalid enum value. Expected 'MANUAL' | 'VOLATILITY_AUTO', received 'FIXED'
```

Two literals, both invented by this product, neither ever checked against
anything:

1. `brainToArgument` emits `kind: 'preset'`. The schema says `const: "PRESET"`.
   The domain's own discriminator is lowercase — correctly, it is internal — and
   the function that renders it for the wire passed it straight through.
2. `positionSizePresetsFrom` emits `sizingStrategy: d['sizingStrategy'] ?? 'FIXED'`.
   The catalog declares no `sizingStrategy` default, so the fallback always
   fires, and `FIXED` is not one of the two values the enum permits.

The second is the more instructive one. It reads like a default being looked up.
It is a guess wearing a default's clothes, and the `??` is what made it look
answered.

**The gap in the spec.** `Agent Fields Are Offered Only From Values The Platform
Confirms` governs values *offered to the operator* — models, presets, bounds.
Neither of these was offered to anyone. They are values the product supplies on
the operator's behalf: discriminators, structural literals, and the completions
that make an all-or-nothing `tradingConfig` complete. Nothing governed those, so
nothing checked them.

**Why no test caught it.** `docs/battlegrid-mcp-surface.json` records
`input_required` and `input_optional` — *field names, top level only*. It has
never recorded a single enum or const. So `tests/architecture/mcp-conformance.test.ts`
could check that `createAgent` sends a `brain` key, and could not check that the
`brain` it sends is one the platform would take. The artifact was missing the
half that mattered.

Four more invented values survive today because they happen to be acceptable:
`trailingType: 'ATR'` (in the enum, by luck), and three booleans
(`breakEvenEnabled`, `trailingEnabled`, `timeDecayEnabled`) the catalog does not
default either. They are the same mistake with a kinder outcome.

## What Changes

- `brainToArgument` renders the wire constants `PRESET` / `CUSTOM`. The domain
  union keeps its own lowercase discriminator; the boundary is where the
  platform's spelling belongs.
- `positionSizePresetsFrom` sends `sizingStrategy: 'MANUAL'` — the mode that
  uses the preset percentages this product actually supplies — stated as this
  product's choice rather than disguised as a lookup.
- The values the catalog does not default stop pretending to be defaults. They
  are named in one place, with what each is and why it is safe.
- `tools/probe_mcp_surface.py` records `input_constants`: every enum and const
  in every tool's input schema, at any depth, as `dotted.path → [values]`.
  Allowed values only — no account data, and no key.
- The same tool gains three fixes the probe needed to survive doing it. Its
  `shape()` capped at depth 2, which is one level short of every answer — a
  paginated response nests `entries[] → {…}` before reaching a field, so
  `get_user_thought_log` recorded sixteen key names and not one type. Six levels
  now, still leaking nothing: every leaf is `type(...).__name__`. And `rpc()`
  retries with backoff and parses SSE frames, because a single timeout used to
  abandon the whole run including the `tools/list` everything else depends on.
- A new guard, `tests/architecture/wire-values.test.ts`, checks every literal
  the product can put on the wire against that record. It fails on both defects
  when they are re-injected.
- The live write probe covers the agent create path end to end, with
  `tradingMode: OFF`.

## Capabilities

- `agent-authoring` — one requirement added.

## Out of Scope

- **The position-management preset configs the catalog ships and this product
  discards.** `get_trading_config_catalog` returns all fourteen values for each
  of the five presets; `mapPositionPresets` keeps only preset/label/description.
  Offering a real preset instead of `CUSTOM` plus completions is a feature, not
  a defect fix. → backlog.
- **`CUSTOM` as a brain preset.** The live schema's preset enum has eleven
  values; the adapter's `BRAIN_PRESETS` has ten, omitting `CUSTOM`. Nothing is
  broken — the product simply cannot offer it. → backlog.
- Re-probing every tool's *response* for its own sake — no new tools are called
  and the called set is unchanged at 21.

  The observed half of the artifact **does** change, which an earlier draft of
  this proposal wrongly said it would not. Raising `shape()`'s depth was not
  scope creep so much as the same defect one door down: the record was storing
  names where it needed to store values on the input side, and names where it
  needed types on the output side. Fixing one and leaving the other would have
  left the next mapper guessing whether `confidenceScore` is a number — the
  guess that made `sizingStrategy` wrong.
