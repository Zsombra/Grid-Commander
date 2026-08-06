---
id: preset-custom-in-the-preset-branch-is-unestablished
title: Establish what {kind PRESET, preset CUSTOM} does before anything offers it
type: question
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-authoring
blocked_by: []
tags: [battlegrid, agent-authoring, catalog]
---

# Establish what `{kind: "PRESET", preset: "CUSTOM"}` does before anything offers it

## What

`create_intelligence_agent` declares eleven values for `brain.preset`. The
eleventh is `CUSTOM`, which is also one of the two `brain.kind` discriminators —
so the same name appears as a choice inside one branch of the union and as the
name of the other branch.

What the platform does with `{kind: "PRESET", preset: "CUSTOM"}` is not
established. Nobody has sent it, no description mentions it, and no other read
answers it.

## Why it matters

Small, and worth keeping honest. `brain-presets-are-read-not-remembered` made
the offered presets the declared enum minus every value that also names a
branch, so this value is not offered and is not explained — the product neither
guesses nor pretends. That is the right resting state, but it is a rule about
the *declaration*, not an answer about the platform, and it will quietly exclude
a genuine preset if BattleGrid ever names one after a branch.

## Evidence

- `docs/battlegrid-mcp-capabilities.json` →
  `create_intelligence_agent.inputSchema.properties.brain.anyOf[0].properties.preset.enum`
  — eleven values; the sibling `description` names ten in prose.
- `docs/battlegrid-mcp-surface.json` →
  `input_constants["create_intelligence_agent"]["brain.preset"]` — the same
  eleven, recorded 2026-08-06 against server v11.0.0.
- `src/infrastructure/battlegrid/agent-adapter.ts` → `brainPresets()`, where the
  exclusion is derived.

## Notes

Establishing it means creating an agent with it on a throwaway account and
reading back what `get_intelligence_agent` says the brain is — a write, so it
belongs in a live probe with the operator's agreement, not in the suite.

Related: `brain-presets-are-hardcoded-and-short-one` (the parent item),
`brain-with-no-model` (the other open question about the brain union).
