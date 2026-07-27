---
id: wager-safety-envelope
title: Safety envelope for all mcp:wager (real-money) tools
type: risk
status: open
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: ""
blocked_by: [build-mcp-client]
tags: [battlegrid, safety, mcp]
---

# Safety envelope for all mcp:wager (real-money) tools

## What

Before ANY of the 16 `mcp:wager` tools is called from our code, the safety
architecture in the review §6 must be in place: two-client split, per-wager
spec requirement + confirmation, platform-limit invariants read from
get_account_state / get_agent_budget, and a one-action kill switch
(halt_intelligence_agent, close_agent_position).

## Why it matters

This key moves real money — live account, $78 balance, wager enabled, 10
signed wagers and $500 volume per day. A bug in a wager path is a financial
loss, not a failed test. This is the single highest-risk area of the whole
project and must be a deliberate `full`-track change, never incidental.

## Evidence

`_IDEA/battlegrid-mcp-architecture.md` §6.
`docs/reference/battlegrid-mcp-tools.json` — the 16 tools with `"scope":
"mcp:wager"`, 4 also `"destructive": true`.

## Notes

Gate: no wager tool ships until Tiers 0–3 are solid. Treat this item as a
standing precondition on every future change that touches a `‡` tool.
