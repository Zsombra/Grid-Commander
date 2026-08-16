---
id: forward-returns-are-not-regime-conditioned
title: The forward returns are not conditioned on regime — context sits beside the figures, not in them
type: question
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-16
change: ""
capability: signal-recording
github: "297"
blocked_by: []
tags: [battlegrid, reporting, expected-value, measurement]
---

# The forward returns are not conditioned on regime

## What

`the-regime-the-record-was-taken-in` renders the platform's regime
classification **beside** the forward-returns analysis — per recorded
series, over the record's window. It deliberately does not **join** it: no
per-pair regime label, no regime-segmented return tables. This item is the
record of that cut, and the question of whether the join is ever worth
building.

## Why it matters (p3)

Regime is the most plausible confounder of every per-signal forward-return
figure: a claim earned entirely in `bear_ranging` says nothing about
trending tape. #282's depth gate already blocks claims on thin cells; a
regime join would let claims carry their regime the way they carry their n.
But it multiplies cells: ~1,100 pairs across 20 series split by even three
regime labels would push most cells under any honest floor. The context
surface answers the cheap version ("the whole window sat in one regime")
without the join.

## Evidence

- `src/application/use-cases/read-forward-returns.query.ts` — pairs carry
  no regime axis; `aggregateForward` groups by signal/bias/conflict only.
- Live probe 2026-08-15: `get_regime_history` answers per-bar
  `{timestamp, regime, conviction}` at the recorder's own 1h timeframe, so
  the join key (hour) exists on both sides.
- JOURNAL 2026-08-15 (floor): funding-fade family blocked on n = 2/0 —
  cell-thinning is the live constraint, not a hypothetical.

## First step when taken

Decide the floor first (the effective-sample caveat from the (floor) entry:
cross-sectionally clustered pairs overstate independence), then join
per-pair at the earlier capture's hour against the regime bar covering it,
and only render cells the floor admits. Do not build the join before the
record is deep enough for at least one admitted cell per axis.

## Measured 2026-08-16 — the cheap answer is not available, and the floor argument is now arithmetic

This item rests on two claims that had not been measured. Both were, read-only,
`get_regime_history(BTC, 1h, 100 bars)` — the recorder's own timeframe — against
the record's window (2026-08-12T19:46Z → 2026-08-16T14:31Z).

### Claim 1: "the context surface answers the cheap version" — it cannot

The cheap version this item relies on is *"the whole window sat in one regime"*.
**The window did not sit in one regime.** Inside it, BTC at 1h:

```
90 bars, 2026-08-12T20:00Z -> 2026-08-16T13:00Z
  bear_ranging     63   70.0%
  bull_ranging     20   22.2%
  bear_expansion    7    7.8%
  13 regime changes
```

Three labels and thirteen transitions on one coin. So the confounder this item
names is **live in the data already held**, and the beside-the-figures context
surface cannot discharge it by reporting a homogeneous window — there isn't one.
That strengthens the case for the join rather than weakening it.

### Claim 2: "most cells would fall under any honest floor" — true, and for a sharper reason than cell count

The naive arithmetic is closer to admissible than the item assumed. If a
signal's triggers distributed like bars, `funding_rate_flipping` at **157
triggers** would split roughly 110 / 35 / 12, and **two of the three cells would
clear a floor of n ≥ 30**.

**That arithmetic is the wrong one, and the (floor) entry already says why.**
These pairs cluster cross-sectionally: 113 flipping triggers sat in 55 distinct
hours, so up to 20 coins contribute the same hour and the independent unit is
the hour, not the pair. Applied here:

```
bear_expansion spans 7 contiguous bars = 7 distinct hours
```

So the smallest cell's **effective** sample is about **7**, no matter how many
coin-pairs land in it, and no amount of adding coins raises it — only more time
in that regime does. `bull_ranging`'s 20 bars are barely better.

**That is the argument this item needs, and it is stronger than the one on
record.** "Most cells fall under the floor" invites the reply "so add coins".
"The smallest cell holds seven independent hours" does not.

### What this does to the item

**The cut stands. Do not build the join.** The first-step instruction is
unchanged and now has a number attached: at least one admitted cell per axis
means the thinnest regime needs ~30 distinct hours, and it has 7.

Two corrections to carry:

1. Strike the reliance on "the whole window sat in one regime" — it is false for
   this record, and any future version of that argument must be measured rather
   than assumed.
2. State the floor in **distinct hours per regime cell**, not pairs. A pair count
   will pass long before the cell means anything.

**Re-check condition**, replacing "when the record is deep enough": when the
thinnest regime label the record covers reaches ~30 distinct hours. That is a
question about how long the market stays in each regime, so like #282 it is not
a calendar wait — it is a regime-persistence wait, and the two items now share
that shape.

### Scope stated honestly

Measured on **BTC only**, at 1h. Regime is per-coin, and the join would key each
pair to its own coin's regime bar, so the per-coin distributions may differ from
this one. What BTC establishes is the thing that needed establishing: **regime is
not constant across the record's window**, so the homogeneity fallback is gone.
The per-coin spread is unmeasured and would be the first thing to read if this
is taken up.
