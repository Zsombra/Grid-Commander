# Tasks

## 1. The page reads what the form must offer
- [x] 1.1 `/agents/new` reads the strategy list beside the catalog
- [x] 1.2 An unreadable list renders no form, with its reason and
      `WhyNotLoaded` — the treatment the unreadable catalog already gets
- [x] 1.3 An empty list renders no form and says there is nothing to bind to

## 2. The control
- [x] 2.1 `AgentForm` takes the strategies and renders a required select
- [x] 2.2 Nothing preselected — the operator chooses
- [x] 2.3 Each option names the strategy and its scope, so a BattleGrid
      strategy is not mistaken for one of the operator's own

## 3. Verification
- [x] 3.1 Rendering test: the form offers every listed strategy, and none is
      selected
- [x] 3.2 Rendering tests: empty and unreadable both render no form
- [x] 3.3 The `KNOWN_UNSENDABLE` ledger row for `create::strategyId` is
      deleted — the guard's stale-row assertion fails until it is
- [x] 3.4 Gates: typecheck, lint, build, vitest
