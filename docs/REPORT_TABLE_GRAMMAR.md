# The Report Table Grammar

How custom report tables ("sections") are authored on BattleGrid — the
column grammar, the validation contract, the preview loop, and the
persistence path. Everything here was established **live** on 2026-08-01
against `mcp.battlegrid.trade`; nothing is inferred from declarations
alone. Companion to `docs/BATTLEGRID_MCP_REFERENCE.md` (the tool surface)
and the `strategy-authoring` spec (the product contract).

## The model

A strategy's report is a list of **sections**. A section is either:

- **platform**: `{kind: 'platform', sectionKey: include…}` — one of 22
  prebuilt tables (Price Action, RSI, MACD, …). Contents are the
  platform's; only membership is chosen.
- **custom**: `{kind: 'custom', sectionKey: 'custom:<uuid>', title,
  timeframe, columns: […]}` — a table the author composes, column by
  column.

A **column** is:

```
{ metric, transformId, timeframe: {rel: anchor|lower|higher|regime} | {abs: 1m…1w},
  chainedTransformId?, window? (1–64), offset? (0–64), side? (support|resistance),
  inputs? (≤4 operand metrics), bars? (closed|all), ordering? (hi|lo|far|near) }
```

- **75 metrics** across ten families (price, momentum, trend, volatility,
  volumeFlow, derivatives, structure, regime, crowd, derived), each
  declaring a native output contract (kind/unit/precision/range) and the
  transform ids it legally takes. Runtime source:
  `list_strategy_vocabulary` per category (the `metrics` key IS narrowed by
  category — established live; `templates` is not).
- **Transforms** are per-metric: `get_metric_construction_hints(metric)`
  gives each transform's parameters (with defaults and platform copy), its
  formula, null behavior, operand requirements, and what it chains into.

## The validation contract

`get_strategy_column_contract({column, sectionTimeframe?})` compiles one
proposed column **without reading market values**. Two outcomes, both
content:

**Compiles** → normalized column, effective parameters, outputs (header,
typed unit, meaning, condition operators), the formula with real metric
names substituted, a glossary, null behavior, the timeframe contract
(`requiresSectionTimeframe`, override allowance), and the null sentinel.

**Refused** → structured teaching, never a bare error:

```
{ code: VALIDATION_ERROR, message: <why, in words>,
  details: { authoringCode, path: [column, inputs, 0, metric],
             receivedValue, allowedDomain: {kind: enum, values: […]}
                          | {kind: relation, rule: …, candidates: […]} } }
```

Observed exemplars:

- `REPORT_COLUMN_OPERAND_UNSUPPORTED` — spread on `RSI14` with a `CLOSE`
  operand: "must declare a numeric output in the base's OWN unit AND
  resolve in one of the two homes (candle extractor or bundle scalar)" —
  and the `allowedDomain` names exactly `ADX, CCI20, MFI14, RSI7, STOCH_D,
  STOCH_K`. Unit commensurability is the operand law.
- `REPORT_COLUMN_CONSTRUCTION_FAILED` — `spread` with no `inputs`:
  "transform 'spread' requires params.inputs", with the missing candidate
  named.

**The product rule built on this** (`the-column-grammar-is-learnable`):
refusals are surfaced with their structure — path, received value, legal
domain — never flattened. The platform teaches its own grammar; the
product's job is not to get in the way.

## The family × transform matrix (live sweep, 2026-08-01)

Fourteen metrics, one per family plus the grammar outliers, each swept
against every transform it declares (live, 2026-08-01):

| Metric | Family | Native | TF mode | Transforms that compile |
|---|---|---|---|---|
| `CLOSE` | price | numeric/price | candle | value, trajectory, distance→(trajectory,aggregate), bandTouch |
| `RSI14` | momentum | numeric/oscillator | candle | value, trajectory, classifyZone, rank |
| `CHG_1H` | momentum | numeric/percent | **timeless** | value |
| `ADX` | trend | numeric/oscillator | candle | value, trajectory, classifyZone, rank |
| `EMA_CROSS` | trend | event | candle | value |
| `ATR` | volatility | numeric/signedPrice | candle | value, trajectory |
| `VOLUME` | volumeFlow | numeric/largeCount | candle | value, trajectory |
| `FUNDING_RATE` | derivatives | numeric/percent | **timeless** | value, trajectory, aggregate, rank |
| `OI` | derivatives | numeric/usdLargeCount | **timeless** | value, trajectory, aggregate, rank |
| `FUNDING_LABEL` | derivatives | classification | **timeless** | value |
| `SWING_HIGH` | structure | numeric/price | candle | value, trajectory, distance→(trajectory,aggregate,rank), bandTouch |
| `STRUCT_ZONES` | structure | **entitySet** | timeless | count, nearestZoneType, nearestZoneRange, nearestZoneDist, nearestZoneAge |
| `REGIME_TREND` | regime | classification | timeless | value, trajectory |
| `CROWD_PICK` | crowd | numeric/percent | timeless | value |

