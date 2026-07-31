# Proposal: Deploy And Undeploy Are Offered

## Why

Step 2 of `the-app-authors-agents-it-cannot-deploy` (P2), operator-ordered.
The app now *says* whether an agent is acting; it still cannot change it —
the go button lives only on battlegrid.trade. The radar writes exist and
their contracts are fully recorded: `upsert_radar_deployment` (write, closed
at every level, per-slot shape observed live) and `delete_radar_deployment`
(destructive: `coinId`, `confirm: true`, `expectedRevision`).

## What Changes

- **Undeploy**, from the agent page's deployment rows: a describe→confirm→
  delete flow. The confirmation names the agent, the coin, and what stops
  happening. Fully specified by the record; zero guesses.
- **Deploy**, from the agent page: choose a coin and a timeframe; the product
  composes the one-slot policy in the shape observed live (`isDefault: true`,
  `conditions: []`, `minConviction/priority: null`) and confirms before
  sending. A coin that already has a policy is REPLACED — the flow must show
  who is deployed there now, before the person agrees.
- **Two recorded unknowns, resolved during execution, never guessed**:
  (1) `expectedRevision` on first deploy to a coin — **resolved live
  2026-07-31, against the proposal's own expectation**: the platform refuses
  every value when no policy exists (`expectedRevision > 0` by schema;
  `CONFLICT … actualRevision: null` for any positive value), so there is no
  first-deploy path through this surface at all. Deploy ships refusal-honest:
  an unoccupied coin is refused at describe with that reason, and only
  replacement of an existing deployment is offered. Evidence in DL-3; pinned
  by the key-gated live probe. (2) The timeframe options come from the runtime
  discovery's input schema, never a compiled-in list; if discovery drops
  schemas, they are threaded through — the 13-value enum is a fact about
  today, not a constant of the product.
- Both flows go through the full guard sequence and are audited; deploy gets
  a confirmation by product decision even though the tool is `write` —
  deploying grants autonomous authority over a market.

## Capabilities

**New**: `agent-deployment` — deploying and undeploying an agent's radar
presence. (Reads/visibility stay in `agent-understanding`.)
**Modified**: none.

## Out of Scope

- Multi-slot rotations, conditions (time windows, regime gates), priorities —
  the platform supports them; v1 composes exactly the one-slot shape the
  operator's own account uses.
- Deployment policies (`upsert/delete_deployment_policy`) and Market Grid.
- Coin discovery/validation UI — v1 takes a ticker and lets the platform's
  refusal surface (refusals reach the operator now).

## Impact

`src/ports/radar.ts` (+writes), `radar-adapter.ts`, new use-cases
(describe/perform × deploy/undeploy), `confirmationTarget` additions,
agent page deployment section (+forms/pages), composition, fakes, tests,
conformance coverage. Wager scope untouched; `mcp:read` suffices (upsert
mutates on read scope — exactly why the guard, not scope, is the boundary).
