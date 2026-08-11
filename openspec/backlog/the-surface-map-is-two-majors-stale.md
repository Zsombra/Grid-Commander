---
id: the-surface-map-is-two-majors-stale
title: The probe records payload shapes, so the authoring vocabulary's values are unrecorded
type: risk
status: done
priority: p1
created: 2026-08-06
updated: 2026-08-11
change: "the-count-held-and-the-fields-moved"
capability: platform-mapping
github: "92"
blocked_by: []
tags: [battlegrid, surface, vocabulary, freshness]
---

# The authoring vocabulary's *values* are recorded nowhere

> **This item was filed with the wrong headline and corrected the same day.**
> The original claim was "the recorded surface is two majors stale". It is not:
> `docs/battlegrid-mcp-surface.json` records `battlegrid 11.0.0` and the
> freshness gate passes against the live server (`recorded battlegrid 11.0.0 ·
> live battlegrid 11.0.0`, run 2026-08-06). The id is kept so the link from
> `_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` does not rot.

## What

`tools/probe_mcp_surface.py` records a response's **shape**, deliberately and
for a good reason — "the account's real data does not belong in a committed
artifact". For most tools that is exactly right.

For `list_strategy_vocabulary` it loses the thing that matters. The vocabulary
payload *is* the authoring contract, and it is almost entirely values:

```json
// what surface.json records
"budgets": {"strategyConditions": "int", "conditionClauses": "int", …}
"metrics": [{"transformIds": [ … ]}]
```

```json
// what the platform actually answers
"budgets": {"strategyConditions": 16, "conditionClauses": 16, "sections": 32, …}
"timeframes": ["1m","5m","15m","1h","4h","1d"]
"timeframeRefs": [{"rel":"regime","resolvedByAnchor":{"1h":null, …}}]
```

So these facts, all established live on 2026-08-06, appear in **no committed
artifact**:

| Fact | Where it lives today |
|---|---|
| 16 transform ids, incl. `efficiency`, `maxShare` | nowhere — `grep -r efficiency docs/` finds nothing |
| `strategyConditions: 16`, `conditionClauses: 16` | recorded as `"int"` |
| only **6 of 13** enum timeframes are enabled | nowhere |
| `rel: regime` resolves to `null` for every anchor | nowhere |
| per-metric legal `transformIds` | recorded as an untyped list shape |

## Why it matters

**Three of these produce silently wrong output rather than a refusal.**

1. **`rel: regime` is inert.** A column written against the regime timeframe
   reference resolves to nothing on every anchor — a column that renders empty
   rather than a call that fails. Structurally identical to the v9
   `preview_strategy_report` section-body defect, which rendered five headed
   sections with no body while every gate stayed green.
2. **`strategyConditions: 16` / `conditionClauses: 16` are 4× tighter than the
   `maxItems: 64` the compile schema declares.** Anything budgeting conditions
   from the schema over-commits fourfold. `docs/REPORT_TABLE_GRAMMAR.md` lists
   four budget gauges; there are six.
3. **Only 6 of 13 enum timeframes are enabled** (`1m 5m 15m 1h 4h 1d`). A
   strategy authored from the schema enum can name a timeframe the platform
   refuses.

**And the freshness gate cannot see any of it.** `tests/live/surface-freshness.test.ts`
compares `serverInfo.version` — nothing more. A deployment that changes the
budget numbers, retires a timeframe, or adds a transform while leaving the
version alone passes green. The gate's own docstring says a version mismatch
"means nothing here knows whether it is [broken]" — the same is true, silently,
of every value it does not record.

The three unrecorded transforms are the opposite problem: capability the product
does not know it has. `efficiency` (Kaufman ER) and `maxShare` (volume
concentration) discriminate trending from choppy conditions, and they appear in
the platform's own `includeSubTimeframe` section — which measured as the
second-best-performing context module across the live agent population
(+0.600/trade, `_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` §D.2).

## Also: two records disagree with each other

- `docs/battlegrid-mcp-surface.json` → `server.version: "11.0.0"`, probed
  `2026-08-06T15:12:56Z`
