# Tasks

## 1. Port and adapter
- [x] 1.1 RadarPort: upsertDeployment, deleteDeployment, deploymentTimeframes.
- [x] 1.2 Adapter: compose the closed shapes exactly; timeframe enum read
      from the runtime-discovered upsert schema; guard-routed calls.
      (Also: RadarDeployment carries `revision`; the mapper refuses a policy
      without one — a defaulted 0 would feed a blind write.)

## 2. Confirmations and commands
- [x] 2.1 confirmationTarget.agentDeploy / agentUndeploy (agent+coin pair).
- [x] 2.2 DescribeDeploy/PerformDeploy, DescribeUndeploy/PerformUndeploy:
      describe reads radar (occupied-coin consequence + revision) and mints;
      perform spends and calls; refusal reasons carried. Amended by DL-3:
      describe REFUSES an unoccupied coin (no create path exists).

## 3. Surfaces
- [x] 3.1 /agents/[id]/deploy: coin input, timeframe select (runtime values),
      consequence render, confirm form, ?problem= refusals.
- [x] 3.2 /agents/[id]/undeploy/[coin]: consequence + confirm, same pattern
      (coin as path segment so the reachability walk sees a plain link).
- [x] 3.3 Agent page deployment rows link to both.

## 4. Live verification (operator key granted this session)
- [x] 4.1 The create-revision probe. DECISIVE, against expectation: no value
      exists — schema requires expectedRevision > 0, and a coin with no
      policy answers every value with CONFLICT (actualRevision: null).
      Recorded in DL-3; product refuses unoccupied coins.
- [x] 4.2 Amended by DL-4 (creation impossible → nothing safe to delete):
      live deploy walked end-to-end through the product commands by
      replacing HYPE with itself (same agent/timeframe/enabled; r1→r2,
      read back verified). delete_radar_deployment NOT live-walked —
      composition-proven only; residual recorded in DL-4.

## 5. Verification
- [x] 5.1 Tests: targets bind the pair; describe says replacement; perform
      refuses tampered coin; payload passes payload-conformance against
      upsert/delete records; write-results ledger untouched (results read).
      Plus: unoccupied-coin refusal; key-gated live probe pinning DL-3.
- [x] 5.2 Gates green; validate zero errors. (typecheck, lint, 883 vitest,
      60 test:db on migrated PostgreSQL, drizzle check, build, 217 python
      harness, validate --all clean — 2026-07-31)
