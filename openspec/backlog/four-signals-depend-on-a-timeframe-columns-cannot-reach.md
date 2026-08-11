---
id: four-signals-depend-on-a-timeframe-columns-cannot-reach
title: Four signals declare a REGIME dependency while rel:regime resolves to null
type: question
status: done
priority: p2
created: 2026-08-07
updated: 2026-08-11
change: ""
capability: strategy-authoring
github: "90"
blocked_by: []
tags: [battlegrid, signals, timeframes, vocabulary]
---

# Four signals depend on a timeframe columns cannot reach

Two live reads on 2026-08-06 that do not obviously agree.

**`list_strategy_vocabulary` says the regime timeframe reference resolves to
nothing**, on every anchor:

```json
{"rel":"regime","resolvedByAnchor":
 {"1m":null,"5m":null,"15m":null,"1h":null,"4h":null,"1d":null}}
```

**`get_strategy_signal_definition` says four signals depend on it**:
`regime_alignment`, `regime_divergence`, `regime_trend_shift`,
`regime_volatility_shift` — each declaring `dependencies: ["REGIME"]`, and
nothing else.

## The question

Does the **signal** evaluation path resolve the regime timeframe by a route the
**column** path does not?

Three possibilities, and the difference matters:

1. **Signals resolve it internally** — from the strategy's `regimeTimeframe` /
   `regimeAutoDerive` settings rather than from a column reference. The four
   signals work; only `rel: regime` columns are inert. Most likely, given the
   strategy model carries `regimeTimeframe` as a first-class field.
2. **Both are inert** — the four signals never fire for the same reason columns
   resolve empty. Weighting them would be dead weight in the scorecard.
3. **`resolvedByAnchor: null` means something else entirely** — e.g. "not
   anchor-relative, resolved separately", in which case the column path may work
   too and the null is a poor encoding rather than a missing capability.

## Why it matters

Modest but real. If (2), then four of 84 signals are unweightable and any
strategy leaning on regime confluence is quietly scoring nothing — the same
class of silent-empty defect as the v9 section-body move, which rendered five
headed sections with no body while every gate stayed green.

The live cross-section gives weak evidence **against** (2): `regime_alignment`
fired on 6/40 coins and `regime_divergence` on 8/40, so at least two of the four
do evaluate. That points at (1), but it does not establish how, and it does not
say whether a `rel: regime` *column* would resolve.

## Evidence

- `_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` §3.5 (the null resolution),
  §3.6 (the dependency sets), §D.7 (the firing rates).
- `list_strategy_vocabulary(category)` → `timeframeRefs[3]`, live 2026-08-06.
- `get_strategy_signal_definition` × 84, live 2026-08-06.

## Notes

Cheap to settle, and read-only either way:

- Build a `rel: regime` column through `get_strategy_column_contract` and read
  the refusal. The platform teaches its own grammar in the `allowedDomain` of a
  rejection — that alone probably answers it.
- Then `preview_strategy_report` a section containing one, against a strategy
  with `regimeAutoDerive: true` and a set `regimeTimeframe`, and see whether the
  rendered column carries a value or the null sentinel.

Do not guess this into the docs. The research doc states it as unresolved on
purpose; if it gets answered, both §3.5 and §3.6 need the correction, not just
one of them.

## Answered 2026-08-11 — possibility (3), with (1)'s mechanism beside it

Probed live at v17.2.0 through the product path (scratch probe in
`tests/live/`, run once, deleted; `CheckColumnQuery` + `previewReport`,
reads only). The answer is **(3) — `resolvedByAnchor: null` is an encoding,
not a missing capability — with (1)'s mechanism explaining the signals**:

1. **`rel: regime` columns work.** `CLOSE @ rel:regime` compiles a real
   contract — output header **`close_reg`**, `requiresSectionTimeframe:
   true` — and a preview with `regimeTimeframe: '4h'` against a 1h anchor
   rendered `close_reg` as a real price beside the anchor's `close`. The
   `distinctTimeframes` budget counted **2** with the regime timeframe set
   apart from the anchor and **1** under `regimeAutoDerive: true` — the
   resolution is structurally real. `null` on every anchor means *the regime
   relation is not a function of the anchor*: it resolves from the
   strategy's own `regimeTimeframe`/`regimeAutoDerive`, which a bare
   vocabulary read has no strategy context to know.

2. **The four regime signals never touch the timeframe ref.** Regime
   *metrics* are "timeframe-inert (a bundle read)" — the platform's own
   refusal words when `REGIME_TREND` was sent at `rel: regime`
   (`REPORT_COLUMN_CONSTRUCTION_FAILED`, "it accepts only the anchor
   timeframe reference"). Their declared `REGIME` dependency names the
   regime *bundle*. Two related teaching refusals recorded: a
   timeframe-inert metric is also refused in any section carrying a
   timeframe override (`REPORT_COLUMN_SECTION_TIMEFRAME_UNSUPPORTED`,
   "timeframe-inert metrics require a section anchored to the strategy
   timeframe"). The v17.2.0 vocabulary artifact carries the same fact as
   `timeframeMode: "timeless"` on all three regime metrics.

3. **Possibility (2) is dead on both ends** — the signals fired live
   (6/40, 8/40 in §D.7) and the column path renders values.

Corrections landed in
`_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` §3.5 (claim 1
overturned; the unrecorded-values premise resolved by
`docs/battlegrid-vocabulary.json`) and §3.6 (the unverified paragraph
settled), per this item's own instruction that both move together.
