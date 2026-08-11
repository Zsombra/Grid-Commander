# Tasks — v15-trade-level-policy

## Domain

- [x] **T1: Add `TradeLevelPolicy` type to strategy domain**
  Add a `TradeLevelPolicy` interface to `src/domain/strategy/strategy.ts` with
  `maxStopLossPct: number`, `minStopLossAtrMultiple: number`, and
  `minRiskRewardRatio: number`. Add a `tradeLevelPolicy: TradeLevelPolicy`
  field to `StrategyDetail`.
  *Traces to: A Strategy Can Be Read In Full (looking at a strategy),
  Trade-Level Policy Is Shown As Platform-Set While Inert (the policy is
  visible).*

## Infrastructure

- [x] **T2: Read trade-level policy from `get_strategy` in the mapper**
  In `src/infrastructure/battlegrid/strategy-adapter.ts`, extend
  `mapStrategyDetail()` to extract `maxStopLossPct`,
  `minStopLossAtrMultiple`, and `minRiskRewardRatio` from the raw response
  and map them into the new `tradeLevelPolicy` field on `StrategyDetail`.
  *Traces to: A Strategy Can Be Read In Full (looking at a strategy).*

- [x] **T3: Carry trade-level policy through fork output mapping**
  Verify that `fork_strategy` responses flow through the same mapper and
  the forked strategy's detail page shows the inherited policy. The fork
  output is a `strategy` object, same shape as `get_strategy`.
  *Traces to: Trade-Level Policy Is Shown As Platform-Set While Inert (the
  values travel through a fork).*

## Presentation

- [x] **T4: Render trade-level policy on the strategy detail page**
  In `src/presentation/components/strategy-detail.tsx`, add a section
  between "When it acts" and "What decides direction" showing the three
  policy values: stop-loss floor (ATR multiple), stop-loss ceiling
  (percentage), and risk:reward minimum. Label each for what it governs.
  *Traces to: A Strategy Can Be Read In Full (looking at a strategy),
  Trade-Level Policy Is Shown As Platform-Set While Inert (the policy is
  visible).*

- [x] **T5: State the inert condition — no editing offered**
  Below the policy values, render a note stating that the values cannot be
  changed through this product while the platform's compiler does not
  process them. No editing control. The note names the cause (compiler
  inertness), does not blame the product or operator.
  *Traces to: Trade-Level Policy Is Shown As Platform-Set While Inert (no
  editing is offered).*

## Tests

- [x] **T6: Unit tests for the mapper and domain type**
  Test that `mapStrategyDetail()` extracts all three policy fields correctly,
  and that missing/unexpected values are handled (the fields are required in
  the platform's schema, so the happy path is the only path — but the mapper
  should not crash on a platform that stops sending them).
  *Traces to: infrastructure correctness.*

- [x] **T7: Presentation test for the policy section**
  Test that `StrategyDetailView` renders the policy section with the three
  values and the inert-state note. Test that no editing control is rendered.
  *Traces to: Trade-Level Policy Is Shown As Platform-Set While Inert
  (no editing is offered, the policy is visible).*

## Quality gates

- [x] **T8: All quality gates pass**
  `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  `npm run db:generate && git diff --quiet drizzle/`.
  *Infrastructure.*
