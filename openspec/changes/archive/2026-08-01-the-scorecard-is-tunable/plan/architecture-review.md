# Architecture Review — the-scorecard-is-tunable

| Check | Result | Evidence |
|---|---|---|
| Domain imports no MCP client | PASS | `retune-rule.command.ts` imports ports + domain only; boundaries suite green |
| Target built only in confirmation.ts | PASS | `strategyRule` lives in `confirmationTarget`; both mint and spend call it; edit-binding suite green |
| Describe/perform split | PASS | separate classes; the perform never mints; the describe never writes |
| Single route to BattleGrid | PASS | the write goes through `McpStrategyAdapter.call` → guard sequence; one-destination suite green |
| Composition | PASS | `describeRetune`/`retuneRule` wired in `composition.ts` beside their siblings |
| No `?? 0` on identifiers/revisions | PASS | `expectedRevision` always `summary.revision` from the fresh read; concurrency suite green |
