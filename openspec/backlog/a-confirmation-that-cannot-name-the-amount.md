---
id: a-confirmation-that-cannot-name-the-amount
title: The accept confirmation says "real money" but cannot say how much
type: question
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-16
change: ""
capability: agent-understanding
github: "305"
blocked_by: [the-approval-can-be-answered]
tags: [battlegrid, approvals, confirmation, money]
---

# The accept confirmation says "real money" but cannot say how much

## What

Accepting a proposed trade opens a position at real size. The confirmation
cannot state that size, because **the platform does not compute one until the
decision is accepted**. A pending decision carries `positionSizePct: 10` and
`positionSizePreset: "SMALL"`, with `entryFillPrice`, `entryFillQuantity` and
`entryFee` all null.

So the operator is asked to agree to a money-moving act described only as a
proportion.

## Why it matters

Every other confirmation in this product names its consequence concretely. This
one cannot, and the gap is on the single most consequential action the product
performs. Whether "10% of the agent's headroom" is an adequate description of
what someone is agreeing to is a genuine product question, not a defect —
which is why this is filed as a question rather than a bug.

## Evidence

- Observed decision payload (HYPE, 2026-08-15, full text in
  [[approvals-have-no-write-side]]): `positionSizePct: 10`,
  `positionSizePreset: "SMALL"`, `entryFillPrice: null`,
  `entryFillQuantity: null`, `entryFee: null`.
- Sizing is resolved at accept time from live headroom, so two decisions
  accepted back to back size differently.
- The formula is known and reconstructs all three of 2026-08-15's fills exactly
  once integer quantity flooring is applied:
  `size_notional = headroom × sizePct × effectiveLeverage`. Worked examples in
  [[the-exposure-cap-starves-silently-and-we-say-it-wrong]].
- `get_agent_budget` publishes `headroomUsd` live, and the adapter already maps
  it (`agent-mapper.ts:435`) — unread by anything.

## Notes

- `the-approval-can-be-answered` **rejected** computing the amount ourselves:
  it is our arithmetic presented as the platform's fact, on a confirmation,
  about money. That rejection is recorded in its `design.md` and this item does
  not overturn it — it asks whether a clearly-labelled estimate is better than
  no figure at all.
- Three candidate shapes, in increasing honesty and increasing cost:
  1. proportion only (what ships) — accurate, least informative;
  2. proportion plus a labelled estimate — "about $11 at current headroom",
     marked as ours, not the platform's;
  3. proportion plus live headroom shown beside it, and let the operator do the
     arithmetic the product refuses to assert.
- Shape 3 has a side benefit: it would put `headroomUsd` on a surface for the
  first time, which #299 wants anyway.
- Do not resolve this before at least one real accept has been performed and its
  actual fill compared against what the confirmation said.

## 2026-08-16 — this question now governs two surfaces, not one

`the-cap-shows-what-is-left` reached the same fork on the **limits** surface and
stopped at the same place, for the same reason. It shows the headroom the
platform publishes and refuses to project what a specific next entry would
stake, because that figure is `headroom × sizePct × effectiveLeverage` — this
product's arithmetic, about money not yet committed.

So the question this item holds is no longer only *"should the accept
confirmation name an amount?"*. It is:

> **Where the platform states no figure, may Grid-Commander show a
> clearly-labelled estimate of its own — and if so, on which surfaces?**

Answering it separately per surface is how two screens come to disagree about
the same number, so it should be answered once. The three shapes this item
already lists (proportion only / labelled estimate / show the inputs and let the
operator do the arithmetic) apply unchanged to both.

**One input the limits work adds**: shape 3's side benefit is already banked.
`headroomUsd` is on a surface now, which this item noted #299 wanted anyway — so
the "show the inputs" option is cheaper than when it was written, on the limits
surface at least.

Still standing from the Notes: do not resolve this before at least one real
accept has been performed and its actual fill compared against what the
confirmation said. That is `the-approval-can-be-answered` task 7.4, still open.

## 2026-08-16 — the proportion is not just vague, it is insufficient

