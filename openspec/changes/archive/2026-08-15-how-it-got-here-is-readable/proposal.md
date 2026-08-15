# Proposal: How it got here is readable

## Why

`/agents/[id]/limits` answers "how close is this agent to being stopped" —
the drawdown gauge reads 1.90 of 6 — but nothing answers **how it got
there**: 1.90 of 6 reads the same whether it arrived in one bad trade this
morning or drifted there across 41 settlements, and those are two different
agents. The platform publishes exactly this — `get_agent_performance`
carries the cumulative realized P&L since the budget baseline and a
per-settlement curve — and nothing in the product calls it (backlog
`realized-pnl-against-its-stop-is-unread`, #202; the premise it answers
was settled by #189).

## What Changes

- A new read: `get_agent_performance` (mcp:read, read-only, not
  destructive) consumed through `AgentsPort`, mapped defensively (the
  payload arrives under a `performance` envelope — recorded live in
  `tests/support/performance-payloads.ts` — with a bare fallback, the same
  tolerance `mapBudget` has for its envelope).
- `/agents/[id]/limits` gains a **loss shape** section directly below the
  gauges: the signed realized figure and the curve it moved along, drawn as
  a hand-scaled inline SVG sparkline (the product's second chart;
  `TradeChartSvg` is the precedent — no charting dependency, a sentence
  when there is nothing drawable).
- The reading names its span — since the budget baseline, as BattleGrid
  measures it — and is never combined with the lifetime trading record.
  An empty curve renders as "nothing has settled yet", per v18's own
  semantics ("an empty curve means no settlements yet, not missing data").
- The read fails independently: gauges and warnings render from
  `get_agent_budget` exactly as today whether or not the performance read
  answers.

## Capabilities

**New**: none
**Modified**: `agent-understanding` — one ADDED requirement

## Out of Scope

- **Widening `mapBudget`.** The item's "cheap route" suggested keeping the
  top-level `realizedPnlUsd` that `mapBudget` drops — but the sparkline
  needs `get_agent_performance` regardless, and that payload carries the
  figure and the curve together, self-consistent at one instant. The budget
  read stays untouched; the reasoning is in design.md.
- **The assistant's `read_agent_limits` MCP tool.** The loss shape is not
  added to its response — that widens an MCP contract this change does not
  own. Filed as `the-loss-shape-is-not-on-the-assistants-limits-read`.
- **The roster record surfaces.** `record.tsx`, `read_trading_record`, and
  the caveat sentence stay exactly as they are — #189 upheld the record's
  source and this change adds a second reading beside it, never a swap.
- **`drawdownUsd` top-level.** Duplicates a number already on screen (the
  drawdown gauge); deliberately not rendered twice.

## Impact

- `src/ports/agents.ts` — `readPerformance` on the port, result types.
- `src/infrastructure/battlegrid/agent-adapter.ts` + `agent-mapper.ts` —
  the call and the defensive map.
- `src/application/use-cases/read-loss-shape.query.ts` (new) — the reading,
  computed outside the page per W-D.
- `src/presentation/components/loss-shape.tsx` (new) — figure, sparkline,
  empty and unreadable arms.
- `app/(app)/agents/[id]/limits/page.tsx` — one more read in the existing
  `Promise.all`, one more section.
- Composition root — wiring the query.
- Tests: mapper, query, and rendering coverage for the four scenario arms.
- No BattleGrid write anywhere; no schema changes; no manifest lists any
  touched UI file (`/agents/[id]/limits` has no surface manifest — already
  tracked by `design_routes_uncovered`).
