# Tasks

## 1. The tool

- [x] 1.1 `src/mcp/tools.ts`: `read_loss_shape` beside `read_agent_limits` —
      wraps `app.readLossShape`, requires `agentId`, description states the
      budget-baseline span, points lifetime at `read_trading_record`, and
      says an empty curve means no settlements.

## 2. Verification

- [x] 2.1 `tests/mcp/server.test.ts`: the populated answer through a real
      client; empty-vs-unreadable distinguishable.
- [x] 2.2 `tests/live/mcp-full-surface-probe.test.ts`: registry pin 25 → 26,
      probe call beside `read_agent_limits`, skip entry in the no-agent arm.
- [x] 2.3 Gates: typecheck, lint, vitest, build, drizzle no-op; `test:db`
      deliberately skipped (live record db).
- [x] 2.4 At archive: backlog item → done, issue #272 commented and closed.
