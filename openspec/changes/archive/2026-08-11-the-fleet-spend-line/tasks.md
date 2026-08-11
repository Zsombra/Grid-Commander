# Tasks: The Fleet Spend Line

- [x] 1. `readFleetSpend` on `AgentsPort`: the hub's `summary.totalCost24hUsd`
      and `summary.activeAgents`, null carried as null, or unreadable with its
      cause. Adapter maps `get_agents_hub`; a missing `summary` is malformed,
      not zero.
- [x] 2. `ReadFleetSpendQuery`; wired in `composition.ts` and the rendering
      harness.
- [x] 3. The line on `/agents`, read in parallel with the roster, failing
      independently in both directions.
- [x] 4. Conformance READS entry for `get_agents_hub` → `summary`; fake
      updated.
- [x] 5. Tests: adapter (total, null total, missing summary), query outcomes,
      rendering of all four scenarios.
- [x] 6. `./scripts/ci.sh` green; archive; close #129 with what shipped and
      the recorded declines; item done.
