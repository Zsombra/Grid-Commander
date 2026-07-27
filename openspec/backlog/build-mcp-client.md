---
id: build-mcp-client
title: Typed read-only BattleGrid MCP client (Tier 0 foundation)
type: feature
status: open
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: ""
blocked_by: []
tags: [battlegrid, mcp, foundation]
---

# Typed read-only BattleGrid MCP client (Tier 0 foundation)

## What

A thin, typed client over `https://mcp.battlegrid.trade/mcp`: connect, Bearer
auth from `BG_API_KEY`, JSON-RPC + streamable-HTTP handling, and all 110 tools
as typed calls. The `mcp:read` / `mcp:wager` scope boundary is encoded in the
type system — the read client physically cannot construct one of the 16 wager
calls.

## Why it matters

Everything else in the product sits on this. Building it read-only first means
the entire observation and simulation surface (Tiers 1–3) ships with zero
money risk before any `mcp:wager` code exists. It is also a clean first
`standard`-track change on a proven-but-young harness.

## Evidence

`_IDEA/battlegrid-mcp-architecture.md` §2, §6.
`docs/reference/battlegrid-mcp-tools.json` — the full 110-tool inventory with
per-tool scope.

## Notes

Two-client split is the core safety decision (§6). The wager client is a
separate, later, `full`-track change and is NOT part of this item.
Stack undecided — that is the `/idea` / `/solutions` conversation.
