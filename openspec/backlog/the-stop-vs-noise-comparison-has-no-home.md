---
id: the-stop-vs-noise-comparison-has-no-home
title: The stop-versus-noise comparison belongs to the strategy now, and the platform ignores it there
type: question
status: open
priority: p2
created: 2026-08-10
updated: 2026-08-13
change: ""
capability: strategy-authoring
github: "85"
blocked_by: []
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

## Blocked-by cleared 2026-08-12 — the blocker item closed, the block did not

`blocked_by` named `v15-trade-level-policy-is-declared-but-inert`, which
closed 2026-08-11 when the *product* half shipped (`v15-trade-level-policy`:
read, display, refuse to edit). Its closing note is explicit that the
*platform* half — the fields parsing-and-discarding, last retested against
v16 on 2026-08-10 — remains BattleGrid's to fix and is watched **here**.
So the frontmatter link is cleared as stale, and this item is now the
standing record of blocker (1): before building anything on
`maxStopLossPct` / `minStopLossAtrMultiple` / `minRiskRewardRatio`,
re-verify the platform actually applies them (a compile carrying them
that changes `derive_strategy_rule_view` output, or a trade whose stop
provably came from the strategy value).

## 2026-08-13 — two of the three blockers have moved

Re-checked in the read-only verification sweep.

### Blocker (2) — the platform still discards them. Confirmed at v18.2.0.

All three bound strategies read back the platform defaults, unchanged:

```
Trafalgar   minStopLossAtrMultiple 1   maxStopLossPct 5   minRiskRewardRatio 1.5
Cannae      minStopLossAtrMultiple 1   maxStopLossPct 5   minRiskRewardRatio 1.5
Salamis     minStopLossAtrMultiple 1   maxStopLossPct 5   minRiskRewardRatio 1.5
```

Undertow was deliberately built at `minRiskRewardRatio: 2.0` and Breakwater at
1.5, chosen per family. Cannae — Undertow's strategy — reads **1.5**. The whole
fleet is still pinned to defaults, now across v15, v16, v17 and v18.

So blocker (2) is real and re-measured. What is stale is how this item *names*
it: as the open p1 `v15-trade-level-policy-is-declared-but-inert`. That item is
`status: done` and issue #95 closed 2026-08-11. The block did not close with it
— which the section above already says — but anyone following the reference
finds a closed item and can reasonably conclude the block cleared.

**This item is the only open record of it.** Say so rather than pointing at a
closed one.

### Unblock step (2) is done — the strategy-side risk surface exists

The Notes list *"a strategy-side risk surface, since that is where the fields
now live"* as step 2 of unblocking. It shipped on 2026-08-11, the day after
this item was filed, in the same change that closed the blocker item:

```
src/domain/strategy/strategy.ts:260   interface TradeLevelPolicy
src/presentation/components/strategy-detail.tsx:99-113
    minStopLossAtrMultiple, maxStopLossPct, minRiskRewardRatio
```

It reads the three fields from `get_strategy`, renders them on the strategy
detail page, and states that the values are platform-set while the compiler does
not process changes to them — deliberately offering no edit, because offering a
dead write path is the defect class `HANDOFF.md` catalogues.

**So the home this item says the comparison lacks now exists.** What it does not
yet carry is the *comparison* — the declared stop geometry set against a
measured adverse excursion. That is a smaller and much better-defined ask than
"no home".

### What is actually left

1. Blocker (2), upstream, unchanged and now four majors old.
2. Blocker (3), the reference number — unchanged. The recorder is accumulating;
   nothing here says it has enough yet.
3. The cheapest option is still the one the Notes already identify and it is
   now cheaper: **read `minStopLossAtrMultiple` as the platform's own
   volatility-relative answer**. The surface that would render it is built. That
   makes the third option a presentation change on an existing panel rather
   than a new surface, and it may make a bespoke noise floor unnecessary.

Take (3) first. It is the only one of the three that is not waiting on someone
else.
