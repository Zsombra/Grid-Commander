# UI Review
| Rule | Status | Evidence |
|---|---|---|
| Consequence before agreement (occupied coin named) | PASS | Deploy page renders `proposal.consequence` (the stored token string) before the confirm form; live propose named the replaced agent verbatim (radar-probe log 2026-07-31) |
| Refusals as ?problem= role=alert on the surface acted from | PASS | Both performs redirect back with `?problem=`; describe refusals render role=alert; deployment.test.ts + deploy.test.ts pin the copy |
| Form controls carry the shared treatment | PASS | Coin input + timeframe select use `CONTROL` (controls.test.ts green) |
| Reachability | PASS | `/agents/[id]/deploy` linked from the agent page's deployment section; undeploy is `/agents/[id]/undeploy/[coin]` path links per row; orphan / mutation-corridor / way-back walks green |
