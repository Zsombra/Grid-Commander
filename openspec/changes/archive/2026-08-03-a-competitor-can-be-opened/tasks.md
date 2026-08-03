# Tasks

- [x] 1.1 Port: `readCompetitorPerformance`, `readCompetitorTrades`,
      `readCompetitorEvaluations`, `readCompetitorOpenPositions` — each its
      own three-state result; the two skip counters kept as two fields.
- [x] 1.2 Adapter + mappers over the live 2026-08-03 shapes.
- [x] 1.3 `ReadCompetitorQuery` — four reads in parallel, independently
      unreadable; composition wiring.
- [x] 1.4 `/explorer/[agentId]`: funnel, open positions, closed trades,
      evaluations. Link every field row to it.
- [x] 1.5 Tests: mappers, per-section rendering branches, live probe;
      reachability pin; all nine gates green.
