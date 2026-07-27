---
id: build-agent-strategy-creation
title: Agent creation + strategy creation (first product on the client)
type: feature
status: open
priority: p1
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: ""
blocked_by: [build-mcp-client]
tags: [battlegrid, product, manage-tier]
---

# Agent creation + strategy creation (first product on the client)

## What

The first user-facing product, headless. Create and fully configure an
Intelligence Agent — pick an approved LLM model, bind a strategy, set budget and
behavior characteristics — and author a strategy through the platform's
compile → review → apply flow (plus fork/adapt existing ones).

## Why it matters

It is the chosen first product. It exercises the client's `manage` tier for
real, and it is the groundwork every later trading tier builds on: you cannot
optimize or deploy agents you cannot yet create.

## Evidence

Scope confirmed `mcp:read` (no money): create_intelligence_agent,
update_intelligence_agent, compile_strategy_plan, apply_strategy_plan,
fork_strategy, list_approved_models, plus the 17-tool strategy-authoring
vocabulary. Only submit_agent_grid (entering a game) is mcp:wager and is NOT
part of this product. See docs/reference/battlegrid-mcp-tools.json.

## Notes

Blocked on build-mcp-client (needs the manage tier). These tools mutate the
account (slots, credits, rebind is destructive) even though they are read-scoped
— treat them as manage-tier writes, not free reads. Needs a /spec pass first to
capture the full agent + strategy characteristic surface the user asked for.