This item asks whether *"10% of the agent's headroom"* is an adequate
description of what someone is agreeing to. Two measurements today sharpen that
from a judgement call into something closer to a fact.

### The platform's own arithmetic, published — but only in refusals

The sizing model is `headroom x sizePct x effectiveLeverage`, confirmed three
independent times in [[approvals-have-no-write-side]]. On 2026-08-16 the
platform published **its own terms for it**, in a gate-block detail
(#299):

```json
{ "reasonCode": "EXCHANGE_MIN_NOTIONAL_UNREACHABLE", "coinTicker": "MOODENG",
  "reasonDetail": { "equityUsd": 33.05, "minEquityUsd": 33.333333,
                    "smallPct": 10, "maxLeverage": 3 } }
```

`33.05 x 0.10 x 3 = 9.915`, against a $10 exchange minimum — which is why it was
refused. So **the platform states the multiplicands when it says no, and states
nothing when it says yes.** The information the confirmation wants exists and is
published on the opposite branch.

### The decisive part: `effectiveLeverage` is per-coin, and the decision row does not carry it

`maxLeverage` in that block is **3**, while Undertow is configured
`maxLeverage: 4` and its open positions ran at effective leverage 3 (AIXBT,
MELANIA) and 4 (FARTCOIN). Leverage is resolved per coin.

And the decision payload recorded in `approvals-have-no-write-side` carries **no
leverage field at all** — `positionSizePct`, `positionSizePreset`, the three
price levels, `riskRewardRatio`, `atrPct`, the timestamps, and nothing that names
leverage.

**So "10%" is not an imprecise description of the amount. It is not enough
information to derive the amount from.** Two decisions both reading
`positionSizePct: 10`, on the same agent at the same headroom, mean different
money depending on which coin they are for — on this account, a 33% difference
between a leverage-3 and a leverage-4 coin. The operator is not being given a
rounded figure; they are being given one of three terms.

### What this does to the question

The item is right that this is a product question rather than a defect, and it
stays p3. But the question it asks can now be answered more sharply than
"adequate or not":

- **"10% of headroom" cannot be made precise by the operator**, because the
  missing term is not on the row they are looking at.
- **PE-2 still holds and is not the obstacle here.** The refusal to compute
  `headroom x pct x leverage` is about not presenting our arithmetic as the
  platform's statement. Even if that were relaxed, the leverage term is absent
  from the decision, so there is nothing to compute *with* — the two reasons are
  independent and both bite.
- **The honest options narrow to two**: say the proportion and say plainly that
  the amount depends on a leverage the decision does not state; or find a read
  that publishes the coin's effective leverage before acceptance and name the
  range. Nobody has looked for such a read — that is the first cheap step if
  this is taken up.

Still blocked by `the-approval-can-be-answered`, and unchanged in priority.

## The amount was underivable, and now that is measured rather than argued

Task 7.4's accept produced the first position this product has opened, so the
formula could finally be checked against a fill it caused:

```
headroom at decision time   45.00      (Vanguard flat, cap 45)
positionSizePct             12  MEDIUM
effectiveLeverage            4
  predicted notional  45 x 0.12 x 4        = 21.60
  quantity            21.60 / 1.0017       = 21.5633 -> floor 21
  actual notional     21 x 1.0017          = 21.0357   <- observed exactly
```

Fourth confirmation of `headroom x pct x leverage` with integer flooring, and the
first on a **product-performed** accept rather than a platform auto-execution.

**And it settles this item's open question.** `effectiveLeverage: 4` appears on
`list_user_active_positions` — *after* acceptance. The decision row carried no
leverage field at any point. So the confirmation could not have named the amount
even if PE-2 permitted it: the multiplier did not exist yet on anything the
surface could read. The proportion was not an imprecise description of the
amount; it was one of three terms, and a second term only came into being when
the position did.

**One more thing the fill shows.** Proposed entry **1.0009**, actual fill
**1.0017** — the confirmation binds and displays the *proposed* level, and the
position opened 8 pips away from it. Nothing here is wrong (the binding exists to
detect the levels *moving*, not to promise a fill), but it means a surface that
ever says "you will enter at X" would be overstating what the platform offers.
