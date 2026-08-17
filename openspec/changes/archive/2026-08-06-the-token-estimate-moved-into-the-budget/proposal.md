# Proposal: The Token Estimate Moved Into The Budget

## Why

BattleGrid v9.0.0 stopped returning `estimatedTokenCount` from
`preview_strategy_report`. It did not remove the number — it moved it into the
budget gauges as a used/cap pair, and said so in its own description:

> Returns server-owned budget usage — **including the estimated-token budget as
> used/cap** — without saving or mutating strategy state.

Grid-Commander still reads the field that is gone. Observed live on 2026-08-06,
from the preview probe against a real strategy:

```
sections 5 | ~null tokens (o200k_base) | gauges … estimatedTokens 1767/16000
```

So `/strategies/[id]/preview` renders

> Cost — **Token estimate unavailable** (counted as o200k_base)

and directly beneath it, in the same section, `estimatedTokens: 1767 of 16000`.
The page names the model that did the counting, declares the count missing, and
then prints it. The number was never unavailable.

Caught by the surface map: `declared_output` lost the field, and the live probe
confirmed the payload had too — declared and observed agreeing, which is the
pair this project has learned not to trust separately.

## What Changes

- `ReportPreview` drops `estimatedTokenCount`. The gauge is the platform's
  model now, and it is the better one: a bare count cannot say how close to the
  cap it is, and `estimatedTokens 1767/16000` can.
- The preview page stops claiming a count is unavailable. `tokenCountModel`
  survives in the payload and stays, as a note on how the budget was measured
  rather than as an orphaned qualifier on a missing number.
- A test pins the shape against the v9 payload, so a fixture carrying the old
  field cannot make this look like it still works.

## What Is Not Done

**No fallback that reconstructs `estimatedTokenCount` from the gauge.** It would
keep the page's sentence alive at the cost of modelling a shape the platform no
longer has — and this product's whole failure history is fixtures that outlived
the payloads they described.

## Capabilities

**Modified**: `strategy-authoring` — one MODIFIED requirement.
