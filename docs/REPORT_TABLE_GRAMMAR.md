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

<!-- SWEEP RESULTS -->

## The preview loop

`preview_strategy_report({timeframe, regimeAutoDerive, regimeTimeframe?,
sections, coinSelection, conditions?, conditionVerdicts?})` renders the
draft as the literal report text an agent receives — persisted-state-free.

- `coinSelection` is required and bounded: `{mode: 'ranked', limit ≤ 100,
  category?}` or `{mode: 'explicit', tickers: […]}`.
- Returns `renderedSections` (sectionKey/title/text), `estimatedTokenCount`
  + `tokenCountModel` (`o200k_base` observed), `budgetUsage` — four gauges
  observed: `sections` (cap 32), `sectionColumns` (cap 32),
  `columnLookback` (cap 32), `distinctTimeframes` (cap 8) — and
  `conditionOutcomes`.
- `derive_strategy_rule_view({sections, rules?})` answers, for all 82
  signals, whether the draft's report can feed them (`inReport`/`status`),
  the canonical default allocation, and default params. Membership is the
  bridge between a table and the scorecard: weighting a signal the report
  cannot feed does nothing.

<!-- PREVIEW RESULTS -->

## The persistence path

Custom tables land on a strategy through the same pipeline as every other
composition change: **compile → review → apply**, revision-checked, with a
digest-bound confirmation. There is no separate "create table" tool — the
table rides `sections` in `compile_strategy_plan`'s request.

<!-- PERSISTENCE RESULTS -->

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
