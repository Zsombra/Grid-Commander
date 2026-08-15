# Proposal: The loss shape reaches the model

## Why

`how-it-got-here-is-readable` gave the operator page the loss shape;
the assistant's surface was deliberately left alone (backlog
`the-loss-shape-is-not-on-the-assistants-limits-read`, #272). A model asked
"how close is this agent to its stop, and how did it get there" can answer
the first half (`read_agent_limits`) and not the second. Parity is this
surface's own convention — `read_trade_story` shipped with its page.

## What Changes

- A sibling read tool, `read_loss_shape`, wrapping the existing
  `ReadLossShapeQuery` — the same 1:1 tool-to-use-case grain as every other
  tool on the surface. `read_agent_limits`' contract is untouched (the
  item's safer option, chosen for the reason it named: other models may
  already consume that response shape).
- The tool description states the span the way the page's copy does: budget
  baseline, not the trading record; an empty curve means no settlements,
  not missing data.
- The live full-surface probe's registry pin moves 25 → 26 and the probe
  calls the new tool.

## Capabilities

**New**: none
**Modified**: `mcp-control` — one ADDED requirement

## Out of Scope

- Widening `read_agent_limits` itself — rejected in the backlog item and
  here for the same reason: an additive-looking change to a consumed
  contract is still a contract change, and the sibling read costs nothing.
- Any new port or query — `ReadLossShapeQuery` exists and is wired.

## Impact

- `src/mcp/tools.ts` — one tool entry.
- `tests/mcp/server.test.ts` — the answer and the empty-vs-unreadable
  distinction over a real client.
- `tests/live/mcp-full-surface-probe.test.ts` — registry pin 25 → 26, probe
  call, no-agent skip entry.
- No production behavior outside the MCP surface changes.
