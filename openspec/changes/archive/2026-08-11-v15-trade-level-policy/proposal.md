# Show the trade-level policy a strategy declares

## Problem

BattleGrid v15 moved three trade-level policy fields off the agent's
`tradingConfig` and onto the strategy: `maxStopLossPct` (stop-loss ceiling),
`minStopLossAtrMultiple` (volatility-adaptive stop-loss floor, replacing the
old percentage-based `minStopLossPct`), and `minRiskRewardRatio` (risk:reward
minimum). Every `get_strategy` response carries them; every
`apply_strategy_plan` request requires them.

But Grid-Commander does not read them from the strategy, does not show them on
the strategy detail page, and cannot change them — the compiler silently drops
value changes, and policy-only updates are refused as no-op. The entire fleet
is pinned to platform defaults (RR 1.5, stop floor 1× ATR, stop ceiling 5%)
with no visibility into what those defaults are.

The agent's risk-reading panel already says "set on its strategy" for these
fields, but the strategy page — the place the operator would go to see or
change them — shows nothing.

## Intent

**Show what the strategy declares, and refuse to pretend it can be changed.**

Read the three trade-level policy fields from `get_strategy`, present them on
the strategy detail page alongside the existing thresholds, and state that the
values are set by the platform while the compiler does not process changes to
them. Do not offer editing — offering a dead write path is the exact class of
defect `HANDOFF.md` catalogues.

## Capabilities touched

- **strategy-authoring** — MODIFIED (the strategy detail gains trade-level
  policy) + ADDED (the inert state is handled explicitly)

## Scope

### In scope

- Add `TradeLevelPolicy` to the strategy domain model
- Read `maxStopLossPct`, `minStopLossAtrMultiple`, `minRiskRewardRatio` from
  `get_strategy` in the strategy adapter mapper
- Present the policy on the strategy detail page — a new section between "When
  it acts" and "What decides direction"
- State that the values are platform-set and not editable through this product
  while the compiler remains inert
- Carry the fields through `fork_strategy` output mapping (the fork returns a
  strategy)

### Out of scope

- Editing trade-level policy (the compiler is inert — #95)
- `feasibilityAdvisory` per-coin ATR readings on the agent side
- The stop-vs-noise comparison (#85), which depends on this read but is a
  separate item
- Upstream report to BattleGrid about the inert compiler
- Changing the agent risk-reading panel (it already handles this correctly)
- Strategy preview's budget gauges or condition resolution (unrelated)
