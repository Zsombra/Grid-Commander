# Tasks

- [x] 1.1 Move `ConsultedSignal`, `ScoreAttribution`, `EvaluationChain` to
      `src/domain/agent/scorecard.ts`; `ExplorerPort` references them there.
- [x] 1.2 `AgentsPort`: `readOwnEvaluationDetail` (scorecard, attribution,
      chain, and the owner-only cost) and `readOwnFunnel`.
- [x] 1.3 Adapter + mappers over the live 2026-08-03 owner-side shapes.
- [x] 1.4 `/agents/[id]/pipeline` shows the funnel; each evaluation links
      to `/agents/[id]/pipeline/[logId]`, which shows the scorecard,
      attribution, chain and cost.
- [x] 1.5 Tests: mappers, rendering branches, live probe; reachability
      pins; all nine gates green.
