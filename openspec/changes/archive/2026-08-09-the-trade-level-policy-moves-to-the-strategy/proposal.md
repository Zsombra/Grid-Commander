# The trade-level policy moves to the strategy

## Why

BattleGrid v15.0.0 moved `maxStopLossPct`, `minStopLossPct` and
`minRiskRewardRatio` off the agent's `tradingConfig` (18 → 15 keys, all
three now rejected) and onto the strategy — with the percentage stop floor
replaced by the volatility-adaptive `minStopLossAtrMultiple`.

Two consequences the record makes visible, and one the guards caught
before it cost anything:

- **`toApplyPlan` omitted all three, and they are `required` on
  `apply_strategy_plan`.** Every strategy apply this product composes
  would have been rejected by input validation — the eleventh dead write
  path, and the same shape as the `conditions` omission of 2026-07-31.
  Caught by `payload-conformance` the hour the v15 record landed, not by
  a live refusal.
- `TRADING_CONFIG_FIELDS` still carried the three names, so every agent
  create and full-config edit would have been refused wholesale.

## What Changes

- `docs/battlegrid-mcp-surface.json` re-probed at v15.0.0 (70 reads
  called, 0 failed); reference and capabilities dump regenerated from the
  same dump (114/114 documented, coverage green).
- `src/domain/strategy/compiled-plan.ts` — the three trade-level policy
  fields join `PLAN_FIELDS_FROM_POST_STATE`, with the v15 reason stated.
- `src/domain/agent/catalog.ts` — the three leave `TRADING_CONFIG_FIELDS`
  (18 → 15).
- `tests/support/agent-fakes.ts` — `READ_ONLY_CONFIG_FIELDS` grows to
  eight; the fixture moves the three to its non-overridable read-only tail.
- Guard expectations follow the record: `payload-conformance` (accepts 15,
  dropped 8), `money-limits` (15), `agreeing-to-a-limit` (fourteen others).
- Three tests used `maxStopLossPct` as their worked example and now use a
  field that survived: `maxSlippageBps` for merge survival, `maxDailyTrades`
  for a bounded-value refusal and for a catalog default.

## Not done here

The platform accepts the policy fields on `compile_strategy_plan` and
**does not apply them** — `diff.tradeLevelPolicy` comes back null and the
values are unchanged on read-back. Filed as
`v15-trade-level-policy-is-declared-but-inert` (p1). Until BattleGrid
implements it, nothing can set stop bounds or the RR floor, so there is no
product surface to build.
