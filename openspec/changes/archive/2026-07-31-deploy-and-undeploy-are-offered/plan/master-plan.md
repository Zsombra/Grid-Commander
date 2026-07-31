# Master Plan — deploy-and-undeploy-are-offered

Current phase: Execution

## Non-Negotiable Constraints (from config + checklists)
1. Domain never imports the MCP client; radar stays behind the port.
2. No value the operator did not choose reaches the wire unless the platform's
   declaration permits it and the choice is stated (inert slot extras).
3. Every write confirmed by a person against agent+coin; token minted by
   describe, spent by perform, never self-issued in one request.
4. Every write audited; refusals reach the surface acted from (?problem=).
5. No compiled-in tool knowledge: timeframes from runtime discovery.
6. Results of writes are read (write-results guard stands).
7. Quality gates: npm run typecheck/lint/test/build, drizzle check, test:db
   (config.yaml list); ./scripts/check.sh python gates.

## File Inventory
See design.md File Changes (mirrored; executor updates on drift).

## Requirement Coverage Matrix
| Requirement | Impl | Proof |
|---|---|---|
| Undeploying Names What Stops Happening | undeploy command+page | tests: consequence text ("stays configured"), revision from fresh read, refusal carried, deleted:false is a refusal. Live: NOT walked — DL-4 (creation impossible → no deletable throwaway); composition held by payload-conformance |
| Deploying Is Agreed To Against The Market It Touches | deploy command+page | tests: shape vs record, occupied-coin consequence names replaced agent, runtime timeframes, tampered-coin refusal, unoccupied-coin refusal (DL-3). Live: create-refusal pinned + HYPE replace r1→r2 through describe→confirm→perform (radar-probe, 2026-07-31) |

## Phase 2 Review Checklist
- [x] Architecture: port boundary, composition wiring, no domain→MCP
- [x] Data: payload shapes vs conformance record (closed sets, required paths)
- [x] UI: three-state honesty preserved on agent page; refusals visible
EXECUTION READY FOR PRODUCTION GATE
