---
id: two-agent-owned-fields-no-tool-can-write
title: arenaChallengeEnabled and overlayText are proposable, and no tool on the surface can write or even read them
type: risk
status: done
priority: p3
created: 2026-08-08
updated: 2026-08-11
change: "dead-agent-fields-retired"
capability: mcp-control
github: "113"
blocked_by: []
tags: [battlegrid, platform-drift, proposals, field-ownership, observed-shape]
---

# Two agent-owned fields no tool can write — or read

## What

The v13.0.0 re-record (2026-08-08) settled it at every level:

- `create_intelligence_agent` optional params: `idempotencyKey, tradingConfig`
  — **no `arenaChallengeEnabled`** (the v9 reference still declared it; it
  was dropped in the v9→v11 window and the stale reference hid that).
- `update_intelligence_agent` optional params: `behavior, brainPreset,
  displayName, modelId, tradingConfig` — no arena, no overlay.
- **No tool on the 110-tool surface takes an overlay param at all.**
- The observed agent payloads (`get_intelligence_agent`,
  `list_intelligence_agents`) carry **neither field** anymore.

Yet the product still models both:

- `AGENT_OWNED` (`src/domain/agent/field-ownership.ts`) lists
  `arenaChallengeEnabled` and `overlayText`, and `open-proposal.query.ts`
  builds the proposable-field vocabulary from that table — so a model can
  propose a change **that no apply step could ever carry to the platform**,
  and `propose_agent_change`'s description names both fields.
- `Agent.arenaChallengeEnabled` now maps `undefined === true` → **false on
  every agent**, and `Agent.overlayText` maps to **null on every agent** —
  constants wearing the costume of facts.
- `AgentsPort.createAgent` still accepts `arenaChallengeEnabled?` and the
  adapter forwards it when set (currently unreachable: no form or MCP tool
  supplies it).

## Why it matters

A proposal against either field would pass review and then fail (or be
silently ignored — unknown, writes are key-gated) at apply time. And the
domain carries two fields whose values are no longer the platform's answer
but the mapper's default — the exact "absence rendered as a value" shape
this codebase refuses everywhere else. Low urgency only because nothing
renders either field and no form offers them.

## Fix when taken

Remove both from `AGENT_OWNED` (and the `propose_agent_change`
description), drop `arenaChallengeEnabled` from the create port param, and
retire both fields from `Agent` — or, if the platform's UI still shows
arena participation somewhere, find where that state lives now before
deciding. Behavior change → its own change with an mcp-control delta (the
propose requirement names agent-owned fields).

## Evidence

- `docs/battlegrid-mcp-surface.json` @ v13.0.0 (2026-08-08):
  `input_optional` lists above; no `overlay` match in any tool's schema;
  observed agent payloads carry neither key.
- v9-generated reference (superseded the same day) still showed
  `arenaChallengeEnabled` on create and update — the drop happened
  v9→v11 and only became visible when the reference was regenerated.
