---
id: the-stop-vs-noise-comparison-has-no-home
title: The stop-versus-noise comparison belongs to the strategy now, and the platform ignores it there
type: question
status: open
priority: p2
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: strategy-authoring
blocked_by: [v15-trade-level-policy-is-declared-but-inert]
tags: [battlegrid, v15, risk, measurement]
---

# The stop-versus-noise comparison has no home

Tracked on GitHub as **#85**, which carries both samples and the unblocking order.

## What

The part of `a-stop-inside-the-noise-looks-like-a-tight-stop` that
`a-number-alone-says-nothing` could not ship: a stop ceiling set against a
measured adverse excursion. Three blockers, stacked.

1. **Wrong subject since v15.** `maxStopLossPct`, `minStopLossPct` →
   `minStopLossAtrMultiple` and `minRiskRewardRatio` moved off the agent and
   onto the strategy (`src/domain/agent/catalog.ts:127`,
   `src/domain/strategy/compiled-plan.ts:57`).
2. **Inert where they now live.** `v15-trade-level-policy-is-declared-but-inert`
   — retested against v16 on 2026-08-10, still refused.
3. **The reference needs history.** Adverse excursion needs candles, and the
   item forbids computing a floor from 100 bars and calling it authoritative.

## Why it matters

Two independent samples three orders of magnitude apart reached the same
conclusion: stops sit inside the noise, and 74% of trades die at `STOP_LOSS`.
It is the highest-value finding on the trading side and it is currently
unrenderable in the place it belongs.

## Evidence

`_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` §D.3 (776 trades);
`openspec/JOURNAL.md` 2026-08-09/10 check-ins (26-trade fleet, placed RR 3.34 vs
realised 1.05–1.33).

## Notes

`a-number-alone-says-nothing` sidesteps all three by deriving the geometry from
the agent's own closed trades — the median realised move at each close reason,
needing no candles and no borrowed constant. It also renders `maxStopLossPct`
against the platform's declared default, marked as set on the strategy.

Unblock in order: (1) upstream fixes the inert policy, (2) a strategy-side risk
surface, (3) either the recorder accumulates enough history, **or**
`minStopLossAtrMultiple` is read as the platform's own volatility-relative
answer — which may make a bespoke noise floor unnecessary. The third option is
the cheapest and worth trying first.