- `docs/battlegrid-mcp-capabilities.json` → `serverInfo.version: "9.0.0"`, while
  its schemas already carry v11-era content (84 metrics, no `VOLUME_RATIO`,
  `crossDetect` present)
- `docs/BATTLEGRID_SURFACE_MAP.md` line 3 → prose says "against **`battlegrid
  v9.0.0`**", beside a JSON file that says 11.0.0

The data was regenerated; the narrative and the capabilities `serverInfo` were
not. Nothing checks that the three agree.

## Evidence

Probed read-only 2026-08-06, filtered by the server's own `readOnlyHint`:

- `initialize` → `{"name":"battlegrid","version":"11.0.0","protocol":"2025-06-18"}`
- `list_strategy_vocabulary(category)` × 10 → 84 metrics, **16** transform ids,
  `budgets: {sections:32, sectionColumns:32, columnLookback:32,
  distinctTimeframes:8, strategyConditions:16, conditionClauses:16,
  estimatedTokens:16000}`, `timeframes: ["1m","5m","15m","1h","4h","1d"]`
- `timeframeRefs[3]` → `{"rel":"regime","resolvedByAnchor":{"1m":null,"5m":null,
  "15m":null,"1h":null,"4h":null,"1d":null}}`
- `BATTLEGRID_API_KEY=… npx vitest run tests/live/surface-freshness.test.ts`
  → 2 passed, `recorded battlegrid 11.0.0 · live battlegrid 11.0.0`

## Notes

The fix is not "record everything" — the shape-only rule exists because account
data must not be committed, and that rule is right. The vocabulary is the
exception that earns a carve-out: it is **platform-owned, account-independent,
and small**. Nothing in `list_strategy_vocabulary` is anyone's private data.

Suggested shape: record the vocabulary payload *verbatim* into its own artifact
(`docs/battlegrid-vocabulary.json`), and extend the freshness gate to compare
transform ids, budget values and enabled timeframes rather than the version
string alone. That turns three classes of silent breakage into a failing test —
which is the standard this repo already holds everywhere else.

Regenerate with `BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py`, then
`tools/generate_mcp_reference.py`. Note that regenerating does **not** currently
fix the prose header in `BATTLEGRID_SURFACE_MAP.md` or the `serverInfo` in
`capabilities.json` — both need attention separately.

## Resolved 2026-08-11 — the carve-out landed, by `the-count-held-and-the-fields-moved`

The ask this item narrowed to is built, on the same day v17.2.0 demonstrated
its premise live (a tool count that held at 114 while seventeen tools changed
underneath — the version string moved this time, but the pattern is the one
this item names):

- **`docs/battlegrid-vocabulary.json`** — `tools/probe_vocabulary.py` records
  `list_strategy_vocabulary` verbatim for every category the platform
  answers, with server version and probe time. The facts this item said
  lived nowhere are now committed: `budgets` as numbers
  (`strategyConditions: 16`, 4× tighter than the compile schema's
  `maxItems: 64`), the 6-of-13 enabled timeframes, all 16 transform ids —
  `efficiency` and `maxShare` included.
- **The live gate compares values now**:
  `tests/live/surface-freshness.test.ts` checks budgets, enabled timeframes
  and transform ids per category against the artifact, so a values-only
  deployment fails a named gate instead of passing green.
- **The offline structural check holds the carve-out to its own terms**:
  `tests/architecture/surface-freshness.test.ts` fails if the artifact's
  budgets collapse back into shape strings, if it stops naming its server,
  or if its server version diverges from the surface record's.
- The **"two records disagree" section was already resolved** by the v16
  regeneration of 2026-08-10 (capabilities `serverInfo` and the map's prose
  header both moved), and stayed consistent through today's v17.2.0
  regeneration.
- `timeframeRefs`' inert `rel: regime` is *recorded* now (the artifact
  carries `resolvedByAnchor` verbatim); whether to warn on it at authoring
  time remains future work under `four-signals-depend-on-a-timeframe-columns-cannot-reach`.

