---
id: the-surface-map-is-two-majors-stale
title: The recorded surface says v9.0.0; the live server answers v11.0.0
type: risk
status: open
priority: p1
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: platform-mapping
blocked_by: []
tags: [battlegrid, surface, staleness, vocabulary]
---

# The recorded surface is two majors behind the live server

`docs/battlegrid-mcp-surface.json`, `docs/BATTLEGRID_SURFACE_MAP.md` and
`docs/BATTLEGRID_MCP_REFERENCE.md` were all taken from `battlegrid v9.0.0`.
Probed live 2026-08-06 during the trade-category research: the server answers
**`v11.0.0`**.

## What

Two majors shipped underneath the committed artifacts. The tool count is still
110 and no tool was added, removed or reclassified — which is exactly the
failure mode `BATTLEGRID_SURFACE_MAP.md` already warns about ("Do not read an
unchanged 110 as evidence of anything"). What moved is inside the payloads:

| Area | Recorded (v9) | Live (v11) |
|---|---|---|
| transforms | 10 | **16** — adds `efficiency`, `maxShare`, `crossDetect` |
| budgets | 4 gauges | **6** — adds `strategyConditions` 16, `conditionClauses` 16 |
| enabled timeframes | not recorded; enum lists 13 | **6 enabled**: `1m 5m 15m 1h 4h 1d` |
| `rel: regime` | listed as a timeframe ref | **resolves to `null` for every anchor** |
| `BB_PCT_B` | volatility family | **structure** family |
| metric count | 75 | **84** |

## Why it matters

Three of these can produce silently wrong behaviour rather than a refusal:

1. **`rel: regime` is inert.** A column written against the regime timeframe
   reference resolves to nothing on every anchor. That is a column that renders
   empty rather than a call that fails — the same shape of defect as the v9
   `preview_strategy_report` section-body move, which rendered five headed
   sections with no body while every gate stayed green.
2. **Only 6 of the 13 enum timeframes are enabled.** A strategy authored against
   the schema enum can name a timeframe the platform will not accept.
3. **`strategyConditions: 16` / `conditionClauses: 16`** are far tighter than the
   `maxItems: 64` the compile schema declares. Anything planning condition
   budget from the schema will over-commit by 4×.

The three new transforms are the opposite problem — capability the product does
not know it has. `efficiency` (Kaufman ER) and `maxShare` (volume concentration)
are the two operators that discriminate trending from choppy conditions, and
they appear in the platform's own `includeSubTimeframe` section, which measured
as the second-best-performing context module across the live agent population.

## Evidence

Probed read-only 2026-08-06, filtered by the server's own `readOnlyHint`:

- `initialize` → `{"name":"battlegrid","version":"11.0.0","protocol":"2025-06-18"}`
- `list_strategy_vocabulary(category)` × 10 → 84 metrics, 16 transform ids,
  `budgets: {sections:32, sectionColumns:32, columnLookback:32,
  distinctTimeframes:8, strategyConditions:16, conditionClauses:16,
  estimatedTokens:16000}`, `timeframes: ["1m","5m","15m","1h","4h","1d"]`
- `timeframeRefs[3]` → `{"rel":"regime","resolvedByAnchor":{"1m":null,"5m":null,
  "15m":null,"1h":null,"4h":null,"1d":null}}`

Full findings and the numbers built on them:
`_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` §3.5.

## Notes

`tests/live/surface-freshness.test.ts` exists precisely to catch this and is
wired into `./scripts/ci.sh` as a named gate — it found the v5.1.0 deployment on
its first real run. **The gate is not at fault.** It degrades honestly: the
suite is `describe.skip` without `BATTLEGRID_API_KEY` (`tests/live/surface-freshness.test.ts:25`)
and `ci.sh:81` reports `skip "freshness" "no BATTLEGRID_API_KEY; the surface
record's age is unverified"` rather than passing green.

So the finding is narrower and more actionable than "the check failed": **CI has
no path that reaches the live server**, so the one check able to discover a
deployment has never run in CI. Two deployments went unnoticed as a direct
result. The fix is a key in CI (or a scheduled job that runs only the live
gates), not a change to the test.

Regenerate with `BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py`
followed by `tools/generate_mcp_reference.py`, then diff — the interesting part
is not the tool list, it is the vocabulary payload and the budgets.
