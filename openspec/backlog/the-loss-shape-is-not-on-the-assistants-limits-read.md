---
id: the-loss-shape-is-not-on-the-assistants-limits-read
title: read_agent_limits answers the gauges but not how the loss arrived
type: feature
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: mcp-control
github: "272"
blocked_by: []
tags: [mcp-control, parity, assistant]
---

# read_agent_limits answers the gauges but not how the loss arrived

## What

`how-it-got-here-is-readable` gave the operator surface
(`/agents/[id]/limits`) the loss shape: realized P&L since the budget
baseline plus the per-settlement curve, from `get_agent_performance` via
`AgentsPort.readPerformance` and `ReadLossShapeQuery`. The product's own
MCP surface was deliberately not widened: `read_agent_limits`
(`src/mcp/tools.ts`) still answers the gauges, warnings, and halt state
only. A model asked "how close is this agent to its stop, and how did it
get there" can answer the first half and not the second.

## Why it matters

Parity is the MCP surface's own convention — `read_trade_story` was added
the same session its operator page was built. But widening a response is
an MCP contract change on a tool other sessions' models may already
consume, so it was scoped out rather than slipped in.

## Evidence

- `src/mcp/tools.ts` — `read_agent_limits`, response unchanged by the
  change above
- `src/application/use-cases/read-loss-shape.query.ts` — the query is
  already built; exposure is wiring plus contract wording
- `openspec/changes/archive/2026-08-15-how-it-got-here-is-readable/` (once
  archived) — the Out of Scope entry this item is the record of

## What would settle it

A small change (likely lite) that either widens `read_agent_limits` with a
`lossShape` block or adds a sibling read, states the span in the tool
description the way the page states it in copy (baseline, never the
trading record), and updates the tool-contract tests.

## Notes

Filed 2026-08-15 as the Out of Scope residue of
`how-it-got-here-is-readable` (#202's change). Priority is honest: nothing
is wrong, the assistant simply answers less than the page does.
