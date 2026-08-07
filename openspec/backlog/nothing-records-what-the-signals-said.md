---
id: nothing-records-what-the-signals-said
title: Nothing records what the signals said, so no strategy claim can ever be tested
type: feature
status: open
priority: p1
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: strategy-authoring
blocked_by: []
tags: [battlegrid, measurement, strategy, research]
---

# Nothing records what the signals said

BattleGrid has **no backtest tool**, and its history reads are thin:
`get_coin_candles` caps at 100 closed candles, `get_coin_performance_history` at
100 points, `get_regime_history` at 500 bars. At a 1h anchor that is about four
days of price.

So every strategy claim — "this setup works", "that gate is too tight", "the
structure-zone edge is real" — is currently unfalsifiable. Not hard to test.
**Impossible**, because the data to test it against is never written down and
cannot be recovered later.

## What

A recorder. On a schedule, snapshot and persist:

- `get_coin_signal_preview(ticker, interval)` — all 84 signals with their
  `triggered` flag, `score`, `bias`, `indicatorValues`, plus the coin's
  `aggregateScorePercent` and `dominantBias`
- `get_coin_candles(ticker, interval)` — the price the snapshot is joined against
- `get_regime_snapshot(symbol, timeframe)` — regime, conviction, run length

Join them later on `(ticker, timestamp)`. After ~2 weeks the account owns the
dataset the API will not give retroactively, and every question above becomes a
query.

All three are read-only (`readOnlyHint: true`) and cost no LLM call.

## Why it matters

This is the product's stated value proposition. The idea brief says
Grid-Commander exists to *"close the loop by measuring whether it worked"*, and
that loop cannot close without this. It is the difference between a workbench
that shows you configuration and one that tells you whether the configuration
was any good.

It also unblocks a specific, already-written list of questions.
`_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` names thirteen trade
categories and grades each on evidence; the ones sitting at tier T3/T4 are there
**only** because no forward data exists. Two weeks of recording moves them.

The cost of not doing it compounds: every day without a recorder is a day of
signal history permanently lost.

## Evidence

Established live 2026-08-06 (see the research doc for the full sweep):

- The catalogue is mostly idle at any instant — **18 of 84 signals fired on
  nothing** across 40 coins, and the two the research recommended most highly
  (`mtf_pullback_long/short`) fired **0/40**. A single snapshot found that; only
  a time series can say whether it is normal.
- Signal scores are **graded, not binary** (`rsi_oversold` scores 0.10 at RSI 27
  against 0.50 at RSI 15), so the interesting quantity is a distribution over
  time, which one snapshot cannot supply.
- `get_coin_signal_preview` returns all 84 evaluations for one coin in one call
  — 40 coins is 40 calls. The whole universe is cheap to record.

## Notes

Scope questions worth settling before building, not while:

- **Cadence and universe.** One snapshot per anchor bar is the natural unit. 40
  coins × 84 signals × 24 bars/day is ~80k rows/day at 1h — small, but it grows.
- **Where it lands.** Postgres via Drizzle is the obvious home, and this is the
  first genuinely time-series-shaped table in the schema. Worth a look at
  whether the existing schema conventions fit.
- **Who runs it.** A cron, a Next.js route hit by an external scheduler, or a
  worker — the deployment doc (`docs/DEPLOYING.md`) constrains this.
- **Multi-tenant.** The signal preview is account-scoped only when `agentId` is
  passed. Without it the read is the *unweighted* platform view, which is the
  same for every tenant — so one recorder can serve all of them, and probably
  should rather than each tenant re-recording identical data.

Do not start by building the analysis. Build the recorder, let it run, and the
analysis becomes ordinary SQL.