Three shapes worth naming:

- **`trajectory` fans out.** One column becomes five headers —
  `X_t3, X_t2, X_t1, X_now, X_trend` — the last a `direction`, not a number.
  Budget accordingly: it is one `sectionColumns` unit but a wide render.
- **`entitySet` metrics have their own transform vocabulary.**
  `STRUCT_ZONES` takes none of the scalar transforms; it takes `count`,
  `nearestZoneType/Range/Dist/Age` — and answers a `priceRange` type no
  scalar metric produces.
- **`classification` and `event` metrics take `value` and little else.**
  Nothing to average, nothing to rank.

### The operand law: spread joins only commensurable units

`spread` is the one transform needing an operand, and the platform enforces
**unit commensurability**, naming the legal set in every refusal:

| Base (unit) | Legal operands |
|---|---|
| `RSI14`, `ADX` (oscillator) | ADX, CCI20, MFI14, RSI7, STOCH_D, STOCH_K |
| `ATR` (signedPrice) | CVD, MACD |
| `VOLUME` (largeCount) | BUY_VOLUME, OBV, SELL_VOLUME, VOL_SMA20 |
| `OI` (usdLargeCount) | NOTIONAL_VOLUME_1D |
| `FUNDING_RATE`, `CHG_1H` (percent) | ATR_PCT, BB_PCT_B, BB_WIDTH, BUY_PRESSURE, CHG_5M/15M/1H/4H/24H, CLOSE_CHANGE, FUNDING_ANN, HIGH_DEV, LOW_DEV, OI_CHG, PPO, ROC12, VOLUME_RATIO |
| `SWING_HIGH` (price) | price metrics — `CLOSE` compiles |

The platform's own words: an operand "must declare a numeric output in the
base's OWN unit AND resolve in one of the two homes (candle extractor or
bundle scalar), or the column would resolve null for every coin or compute
a ratio across incommensurable units."

## The preview loop

`preview_strategy_report({timeframe, regimeAutoDerive, regimeTimeframe?,
sections, coinSelection, conditions?, conditionVerdicts?})` renders the
draft as the literal report text an agent receives — persisted-state-free.

- `coinSelection` is required and bounded: `{mode: 'ranked', limit ≤ 100,
  category?}` or `{mode: 'explicit', tickers: […]}`.
- Returns `renderedSections` (sectionKey/title/text), `estimatedTokenCount`
  + `tokenCountModel` (`o200k_base` observed), `budgetUsage`, and
  `conditionOutcomes`. Four gauges appear in `budgetUsage`; the vocabulary
  declares **seven** budgets (v17.2.0 values, recorded verbatim in
  `docs/battlegrid-mcp-surface.json` → `authoring_vocabulary`): `sections`
  32, `sectionColumns` 32, `columnLookback` 32, `distinctTimeframes` 8,
  `strategyConditions` 16, `conditionClauses` 16, `estimatedTokens` 16000.
  The two condition budgets are 4× tighter than the compile schema's
  `maxItems: 64` — budget from the vocabulary, never the schema.
- `derive_strategy_rule_view({sections, rules?})` answers, for all 82
  signals, whether the draft's report can feed them (`inReport`/`status`),
  the canonical default allocation, and default params. Membership is the
  bridge between a table and the scorecard: weighting a signal the report
  cannot feed does nothing.

Five tables, one per mathematical family, previewed live against BTC
(2026-08-01) — every one rendering real market values:

