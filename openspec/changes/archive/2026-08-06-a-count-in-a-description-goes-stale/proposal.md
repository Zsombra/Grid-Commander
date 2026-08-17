# Proposal: A Count In A Description Goes Stale

## Why

This project's loudest lesson is that **BattleGrid's tool count never moves
while everything under it does** — four deployments, 110 tools every time. The
surface map has a section called "The count is not the check".

Grid-Commander then hard-coded two counts of its own, into descriptions it
serves to a language model:

```
list_signal_library : 'All 82 signals a strategy rule can reference…'
read_metric_index   : 'The 75 metrics a report column can be built from, across ten families.'
```

Counted live against v9.0.0 on 2026-08-06, by sweeping every category:

| claimed | actual |
|---|---|
| 82 signals | **84** |
| 75 metrics | **84** |

Both were true when written and neither is now. v9 added two `FLOW_DIVERGENCE`
signals and six metrics, and removed `VOLUME_RATIO`. Nothing failed, because
nothing checks a sentence.

**A model is the wrong audience for a number that goes stale.** It will repeat
"there are 82 signals" to an operator with the authority of a tool description,
and the tool it is describing will return 84.

## What Changes

- The two tool descriptions stop counting. They say what the tool answers; the
  tool itself returns the list, which is the only count that can be right.
- `docs/MCP_SERVER.md` drops the same two numbers from its tool table.
- Three code comments that assert "82 signals" are corrected to describe the
  property rather than the tally — the reasoning they carry is about *rules
  having weights*, not about how many there are.
- **A guard**: no tool description on this surface may state a count of things
  the platform owns. This is the durable half; without it the twenty-sixth
  description does it again.

## What Is Not Changed

`docs/BATTLEGRID_MCP_REFERENCE.md` and `docs/BATTLEGRID_SURFACE_MAP.md` keep
their counts. They are regenerated from a live probe and both name the server
version and date they were taken from — a count that says when it was true is a
measurement, not a claim.

## Capabilities

**Modified**: `mcp-control` — one MODIFIED requirement.
