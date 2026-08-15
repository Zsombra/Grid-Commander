# Tasks

## 1. The tool

- [x] 1.1 `src/mcp/tools.ts`: `read_forward_returns` beside
      `read_record_coverage` — wraps `app.readForwardReturns`, takes only
      authority (no arguments: the query takes only a user id), and the
      description states the gap-exclusion discipline, the sample-size
      ordering with the instruction not to re-rank, that this reads
      Grid-Commander's own store rather than BattleGrid, and names the four
      states the answer can take.

## 2. Verification

Tests live in `tests/mcp/recorder-tools.test.ts` rather than
`tests/mcp/server.test.ts` as first written: that file is already the record's
own boundary test, holds the seeding helpers, and its `seededStore` fixture
records days 1–5 then day 8 — a spacing the coverage derivation already calls
a gap, which is the fixture the exclusion assertion needs.

- [x] 2.1 The populated analysis through a real client — baseline and groups
      with their `n`, `pairCount` and `seriesCount` carried, and only the
      signal that fired earning pairs.
- [x] 2.2 A record where the smallest group has the highest mean, proving the
      order is by sample size and not by the return.
- [x] 2.3 The gap-spanning pair excluded and counted: six captures, four
      pairs, `excludedOverGaps` 1.
- [x] 2.4 `not-deep-enough`, `never-recorded` and `unreadable` each answered
      as themselves and mutually distinguishable — `unreadable` folded into
      the existing three-tool store-outage test.
- [x] 2.5 Both disciplines present in the description a real client receives
      from `listTools`.
- [x] 2.6 `tests/live/mcp-full-surface-probe.test.ts`: registry pin 26 → 27
      and a probe call beside `read_record_coverage`, unconditionally (the
      tool is account-scoped, so there is no skip arm).
- [x] 2.7 Gates: typecheck, lint, vitest, build, drizzle no-op. `test:db`
      deliberately skipped — no schema change.
- [x] 2.8 At archive: backlog item `the-analysis-is-not-on-the-models-surface`
      → done, issue #283 commented and closed.
