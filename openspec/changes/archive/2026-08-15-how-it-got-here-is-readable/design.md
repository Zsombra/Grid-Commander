# Design: How it got here is readable

## Technical Approach

One new port read (`readPerformance`), one defensive mapper, one query, one
presentation component, one page edit. The domain does not import the MCP
client; the page imports no domain (both per the standing architecture).

## Decisions

### Decision: the figure and the curve come from one read
Chosen because `get_agent_performance` carries `realizedPnlUsd` and
`pnlCurveUsd` in one payload, so the figure and the shape are
self-consistent at one instant. Rejected: the backlog item's "cheap route"
(widen `mapBudget` to keep the top-level `realizedPnlUsd` it drops), because
the sparkline needs the performance read regardless, and a figure from the
budget read at t1 beside a curve from the performance read at t2 can
disagree with itself — the exact confusion the caption exists to prevent.
`mapBudget` stays byte-identical.

### Decision: the payload is read through a `performance` envelope with a bare fallback
The live-recorded fixture (`tests/support/performance-payloads.ts:102`)
shows the response under a `performance` key; the 2026-08-12 v18 read in
#107's item quotes it bare. `mapPerformance` accepts both, the same
tolerance `mapBudget` has for its `budget` envelope. Rejected: trusting
either shape alone — the envelope moved once already on the allocation
sibling.

### Decision: the curve keeps only finite numbers, and says so via count
`pnlCurveUsd` maps to a readonly array keeping only finite entries. The
rendered caption counts settlements from the kept points, so a junk entry
cannot silently stretch the shape. An empty array is a legitimate state
(v18: "no settlements yet, not missing data") and renders as a sentence,
never an error.

### Decision: hand-scaled inline SVG, second chart after `TradeChartSvg`
Same decisions inherited: no charting dependency, the component scales the
points itself, a sentence rather than an empty rectangle when there is
nothing drawable. A polyline over a baseline-zero reference is enough —
levels and markers are the trade story's needs, not this one's.

### Decision: placement directly below the gauges
The gauges answer "how close"; the loss shape answers "how did it get
here"; `RiskReadingPanel` answers "was the ceiling sensible" — in that
order. The section fails independently (its own arm, like Spend), because
the budget and performance reads fail independently and one must not hide
the other.

## File Changes

- `src/ports/agents.ts` (modified) — `PerformanceReading`,
  `PerformanceResult`, `readPerformance` on `AgentsPort`
- `src/infrastructure/battlegrid/agent-adapter.ts` (modified) —
  `TOOLS.performance`, `readPerformance`
- `src/infrastructure/battlegrid/agent-mapper.ts` (modified) —
  `mapPerformance`
- `src/application/use-cases/read-loss-shape.query.ts` (new) —
  `ReadLossShapeQuery`
- `src/presentation/components/loss-shape.tsx` (new) — figure, sparkline,
  empty and unreadable arms
- `app/(app)/agents/[id]/limits/page.tsx` (modified) — fourth read in the
  fan-out, one section
- composition root (modified) — wire the query
- tests (new/modified) — mapper, query, rendering arms
