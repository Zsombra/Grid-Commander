# Tasks

## 1. Port, adapter, mapper

- [x] 1.1 `src/ports/agents.ts`: `PerformanceReading` (realizedPnlUsd,
      curve as readonly finite numbers, haltedAt) + `PerformanceResult`
      (reading | unreadable with reason and cause) + `readPerformance` on
      `AgentsPort`.
- [x] 1.2 `agent-adapter.ts`: `TOOLS.performance = 'get_agent_performance'`,
      `readPerformance` following `readBudget`'s failure shape.
- [x] 1.3 `agent-mapper.ts`: `mapPerformance` — `performance` envelope with
      bare fallback; curve keeps only finite numbers; absent fields map to
      null, never invented.

## 2. Query and wiring

- [x] 2.1 `read-loss-shape.query.ts`: `ReadLossShapeQuery` returning
      loss-shape | unreadable; settled count derived from the kept points.
- [x] 2.2 Composition root: construct and expose the query.

## 3. Presentation

- [x] 3.1 `loss-shape.tsx`: signed figure, hand-scaled SVG sparkline
      (oldest-first, zero baseline), "nothing has settled yet" sentence for
      the empty curve, caption naming the budget-baseline span; unreadable
      arm via `WhyNotLoaded`.
- [x] 3.2 `limits/page.tsx`: fourth read in the `Promise.all`, section
      rendered directly below `Ceilings`.

## 4. Verification

- [x] 4.1 Mapper tests: envelope and bare payloads, junk entries dropped
      from the curve, empty curve, missing fields → null.
- [x] 4.2 Query test: reading arm and unreadable arm pass through; count
      matches kept points.
- [x] 4.3 Rendering tests, one per scenario arm: populated curve (figure +
      caption + svg present), empty curve (settled-nothing sentence, no
      error), unreadable performance read with readable budget (gauges
      still render, section explains itself). Conflation guard: the section
      names its span; the record page's caption untouched.
- [x] 4.4 Gates: typecheck, lint, vitest (2419+/190 baseline grows), build,
      drizzle no-op; test:db deliberately skipped (live record db — the
      guard's refusal is correct).
- [x] 4.5 Close the loop when this archives: #202 → done, issue commented
      and closed; file `the-loss-shape-is-not-on-the-assistants-limits-read`.
