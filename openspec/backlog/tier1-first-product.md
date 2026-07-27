---
id: tier1-first-product
title: Choose and build the first Tier-1 read-only product
type: feature
status: wontfix
priority: p2
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: ""
blocked_by: [build-mcp-client]
tags: [battlegrid, product]
---

# Choose and build the first Tier-1 read-only product

## What

Pick one pure-read product to build first on the MCP client: Regime Radar,
performance tracker, or the market/signal dashboard. All three are independently
useful and carry no money risk.

## Why it matters

The first real user-facing surface. Read-only means we can move fast and learn
the platform's data shapes before committing to the autonomous-trading tiers.

## Evidence

`_IDEA/battlegrid-mcp-architecture.md` §5, Tier 1.

## Notes

Blocked on `build-mcp-client`. The choice is a product call for the user —
flagged as the open scoping question in the architecture review.


## Resolution (2026-07-27)

Superseded. The user chose agent + strategy creation as the first product on
the client, not a read-only dashboard — tracked as `build-agent-strategy-creation`.
Regime Radar / performance tracker / market dashboard remain valid later Tier-1
read products but are no longer 'the first one'.
