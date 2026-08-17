# Proposal: The Cap Says What It Meters

## Why

`money-limits.tsx:119` describes `maxConcurrentExposureUsd` as *"The total of
everything open at the same time."* That is notional. **The cap is metered on
margin**, measured live at BattleGrid v19.2.0 on 2026-08-16: Undertow's
`gauges.exposure.fill` read `8.55` against a `currentNotionalUsd` of `29.48`
under a cap of `45`; Breakwater reproduced it at `4.5` against `12.91`.

The wording is wrong about the unit and wrong about the mechanism. The cap is
not a ceiling that trips — it is the base each order is sized from, and it
enforces itself by shrinking successive orders until one falls under the
exchange's $10 minimum and dies at the TOKEN stage. **Zero of this account's
5,521 lifetime gate blocks names exposure as the reason.** So an operator whose
agent has gone quiet is reading a hint that describes neither what filled up nor
what stopped the trade.

This is the copy half of `the-exposure-cap-starves-silently-and-we-say-it-wrong`
(#299), the only P2 bug on the board.

## What Changes

- Replace the `maxConcurrentExposureUsd` hint with wording that names the
  metered quantity, the sizing behavior, and the silent refusal:
  *"Margin, not position size. BattleGrid sizes each new trade from what is left
  — and once that falls under 10, the next trade is refused without saying why."*
- Extend the `agent-authoring` requirement **An Agent's Spending Limits Are
  Stated Before It Exists** so that a limit must be described by what the
  platform meters and how it enforces it — not only, as today, by whether a
  value removes it.

The label above the field — *"Most it may have at risk at once"* — is already
correct and is unchanged.

## Capabilities

**New**: none
**Modified**: `agent-authoring` — the obligation to state a limit truthfully now
covers the metered quantity and the enforcement mechanism, not just the
unbounded-at-zero case.

## Out of Scope

- **Surfacing headroom and next-order sizing.** `get_agent_budget` publishes
  `headroomUsd`, `effectiveNotionalUsd` and four resolved gauges, and rendering
  them would let the limits surface answer *"why did my agent stop?"* directly.
  That is the `standard`-track half and stays on #299.
- **The other four hints on this form.** Only the exposure hint was measured
  wrong. The rest are untouched and unverified by this change.
- **`minAllocationUsd`'s hint**, which already names the $10 floor. The
  duplication between the two is deliberate: the causal link between the cap and
  the floor lives in neither field today, and this change puts it in the one
  where the operator's question arises.
- **The `accountEquityUsd` anomaly** recorded on #299 and #107 — observed, not
  concluded, and not acted on here.

## Impact

- `src/presentation/components/money-limits.tsx` — one string.
- `openspec/specs/agent-authoring/spec.md` — one requirement gains a clause and
  a scenario, at archive.
- No API, data, dependency or consumer change. No test asserts the current
  string, so nothing breaks; a new test is added to assert the claim it makes.
