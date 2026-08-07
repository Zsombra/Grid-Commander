# Architecture Review — a-drafted-condition-can-be-saved

| Check | Result | Evidence |
|---|---|---|
| Domain imports no MCP client | PASS | `condition-write.ts` imports only sibling domain modules; `describe-condition-write.query.ts` imports ports, domain and two sibling use cases; boundaries suite green |
| Routes import neither infrastructure nor the domain | PASS | the save page reaches the domain shapes through `@/presentation/condition-form.js` and the use case, exactly as the try page does; boundaries suite green |
| One confirmation target, one digest | PASS | no target composed here — `DescribeApplyQuery` mints `strategyPlan(id, plan.intentDigest)` and `ApplyPlanCommand` recomputes the same; `confirmation-binds-values` green with no new construction site |
| Describe/perform split | PASS | separate objects; the describe never applies, the perform never mints; `confirmation-is-human` green (the action performs and does not propose) |
| Compile and apply are never held by one caller | PASS | `structure.test.ts` green: the describe holds the compile, the page's action holds the apply, and no file under `src/` names both |
| `postState` read in one place | PASS | `postStateDrift` lives beside `toApplyPlan` in `compiled-plan.ts`, the only module the projection guard permits to reach into it |
| No `?? 0` on a revision | PASS | `expectedRevision` is `summary.revision` from the fresh read; concurrency suite green |
| Composition | PASS | `describeConditionWrite` wired beside `tryCondition`, with its own compile and apply-describe instances rather than reaching sideways into the object under construction |
| Every route reachable, every control read | PASS | `reachability` green with the new action-bound route pinned; the four hidden fields are read by the action in the same file |
| A failed read explains itself | PASS | `failure-is-explained` green; the page's `unreadable` branch renders `WhyNotLoaded subject="this strategy is"` |
| Write results reach the person | PASS | refusals are caught and returned on `?problem=` with the edit preserved; the unread success payload is the ledger row in `write-results`, with its verdict |