| Table | Columns | Tokens | Signals it feeds |
|---|---|---|---|
| Momentum | RSI14 value + trajectory, MACD, STOCH_K | ~179 | 16 |
| Flow | CVD, OBV trajectory, BUY_PRESSURE, VOLUME_RATIO | ~176 | 8 |
| Derivatives | FUNDING_RATE, OI_CHG, OI trajectory | ~160 | 6 |
| Structure | SWING_HIGH, SWING_LOW, VWAP distance | ~100 | 4 |
| Mixed timeframes | RSI14 anchor + higher, ADX@4h, CLOSE_CHANGE@15m | ~133 | 14 |

**The timeframe-inertia law** (found by the derivatives table's refusal):

```
REPORT_COLUMN_SECTION_TIMEFRAME_UNSUPPORTED
metric 'FUNDING_RATE' is timeframe-inert (a bundle read) and is not
allowed in a section with a timeframe override
```

A section whose columns include any **timeless** metric must declare no
section timeframe. Dropping `timeframe: '1h'` made the same table compile
unchanged. Mixed relative and absolute timeframes within one table are
fine — the Mixed table used anchor, higher, 4h and 15m together and spent
3 of the 8 `distinctTimeframes` budget.

**`regimeTimeframe` is required when `regimeAutoDerive` is false** — the
only other preview-level refusal the sweep found.

## The persistence path

Custom tables land on a strategy through the same pipeline as every other
composition change: **compile → review → apply**, revision-checked, with a
digest-bound confirmation. There is no separate "create table" tool — the
table rides `sections` in `compile_strategy_plan`'s request.

**A custom table is defined inline and named by the server.** The compile
request's `sections` accept `{kind:'custom', title, columns}` with
`sectionKey` **optional**; supplying one the strategy does not already own
is refused:

```
REPORT_CUSTOM_SECTION_NOT_OWNED
Custom section 'custom:<uuid>' does not belong to this strategy
allowedDomain: {kind: enum, values: []}
```

So the loop is: **create by definition, modify by key.** Add a table by
sending its definition with no key; the platform mints
`custom:<uuid>` and returns it on the next read. Change that table by
sending the same key *with* the restated definition.

Walked live end to end (2026-08-01, on a zero-bound fork via the
slot shuffle):

```
fork Dunkirk r1 (5 sections)
  → add {custom, title 'Probe Momentum Table', 1h, [RSI14 value, ADX value]}
  → r2, 6 sections, minted custom:8b041f05-…
  → preview: renders "Probe Momentum Table" with live BTC values
  → modify: same key + a CVD column from another family
  → r3, table still present under the same key
  → fork archived, parked strategy restored
```

**What a saved custom section looks like on read** — the whole definition,
which is what makes the round trip possible:

```json
{"kind":"custom","sectionKey":"custom:8b041f05-…","title":"Probe Momentum Table",
 "timeframe":"1h","columns":[{"metric":"RSI14","transformId":"value","timeframe":{"rel":"anchor"}},
                             {"metric":"ADX","transformId":"value","timeframe":{"rel":"anchor"}}]}
```

**A key alone will not do for preview.** `preview_strategy_report` rejects
`{kind:'custom', sectionKey}` with a schema error — it requires the
self-contained `title` + `columns`. A *platform* section by key alone is
accepted. This asymmetry is what made the preview surface refuse every
strategy holding a custom table until `a-custom-table-survives-the-round-trip`
taught the domain model to carry the definition.

## Platform facts that shape authoring

1. An **empty `sections` list is rejected** when the strategy's conditions
   read report columns (`CONDITION_COLUMN_UNKNOWN`) — amputating the
   report a condition depends on is refused (observed on the first apply
   probe).
2. The metric index rides the vocabulary payload per category; ten reads,
   merged. A ten-wide parallel burst drew gateway 504s; the adapter caps at
   four.
3. `get_strategy_section_template` for platform sections answers only
   `{sectionKey, title}` — the vocabulary read already carries everything
   it adds.
4. Budget caps are the platform's own (`sections` 32, `sectionColumns` 32,
   `columnLookback` 32, `distinctTimeframes` 8) and arrive named in every
   preview — the product passes gauge names through rather than
   enumerating them.

5. **An UPDATE that omits the regime settings preserves them** — verified
   on the fork walk (`autoDerive true → true`, `timeframe null → null`).
   The compile path does not treat omission as "reset to default", unlike
   the agent `tradingConfig` write.
6. **An archived strategy is listed but not readable.** It appears in
   `list_strategies` with `includeInactive`, while `get_strategy` answers
   `NOT_FOUND` for the same id. Anything walking archived strategies must
   expect the detail read to fail.
