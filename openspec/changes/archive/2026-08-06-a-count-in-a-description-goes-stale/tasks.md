# Tasks

- [x] 1.1 Done. `read_signal_library` and `read_metric_index` describe what they
      answer; the tool returns the list, which is the only count that can be right
- [x] 1.2 Done. `docs/MCP_SERVER.md` drops both numbers from its tool table
- [x] 1.3 Done. Four comments across `strategy.ts`, `strategy-detail.tsx` and
      `strategy-conditions.tsx` describe the property rather than the tally —
      the reasoning they carry is about rules having weights, not about how many
- [x] 1.4 Done, and it **found a third instance immediately**:
      `simulate_aggregate` said "At most 20 signals" while its own input schema
      already declared `maxItems: 20`. Two copies of one number, and a client
      reads the schema. The description now keeps only what the schema cannot
      express — that going over is *refused rather than truncated*.
      Proved by injection: a description reading "All 12 strategies" fails with
      `list_strategies: "12 strategies"`
- [x] 1.5 Done. `./scripts/ci.sh` green
