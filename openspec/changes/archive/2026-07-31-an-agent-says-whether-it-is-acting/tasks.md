# Tasks

## 1. The read path
- [x] 1.1 `src/domain/agent/deployment.ts`: RadarDeployment (policy id, coin
      ticker, timeframe, enabled, slot agent ids, on-duty id, position-holder
      id) and the per-agent view derivation.
- [x] 1.2 `src/ports/radar.ts` + `McpRadarAdapter` over
      `list_radar_deployments`, mapping the live-observed shape; malformed
      entries dropped, never invented.
- [x] 1.3 `ReadDeploymentsQuery.execute({who, agentId})` → deployed rows /
      not-deployed / unreadable(reason); wired in composition.

## 2. The surface
- [x] 2.1 Agent detail page Deployment section: three states, honest copy;
      unreadable never renders as not-deployed.

## 3. Verification
- [x] 3.1 tests: mapper (observed shape, malformed), derivation (position /
      on-duty / rotation / none), query unreadable path, page renders the
      three states (source-scan), FakeRadarPort in support.
- [x] 3.2 mcp-conformance CALL_SITES covers the radar adapter.
- [x] 3.3 Gates green; item updated (step 1 done, roster + writes remain).
