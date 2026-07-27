---
id: mcp-client-test-gaps
title: Two untested paths in the MCP client (rejected key, tool-error surfacing)
type: debt
status: open
priority: p3
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: mcp-connection
blocked_by: []
tags: [battlegrid, testing]
---

# Two untested paths in the MCP client (rejected key, tool-error surfacing)

## What

Two mcp-connection behaviors are implemented but not covered by an executing
test:
- Rejected key → AuthenticationError (transport.ts). Not tested live because
  sending a bad key to a real money account for a test is not worth it.
- A tool returning an error result → surfaced, not masked (client.ts passes the
  structured result through). No test exercises an error-returning tool.

## Why it matters

Both are real behaviors the spec requires; both currently rest on code
inspection, not a green assertion. Low risk (the logic is simple and visible)
but it is honest debt, not covered.

## Evidence

`_IDEA/battlegrid-mcp-architecture.md`; delta specs at
`openspec/changes/archive/*-build-mcp-client/specs/mcp-connection/spec.md`.
Self-check during execution flagged both as gaps.

## Also untested (code-evident, lower priority)

- capability-tiers "wager-capable client requires explicit construction" — enforced
  by createWagerClient requiring WagerAuthorization (client.ts), no direct test.
- capability-tiers "observe access exposes only observe tools" — availableTools()
  filters by tier (client.ts), no direct assertion.

Both fall out of the same mock-transport fixture as the two above.

## Notes

Cleanest fix: a tiny mock transport (an object with connect/callTool) injected
into the client, so both paths can be asserted offline without a live bad key.
That mock also unlocks client-level tests that currently only run live.
