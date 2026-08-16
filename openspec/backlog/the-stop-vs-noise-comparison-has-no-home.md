---
id: the-stop-vs-noise-comparison-has-no-home
title: The stop-versus-noise comparison belongs to the strategy now, and the platform ignores it there
type: question
status: blocked
priority: p3
created: 2026-08-10
updated: 2026-08-17
change: ""
capability: strategy-authoring
github: "85"
blocked_by: [upstream:battlegrid]
tags: [battlegrid, v15, v19, risk, measurement]
---

# The stop-versus-noise comparison has no home

Tracked on GitHub as **#85**. The upstream watch is stated at the foot of this
file, under "Re-scoped 2026-08-14"; the two sections below are the only things
that have moved since.

## Re-confirmed at v19.2.0 — 2026-08-16

Blocker (2) still holds, now five majors running. `get_strategy` on Cannae
(`f901a336-6adc-458a-9d5e-19fb117deee1`), read 2026-08-16:
`minStopLossAtrMultiple 1`, `maxStopLossPct 5`, `minRiskRewardRatio 1.5` — the
platform defaults, while Cannae's agent Undertow was deliberately built at
`minRiskRewardRatio 2.0`. Parsed and discarded, unchanged across v15, v16, v17,
v18, v19.

The previous confirmation in this file is at v18.2.0. Nothing else about the
blocker has changed and nothing is owed from this side: the panel already says
the values are platform-set and inert, and offers no edit.

## Blocker (3)'s premise is now worth re-testing — 2026-08-16

Blocker (3) was filed as "adverse excursion needs candle history", which was
true when nothing recorded prices. The recorder has since accumulated: **1,203
captures over 2.61 days at 1h across 20 series, 1,130 valid pairs** (measured
read-only 2026-08-15 under #282's depth gate). A forward-return distribution at
1h **is** a locally measured single-step move — the same reference class as the
population study's "mean single-bar adverse excursion of 0.47%". So the
reference number may be reachable from the record this product already keeps,
with no `get_coin_candles` call and no borrowed constant.

It is not reachable yet, and the reason is the one #282 hit: raw `n` overstates
independence for cross-sectionally clustered coins (funding-flipping's 113 pairs
sat in 55 distinct hours). Whoever takes this **runs the depth gate before
proposing**, as #282 did, and reads it against effective sample, not raw `n`.

One shortcut is closed off. [[trading-telemetry-is-unread]] (#116) carried a
note suggesting `trailingGeometry.observedExtreme` was live adverse-excursion
data and that this blocker was therefore softer than recorded. Measured
2026-08-16 on three open LONG positions, `observedExtreme` is the **favorable**
extreme — it sits at or above both entry and mark on every row, including one
under water, and `trailLevel == observedExtreme - trailDistance` exactly. It is
MFE where this item needs MAE. The pointer is withdrawn there; do not spend a
session on it.

Where such a figure may live is already constrained: **not on the strategy
page.** `tests/architecture/no-population-constants.test.ts` forbids a measured
constant there, and the archived change put the measured half on the agent's
trading record deliberately — one strategy binds several agents.

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

## Taken, 2026-08-14 — option (3) is a change

Promoted to `the-floor-is-the-platforms-own-noise-answer` (standard):
present the declared floor as the platform's own volatility-relative noise
reading on the existing panel, claiming declaration only — never enforcement.
What this item keeps after that change lands: blockers (1) and (2), both
upstream — it remains the only open record that the platform parses and
discards strategy-authored trade-level policy values (confirmed at v18.2.0,
four majors running). Do not close it when the change archives; re-scope it
to the upstream watch.

## Re-scoped 2026-08-14 — the change landed; what stays open is the upstream watch

`the-floor-is-the-platforms-own-noise-answer` archived: the strategy detail's
trade-level policy panel now reads the declared floor as the platform's own
volatility-relative statement of where noise ends, claims declaration only,
and names the agent's trading record as the measured half. Option (3) is
done. The `change:` link is cleared because the archived change's scope was
option (3) alone — this item continues as the standing record of the
platform discarding strategy-authored trade-level policy values, and of the
rule that nothing may be built on those fields *as applied* until a compile
carrying changed values provably changes `derive_strategy_rule_view` output
or a trade's stop provably comes from the strategy value. Re-priced p2 → p3:
what remained buildable shipped; the rest waits on BattleGrid.

## Re-statused 2026-08-17 — `blocked`, on BattleGrid, with the tripwire named

`status: open` was never true of what remains here. Every buildable half shipped
(`the-floor-is-the-platforms-own-noise-answer`), and what is left is blocker (2):
the platform parses strategy-authored trade-level policy and discards it,
confirmed unchanged across v15, v16, v17 and v18. The item read `open` because
`blocked_by` could only name other backlog items, so a wait on BattleGrid had no
way to be written down and the validator asked for `open` instead.

**Tripwire — either one ends the wait:**

1. A compile carrying **changed** `minStopLossAtrMultiple` / `maxStopLossPct` /
   `minRiskRewardRatio` that provably changes `derive_strategy_rule_view` output.
2. A trade whose stop provably came from the strategy value.

Test 1 is runnable here and has never been run in four majors. Read-back
equality — writing `2.0` to Cannae and reading `1.5` — proves the *payload* does
not reflect the write; it does not distinguish *discarded* from *applied and
echoed from a defaults table*. `derive_strategy_rule_view` is a second, separate
surface, and agreement across two surfaces is evidence where agreement with
itself is not. **Run it on a fork or an unbound strategy, never on Cannae**: the
hypothesis under test is that the platform ignores these values, and if that is
wrong the write retunes a live agent.

Nothing may be built on these fields *as applied* until one of the two lands.
