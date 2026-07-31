# Production Gate — deploy-and-undeploy-are-offered

- Change ID: `deploy-and-undeploy-are-offered`
- Track: `full`
- Evidence window: `596f25a..working-tree` (audited pre-commit; the commit
  this ships in is the next on `claude/app-review-backlog-reconcile-ip3mwk`)
- Audit timestamp: `2026-07-31 15:30 UTC`
- Decision: **PASS**

## Handoff Integrity

| # | Check | Result |
|---|---|---|
| 1 | Master plan ends `EXECUTION READY FOR PRODUCTION GATE` | VALID |
| 2 | Execution checklist complete | VALID — 11/11 tasks, 0 unchecked |
| 3 | Required review artifacts on disk | VALID — architecture, data, uiux, decision-log, all rows PASS with evidence |
| 4 | Decision log has planner and executor entries | VALID — 2 PLANNING, 2 EXECUTION (DL-3 resolves DL-2 with verbatim platform payloads) |
| 5 | Plan claims contradicted by execution disclosed, not corrected quietly | VALID — the proposal's own create-convention expectation was falsified live and is recorded as such in proposal.md, DL-3, DL-4, and the delta spec |
| 6 | File inventory matches `git status` | VALID — every changed path named in design.md File Changes or a recorded process artifact |

## Spec Parity

`openspec.py validate deploy-and-undeploy-are-offered` → clean. 1 new
capability (`agent-deployment`), 2 requirements, 7 scenarios.

### Undeploying Names What Stops Happening

| Scenario | Delivered | Evidence |
|---|---|---|
| Undeploying a scanning agent | YES | `DescribeUndeployQuery` consequence names agent, market, "stops scanning"; token bound `agent:X=/=coin:Y`; `deploy.test.ts` pins target, tool, revision-from-read |
| The radar moved between reading and confirming | YES | expectedRevision from the describe's fresh read; platform conflict → `RevisionConflictError` → `{kind:'refused'}` → `?problem=` (`deploy.test.ts` "thrown refusal reaches the caller") |
| A removal that is refused | YES | perform catch carries the platform reason; `deleted: false` is a refusal, never success (`deploy.test.ts`) |

Live residual, disclosed: `delete_radar_deployment` composition-proven
(payload-conformance) but not live-walked — DL-4: with creation impossible,
the only deletable deployments are the operator's real ones.

### Deploying Is Agreed To Against The Market It Touches

| Scenario | Delivered | Evidence |
|---|---|---|
| Deploying to a market with no deployment (refusal) | YES | describe refuses with the platform-limit reason before any token is minted (`deploy.test.ts`); pinned live: AAVE create refused, `CONFLICT … actualRevision: null` (radar-probe 2026-07-31) |
| Deploying onto an occupied market | YES | consequence names the slotted agents before agreement (`deploy.test.ts`); live propose named the replaced agent verbatim |
| A timeframe the platform does not declare | YES | select options = `deploymentTimeframes()` runtime enum; unknown value refused at describe naming the permitted list; empty declaration refuses composition |
| A deploy that is refused | YES | perform catch → `?problem=` on the deploy page, choice preserved |

Live proof of the whole path: HYPE replaced-in-place through
describe → confirm → perform, r1→r2, read back enabled with the same slot
agent (radar-probe 2026-07-31).

## Guard Sequence

Both writes route through `battlegrid.callTool` with target +
confirmationToken — the same `beginGuardedCall` path every write uses: scope
check, confirmation consume (user+tool+target), audit begin/complete.
Targets are built only in `confirmation.ts` (`edit-binding` scan), bind the
agent+coin pair AND the verb, and performs recompute them from submitted
values — a tampered coin spends nothing (`deploy.test.ts` proves the store
refuses the recomputed target).

## Gates

typecheck ✓ lint ✓ vitest 883 ✓ test:db 60 (migrated PostgreSQL) ✓
drizzle-kit check ✓ next build ✓ python harness 217 ✓ validate --all ✓

## Findings

- PG-D1 (info): the live upsert schema constrains `expectedRevision > 0`
  with an exclusive minimum the recorded artifact's grammar cannot express;
  noted in the payload-conformance case rather than silently widened.
- PG-D2 (accepted): two live probe runs advanced FARTCOIN and HYPE policy
  revisions (1→2) with identical content — semantic no-ops, recorded in
  DL-4.
