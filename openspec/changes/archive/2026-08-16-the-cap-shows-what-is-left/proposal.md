# Proposal: The Cap Shows What Is Left

## Why

An operator whose agent has stopped entering trades sees nothing wrong. No
block, no warning, a gauge reading `breached: false`, and an agent that is not
halted. It simply never opens another position.

`maxConcurrentExposureUsd` is not a ceiling that trips — it is the **base
BattleGrid sizes every order from**. As positions fill it, each successive order
shrinks, until one falls under the exchange's $10 minimum and dies at the TOKEN
stage, before the model is even called. Zero of this account's 5,521 lifetime
gate blocks names exposure as the reason. This is happening on the account now,
and it cost a full investigation to identify — after being guessed at wrongly
twice in this repo's own record.

The limits surface is the screen built to be trusted about consequences, and it
shows the ceiling while saying nothing about how full it is. **The product
already fetches the answer and throws it away**: `capitalAtRiskUsd` and
`headroomUsd` are declared on `Budget`, mapped by the adapter, and read by no
query, no component and no page. `effectiveNotionalUsd` is not mapped at all.

The copy half of `#299` shipped as `the-cap-says-what-it-meters` — the hint now
names margin and warns that trades are refused silently. This is the other half:
showing the operator *how close they are* to that silence, before it arrives
rather than after.

## What Changes

- The limits surface shows **what is left under the cap**, not only the cap:
  the margin committed, the headroom remaining, and what that headroom
  authorizes — every figure as the platform states it.
- Where the platform reports an agent blocked or over-subscribed, that is shown
  with the platform's own reason.
- The gauges BattleGrid resolves are **rendered, never re-derived** — the tool's
  own description says so in those words.

## Capabilities

**New**: none.

**Modified**:
- `agent-understanding` — the limits surface gains the fill side of the cap it
  already renders

## The claim in the backlog item that does not survive contact

`#299` records, after the 2026-08-16 measurement, that surfacing *"the next
order would size to X, floor is Y"* is now **"a rendering problem over fields
already in hand rather than a derivation"**.

**That is true of headroom and false of the next order's size.**

`headroomUsd` and `effectiveNotionalUsd` are the platform's own figures and may
be rendered. But *the next order's* size is `headroom × sizePct ×
effectiveLeverage` — the size preset is ours to apply, and the platform
publishes no per-preset projection. That formula is exactly the one
`the-approval-can-be-answered` refused to compute, as **PE-2**, one day ago:

> the formula is known and reconstructs observed fills exactly, which is
> precisely why using it would be our arithmetic presented as the platform's
> fact, on a confirmation, about money.

The same reasoning applies here and the surface is the same money surface.
Building the projection would overturn PE-2 by accident, on a neighbouring
screen, without anyone deciding to. **So this change renders what the platform
states and stops there** — see Out of Scope.

That is not a smaller change than the item asked for by much. Naming the
committed margin, the headroom and what it authorizes already answers *"why is
nothing happening"* — an operator watching headroom fall toward the point where
orders stop is being told the thing the block never says.

## Out of Scope

- **A projected next-order size, and the exchange floor computed against it.**
  Our arithmetic about someone else's money, contradicting PE-2 (above). Whether
  a clearly-labelled projection is better than none is a genuine product
  question, and it is the same question `a-confirmation-that-cannot-name-the-amount`
  (#305) already holds for the approvals confirmation. **It should be answered
  once, for both surfaces, and not twice by accident.** Filed there.
- **Predicting whether the exchange floor test reads live headroom or the static
  cap.** `#299` records this as **NOT DETERMINED**, and the settling evidence —
  a fresh `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` row carrying
  `minEquityUsd: 33.333333` — has not appeared. A surface that asserted either
  reading would be asserting an unknown.
- **The `accountEquityUsd: 0` anomaly.** Recorded on #299 and #107, concluded by
  neither. It is not folded into any verdict here.
- **Changing what the block surfaces already do.** `reasonDetail` is already
  carried through as the platform structured it, and *A Platform Reason Is Shown
  With Its Own Numbers And Never Reworded* already governs the row that appears
  once an entry has been refused. This change is about the state **before** that.

## Impact

- **Surface**: `/agents/[id]/limits` — the exposure section gains the fill side.
  No new route.
- **Reads**: no new platform call. `readBudget` already runs for this agent and
  already returns every field this needs; two of them are already mapped and
  unread.
- **Domain**: `Budget` gains `effectiveNotionalUsd`, `blockedReason` and
  `blockedSince`, which the platform returns and the mapper currently drops.
- **No writes.** Nothing about this change can alter an account.
- **Iron Rule**: every figure traces to a `get_agent_budget` field. Nothing is
  derived, including the gauges — the platform resolves `fill`, `remaining`,
  `configured` and `breached`, and its own description says *"render them, never
  re-derive."*
