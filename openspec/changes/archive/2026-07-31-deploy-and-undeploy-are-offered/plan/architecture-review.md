# Architecture Review
| Rule | Status | Evidence |
|---|---|---|
| Port boundary (domain never imports MCP) | PASS | New writes live on `src/ports/radar.ts`; `deploy-agent.command.ts` imports ports + domain only; `tests/architecture/*` boundary scans green (full suite 2026-07-31) |
| Composition is the only wiring point | PASS | Four use-cases wired in `src/composition.ts` (describeDeploy/performDeploy/describeUndeploy/performUndeploy); no other construction site — reachability/corridor guards green |
| Confirmation targets built only in confirmation.ts | PASS | `agentDeploy`/`agentUndeploy` added to `confirmationTarget`; `edit-binding.test.ts` inline-composition scan green (15 tests) |
| Identifier discipline (no `?? 0` coercion) | PASS | `concurrency.test.ts` guard forced the explicit branch, then DL-3 removed the 0 branch entirely; mapper throws on a policy missing `revision` |
