# Tasks: author-strategies

## 0. Establish the facts (done)

- [x] 0.1 `list_strategies` — quota, scopes, `boundAgentCount`
- [x] 0.2 `list_strategy_categories` — 10 categories, 61 metrics
- [x] 0.3 A real `compile_strategy_plan` — token layout, `approvedPlan` shape,
      `confirmationSummary`, advisory mismatches
- [x] 0.4 Record what changed the design in `findings-strategies.md`

## 1. Domain

- [ ] 1.1 `strategy.ts` — a strategy as the rules need it, with its blast radius
- [ ] 1.2 `plan-token.ts` — parse the claims; refuse-only (S-B)
- [ ] 1.3 `compiled-plan.ts` — `toApplyPlan()` projection (S-A), viability gate
      (S-C), intent binding (S-E)
- [ ] 1.4 `vocabulary.ts` — categories and metrics as read
- [ ] 1.5 Tests per rule

## 2. Ports and application

- [ ] 2.1 `src/ports/strategies.ts`
- [ ] 2.2 `list-strategies.query.ts` — roster, quota, blast radius
- [ ] 2.3 `compile-plan.command.ts` — compile, never apply
- [ ] 2.4 `apply-plan.command.ts` — confirmation-gated, projection-only
- [ ] 2.5 `fork-strategy.command.ts`
- [ ] 2.6 `strategy-lifecycle.command.ts` — archive / restore incl. REPAIR_REQUIRED
- [ ] 2.7 `read-vocabulary.query.ts`

## 3. Infrastructure

- [ ] 3.1 `strategy-adapter.ts` — the envelope shape `{request: …}` for the four
      tools that need it
- [ ] 3.2 `strategy-mapper.ts` — payload → domain

## 4. Presentation

- [ ] 4.1 Strategy list with blast radius
- [ ] 4.2 Compile editor
- [ ] 4.3 Review screen, organised by changed axis
- [ ] 4.4 Apply confirmation carrying the server's summary
- [ ] 4.5 Routes

## 5. Verification

- [ ] 5.1 A test per scenario — 8 requirements, 21 scenarios
- [ ] 5.2 Structural: no compile path can apply
- [ ] 5.3 Structural: no platform vocabulary literal outside the adapter
- [ ] 5.4 Structural: token claims never grant
- [ ] 5.5 Mutation-check the projection and the viability gate
- [ ] 5.6 All quality gates green
