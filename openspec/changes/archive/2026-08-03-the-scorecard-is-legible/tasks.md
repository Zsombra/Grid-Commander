# Tasks

- [x] 1.1 Port: `readCompetitorEvaluationDetail` returning scorecard,
      attributions and the gate→outcome chain; `none` distinct from
      `unreadable`.
- [x] 1.2 Adapter + mappers over the live 2026-08-03 shapes; owner-private
      fields never read; `executionMessage` carried verbatim, not parsed.
- [x] 1.3 `/explorer/[agentId]/evaluations/[logId]`: header, signals
      grouped by module with triggered marked, attribution, the chain.
- [x] 1.4 Link every evaluation on the competitor page to it.
- [x] 1.5 Tests: mappers (null detail, untriggered kept, chain stages),
      rendering branches, live probe; reachability pin; nine gates green.
