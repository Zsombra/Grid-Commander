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

---

# Narrowed 2026-08-06 — the read-back flattens the union, so the probe is harder than it looks

Read all five agents on account 1, and the one on account 2, without any write.

```
CONTRARIAN       brainPreset=CUSTOM  modelId=x-ai/grok-4.3
Fade Master II   brainPreset=CUSTOM  modelId=anthropic/claude-opus-4.6
VELOCITY         brainPreset=CUSTOM  modelId=deepseek/deepseek-v4-pro
Fade Master      brainPreset=CUSTOM  modelId=x-ai/grok-4.3
CONFLUENCE       brainPreset=CUSTOM  modelId=z-ai/glm-5.2
THE .0 (acct 2)  brainPreset=CUSTOM  modelDisplayName="GLM-5.2"
```

Every agent on both accounts reads back `brainPreset: "CUSTOM"`, each with a
real, distinct `modelId`. These are plainly `{kind: "CUSTOM", modelId: …}`
agents — the *other* branch of the union.

**So the response payload has one `brainPreset` field where the request has a
two-branch union, and when the kind is `CUSTOM` that field carries the
discriminator rather than a preset.**

## What that does to the item's proposed probe

The item says: create an agent with `{kind: "PRESET", preset: "CUSTOM"}` and
read back what `get_intelligence_agent` says the brain is. That read will say
`brainPreset: "CUSTOM"` — which is **exactly what it already says for every
existing agent**, none of which was created that way.

So the field cannot distinguish the two, and the probe as written would not
answer the question. What would answer it is `modelId`: if the platform accepts
`{kind: PRESET, preset: CUSTOM}` at all, whatever model it resolves to is the
meaning of the value. Three outcomes, all informative:

- **refused** — the eleventh enum member is not a real choice, and the current
  exclusion rule is right for a second reason
- **accepted, `modelId` set to something** — that model *is* what preset
  `CUSTOM` means
- **accepted, `modelId` null or absent** — a brain with no model, which is
  already an open question (`brain-with-no-model`) and would join up with it

## And a consequence beyond this item

`brainPreset: "CUSTOM"` is ambiguous on read **today**, for reasons that have
nothing to do with the eleventh enum member. A surface rendering an agent's
brain cannot tell "no preset, a named model" from "the preset called CUSTOM" —
it can only ever say what the field says. The product's agent page shows
`CUSTOM`, which is the honest thing to show, and `modelDisplayName` (observed
populated: `"GLM-5.2"`) is the field that would make it legible. See
`the-payload-carries-more-than-is-read`.

## Still not done, and still needs a write

Deliberately not run. It creates a persistent agent on a live account with five
FULL_EXECUTION agents on it and no readable slot cap — `get_account_capacity`
does not exist on this server — so the cost of taking a slot cannot be measured
before taking it. That is a poor trade for a p3, and it is the operator's call
rather than a probe's.
