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
