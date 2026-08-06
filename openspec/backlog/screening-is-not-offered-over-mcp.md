---
id: screening-is-not-offered-over-mcp
title: The MCP server cannot ask whether an agent would take a coin
type: feature
status: in-progress
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: a-model-can-ask-whether-it-would-take-a-coin
capability: mcp-control
blocked_by: []
tags: [mcp, agent-understanding, screening]
---

# Screening is a web surface and not an MCP tool

`why-it-would-not-take-this-coin` built `ReadQualificationQuery` and
`/agents/[id]/qualification`. It did **not** add a tool to this product's own
MCP server, and that was a scope decision rather than a judgement about value.

## Why it is worth doing

This is the question a model tuning an agent would ask most often, and it is
the only one this product can answer without waiting for a cycle to run. Every
other read on the MCP surface is retrospective — what an agent decided, what it
blocked, what it closed. A model asked "why is my agent not trading" currently
has to infer forward from backward evidence.

It is also a clean fit for the surface's rule: `get_agent_coin_qualification` is
read-only by the platform's own annotation, spends no LLM call, and reaches no
Command. `read_qualification` would pass `mcp-read-only.test.ts` on the same
derivation every other read passes on.

## Why it was not done here

The change's delta spec is `agent-understanding`. Exposing a tool is
`mcp-control`, a different capability with its own requirements — the tool
table, the annotation derivation, `docs/MCP_SERVER.md`'s tool list, and the
subprocess probe. Widening the change to cover both would have put two
capabilities' worth of spec behind one proposal.

## First step when taken

Add `read_qualification` to `TOOLS` in `src/mcp/tools.ts` wired to
`readQualification`, taking `agentId` and an optional `coinTickers`. The
response must carry the **source** of the coins as prominently as the verdicts:
a model told "none of these qualify" without being told the product chose the
coins will report a stuck agent to its owner. Update the tool count and the
table in `docs/MCP_SERVER.md`, and extend `tests/live/mcp-server-probe.test.ts`.

Note the description must state no count of anything the platform owns —
`a-count-in-a-description-goes-stale` holds that as a test.
