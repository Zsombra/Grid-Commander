# Proposal: An Agent Says Whether It Is Acting

## Why

Established live 2026-07-31 (`does-an-agent-act-without-a-radar-deployment`):
an agent acts only where a radar deployment points it at a coin. Grid-Commander
authors agents end to end and never says whether one is deployed — a user can
configure an agent here and wait forever while it scans nothing. The operator's
account showed it concretely: two lifecycle-ACTIVE agents, zero positions,
absent from every radar slot. Backlog:
`the-app-authors-agents-it-cannot-deploy` (P2), step 1 — the read-only half,
which is most of the user value.

## What Changes

- A radar read reaches the product: `RadarPort.listDeployments` →
  `McpRadarAdapter` over `list_radar_deployments` (read, no arguments),
  mapped against today's live-observed shape.
- `ReadDeploymentsQuery.execute({who, agentId})` answers for one agent:
  `deployed` (rows of coin + timeframe + state: holding the position / on
  duty / in the rotation), `not-deployed`, or `unreadable` with the reason.
- The agent detail page gains a Deployment section rendering all three
  honestly — an unreadable radar never renders as "not deployed", and
  "not deployed" says plainly that the agent is configured but scanning
  nothing, and where deployment happens today (battlegrid.trade).
- `mcp-conformance` covers the new call site.

## Capabilities

**New**: none
**Modified**: `agent-understanding` — one ADDED requirement.

## Out of Scope

- **The roster indicator** — stays on the backlog item (the item remains open
  for it plus the writes).
- **Deploy/undeploy writes** (`upsert/delete_radar_deployment`) — step 2 on
  the item, guarded and confirmed, its own change.
- **Deployment policies / market grid** — other clusters entirely.

## Impact

`src/ports/radar.ts` (new), `src/infrastructure/battlegrid/radar-adapter.ts`
(new), `src/domain/agent/deployment.ts` (new — types only reach app via the
query), `src/application/use-cases/read-deployments.query.ts` (new),
`src/composition.ts`, `app/(app)/agents/[id]/page.tsx`, fakes + tests,
`tests/architecture/mcp-conformance.test.ts`.
