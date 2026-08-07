---
id: a-stop-inside-the-noise-looks-like-a-tight-stop
title: A stop inside the noise floor reads as discipline, and nothing says otherwise
type: feature
status: open
priority: p1
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, risk, agent, measurement]
---

# A stop inside the noise floor reads as discipline

`maxStopLossPct: 1` looks careful. On a 1h anchor it is **below the average
six-bar adverse excursion** (1.25%), which means it converts ordinary noise into
realised losses on a majority of entries. Nothing in Grid-Commander says so, and
nothing on BattleGrid does either — both render the number, neither renders what
it is *relative to*.

The same is true of the switches that have no visible off-state:
`maxDailyLossUsd: 0` and `maxCumulativeDrawdownUsd: 0` both mean **no limit**, and
they read as "zero" — the most conservative-looking value a field can hold.

## What

An agent risk panel that shows each setting **against the thing that makes it
safe or unsafe**, rather than on its own:

| Setting | Show it against |
|---|---|
| `minStopLossPct` / `maxStopLossPct` | measured adverse excursion at the agent's anchor timeframe (1/3/6/12 bars) |
| `minRiskRewardRatio` | the favourable/adverse excursion ratio actually available in the current regime |
| `maxDailyLossUsd`, `maxCumulativeDrawdownUsd` | **named as OFF when 0**, never rendered as a number |
| `maxConcurrentExposureUsd` | account balance |
| `positionManagementPreset` | the median position life and take-profit rate it implies |
| `maxDailyTrades` | the platform default (10) and the agent's actual daily rate |

## Why it matters

This is not hypothetical. Probed live 2026-08-06, the account's own agent
**THE .0** — `FULL_EXECUTION`, deployed across 15 coins — carries:

- `maxStopLossPct: 1`, `minStopLossPct: 0.5` — the *ceiling* is under the mean
  six-bar adverse excursion
- `positionManagementPreset: WALTHER` — the hair-trigger preset (ATR × 1.5,
  break-even at 20% of TP, tightest time decay)
- `maxDailyTrades: 34` against a platform default of 10
- `maxDailyLossUsd: 0` and `maxCumulativeDrawdownUsd: 0` — **both stops off**
- `maxConcurrentExposureUsd: 250` against a **$49.05** balance

Realised: 33.3% win rate over 27 outcomes, −$0.31 net, 63% fill rate.

Every one of those is individually plausible-looking. Together they are the
exact failure pattern the population-wide study found (74% of all trades exiting
at STOP_LOSS with a 15.5% win rate and a 90-minute median life). The
configuration screen showed nothing wrong because a configuration screen has no
opinion.

Absolute damage here is bounded by a small balance. The point is that **nothing
in the product would have flagged it**, and the same configuration on a funded
account is a different story.

## Evidence

`_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md`:

- §D.3 — median stop distance 0.623%; mean adverse excursion 0.47% (1 bar),
  0.85% (3), 1.25% (6), 1.83% (12). Trailing on → 1.5 h median life and a 10%
  take-profit rate; trailing off → 4.3 h and 31%.
- §D.4 — the achievable favourable/adverse ratio by regime and horizon; a 1.5R
  demand against a market offering ~1.04R is arithmetically sub-break-even.
- §D.1 — the population wins 29.8%; random entry on the same universe wins
  30.6%.

Tool fields: `get_trading_config_catalog` declares the bounds
(stop 0.1–25%, R:R 0.5–5) and the five position-management presets;
`get_intelligence_agent` returns the agent's actual values. Both read-only.

## Notes

The noise floor is the hard part, and it is **blocked in practice on
`nothing-records-what-the-signals-said`** — computing adverse excursion needs
candle history, and 100 bars is thin for anything but a rough current-regime
estimate. Two honest options:

1. Ship the parts that need no history first — `0` rendered as **OFF**,
   exposure against balance, `maxDailyTrades` against the default, preset
   against its documented behaviour. These are the highest-signal items and cost
   nothing.
2. Add the excursion comparison once the recorder has run.

Do not compute a noise floor from 100 bars and present it as authoritative. A
number with a false precision is worse here than no number, because the whole
point of the panel is that it is the thing people trust instead of the raw
setting.

This is a **read** surface. Retuning a live agent is a separate question and a
separate item — do not fold a write into this one.
