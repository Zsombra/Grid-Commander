---
id: an-assistant-over-the-use-cases
title: The assistant returns — conversational control over the use-case registry
type: feature
status: open
priority: p2
created: 2026-08-01
updated: 2026-08-01
change: ""
capability: ""
blocked_by: []
tags: [assistant, architecture, vision]
---

# The assistant returns — conversational control over the use-case registry

## The vision (operator, 2026-08-01)

Talk to the product in natural language and it creates/configures agents,
builds strategies through the strategy maker, deploys to radar, and reports
performance and expected value — spanning every capability.

## What the exploration established

- **`3d54fab` was not "no assistant ever".** It removed dead code: no
  `ANTHROPIC_API_KEY` existed anywhere, so the surface shipped announcing its
  own absence. The `app-access` spec it left behind names the reversal
  procedure: a second outbound destination "must be a decision someone makes
  on purpose". Full track, spec amendment, `one-destination` guard rewired to
  two deliberate hosts.
- **The tool surface already exists.** `src/composition.ts` returns ~30
  use-cases with typed inputs, honest refusals, audit on every write, and the
  describe→confirm→perform ceremony. The assistant calls **use-cases, never
  MCP tools** — every guard applies for free, and "a request MUST NOT
  construct its own route to BattleGrid" holds.
- **The safety invariant**: the assistant may call any read and any
  `describe*` (those only mint tokens and state consequences). No
  token-spending command enters its tool set. Describes render as
  confirmation cards; the human click posts to the same action the manual
  pages use. Structurally cannot spend, not instructed-not-to.

## Options weighed

- **A (destination): in-app assistant** — chat surface, Claude API tool-use
  over the registry, confirmation cards. Costs: second outbound host
  (deliberate), key + per-conversation cost, streaming UI, whose-key-pays for
  multi-tenant.
- **B (optional waypoint): Grid-Commander as an MCP server** — expose the
  use-cases as MCP tools, talk to it from any Claude surface. No second
  outbound host, no LLM key held, no chat UI; clunkier confirmation handoff.
  Working sessions against the repo are the existence proof.
- **C (rejected): autonomous writes** — violates the product's founding
  stance and the platform's own gates.

## Sequencing — blocked by model gaps, in order

1. Strategy-maker insides (`strategy-metric-editor`,
   `strategy-draft-preview`, signal vocabulary) — the operator names this
   the biggest user↔application gap. Note: no `create_strategy` tool
   exists; authorship is fork→reshape.
2. Reporting/EV (`trading-telemetry-is-unread`,
   `entry-decisions-have-a-read-side`) — EV is at risk on the platform side:
   `get_agent_performance` has never returned a populated figure.
3. Explorer (`public-explorer-is-unmodelled`) — severable.
4. This item: full-track change amending `app-access`, chat surface,
   tool-runner, confirmation cards, one audit line per assistant action.

## Open decisions before taking

- Whose Anthropic key, and what the cost model is for non-owner users.
- A vs B first (B could ship far earlier as a feel-the-product prototype).
