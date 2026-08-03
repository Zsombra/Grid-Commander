# Tasks

- [x] 1.1 `ExplorerPort` — `readField` and `readLeaderboard`, each with its
      own three-state result; types keep null rates null and keep `shown`
      separate from `totalAgents`.
- [x] 1.2 `McpExplorerAdapter` + mappers over the live 2026-08-03 shapes.
- [x] 1.3 `ReadFieldQuery` — both reads in parallel, independently
      unreadable; composition wiring.
- [x] 1.4 `/explorer`: where this account stands, the field baseline, the
      ranked resumes with the partial-list and small-sample caveats, the
      per-vendor breakdown. Nav entry.
- [x] 1.5 Tests: mappers (null rate, partial list, absent currentUser),
      rendering per branch, live probe; all nine gates green.
