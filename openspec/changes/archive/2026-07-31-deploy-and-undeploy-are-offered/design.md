# Design: Deploy And Undeploy Are Offered

## Technical Approach

Extend `RadarPort` with two writes mirrored on `McpRadarAdapter`:
`upsertDeployment` (composes `{coinId, request}` exactly per the recorded
closed shapes) and `deleteDeployment` (`{coinId, confirm: true,
expectedRevision}`). Two describe/perform use-case pairs mint and spend
confirmations bound to agent+coin. Two small pages own the flows
(`/agents/[id]/deploy`, `/agents/[id]/undeploy/[coin]` — the coin is a path
segment so the reachability walk sees a plain link), linked from the agent
page's Deployment section; refusals return as `?problem=` per the
established pattern.

## Decisions

### Decision: Both flows are person-confirmed, though upsert is only `write`
Deploying grants autonomous authority over a market — the money rule, not the
destructive flag, is what binds here. Rejected: confirmation only for delete
(classification-driven) — scope and classification are not the safety
boundary in this product; consequence is.

### Decision: Confirmation targets bind agent AND coin
`confirmationTarget.agentDeploy(agentId, coinId)` / `.agentUndeploy(agentId,
coinId)` — the pair, like rebind. A token for deploying to HYPE must not
authorise FARTCOIN. Rejected: target = agentId alone (the $25/$25,000 shape).

### Decision: v1 composes the one-slot inert-extras shape observed live
`slots: [{agentId, conditions: [], isDefault: true, minConviction: null,
priority: null}]`, `enabled: true` — byte-shaped on the operator's own
account's slots. Rejected: exposing conditions/priorities in v1 (unobserved
combinations, no user need named yet).

### Decision: First-deploy expectedRevision is verified live, not guessed
The upsert requires `expectedRevision`; its create-time value was unobserved.
The live probe (task 4.1) was decisive in the direction nobody proposed:
**there is no create value.** The schema demands `expectedRevision > 0` and a
coin with no policy answers every value with `CONFLICT … actualRevision:
null` — `upsert_radar_deployment` replaces existing deployments only. So the
describe refuses unoccupied coins with that reason instead of minting an
agreement the perform is guaranteed to lose. Verbatim evidence in DL-3;
pinned live by tests/live/radar-probe.test.ts. Rejected: shipping 0
unverified — the five-dead-write-paths lesson, vindicated.

### Decision: Timeframes come from the runtime discovery
The discovery layer already fetches `tools/list`; the adapter exposes the
upsert schema's `request.deploymentTimeframe` enum through the port
(`deploymentTimeframes()`). Falls back to refusing composition (not to a
baked list) if absent. Rejected: compiling in today's 13 values.

### Decision: Occupied-coin replacement is said before agreement
`describeDeploy` reads the radar; if the coin has a policy, the consequence
names the currently slotted agents and says they are replaced, and
`expectedRevision` comes from that read. Rejected: letting the platform's
refusal be the first notice (that is for *conflicts*, not for the known
current state).

## Data Flow

agent page → deploy/undeploy page (GET) → describe use-case (reads radar +
schema, mints confirmation naming consequence) → person confirms (POST) →
perform use-case (spends token bound agent+coin, calls adapter through the
guard) → success redirects to the agent page; refusal returns as ?problem=.

## File Changes

- src/ports/radar.ts (modify) — writes + timeframes on the port
- src/infrastructure/battlegrid/radar-adapter.ts (modify) — the two calls +
  schema-enum exposure
- src/domain/capability/confirmation.ts (modify) — two targets
- src/application/use-cases/deploy-agent.command.ts (new) — describe+perform ×2
- src/composition.ts (modify)
- app/(app)/agents/[id]/deploy/page.tsx, undeploy/[coin]/page.tsx (new)
- app/(app)/agents/[id]/page.tsx (modify) — links on deployment rows
- src/domain/agent/deployment.ts (modify) — `revision` carried on
  RadarDeployment; the mapper refuses a policy without one (a defaulted 0
  would feed a blind write)
- tests/support fakes (modify), tests/agent/deploy.test.ts (new),
  tests/live/radar-probe.test.ts (new, key-gated),
  edit-binding scan unaffected (targets built in confirmation.ts)
