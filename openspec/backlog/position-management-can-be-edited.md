---
id: position-management-can-be-edited
title: Offer the fourteen position-management fields on the edit page, with drift said plainly
type: feature
status: open
priority: p3
created: 2026-07-31
updated: 2026-07-31
change: ""
capability: agent-authoring
blocked_by: []
tags: [battlegrid, ui, agent-edit-form]
---

# Offer the fourteen position-management fields on the edit page, with drift said plainly

## What

The create path offers the five catalog presets and sends their values
(`preset-configs-are-discarded`, shipped 2026-07-31). The edit page does
not touch position management at all. Two pieces:

1. **Editing.** `update_intelligence_agent` accepts
   `tradingConfig.positionManagement` (in the closed 20-key set), so the
   fourteen fields are writable through the existing describe→confirm→edit
   flow. A preset select alone cannot be the surface — a preset is a label
   beside fourteen independent values (`a-preset-does-not-constrain-its-config`,
   answered live).
2. **Drift display.** An agent may name `WALTHER` and carry values that are
   not WALTHER's. Showing the label alone would be a lie told confidently;
   whatever renders here compares the agent's values against the catalog's
   preset config and says when they diverge.

## Why it matters

Position management is how an agent exits — trailing, break-even, time
decay. Today it can be *set* at create and never *seen or changed* again in
this product.

## Notes

- The edit flow's digest-binding already covers new fields: the intent is
  digested into the confirmation target, so nothing new is needed there.
- The 23-vs-20 projection (`applyEdit`) already handles the read/write
  asymmetry; `positionManagement` is on the writable side.
- Filed from the close of `a-preset-does-not-constrain-its-config`.
