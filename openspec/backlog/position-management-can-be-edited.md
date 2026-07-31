---
id: position-management-can-be-edited
title: Offer the fourteen position-management fields on the edit page, with drift said plainly
type: feature
status: done
priority: p3
created: 2026-07-31
updated: 2026-07-31
change: position-management-is-editable
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

## Closed 2026-07-31 — `position-management-is-editable`

Both pieces shipped through the existing describe→confirm→edit flow:

- **Editing**: the edit page's Position management section — a preset select
  (catalog presets offered only when their config arrived; choosing one
  sends the platform's own fourteen values wholesale), CUSTOM (the fourteen
  fields as edited), or no choice (nothing sent — the object is replaced
  wholesale, so there is no field-at-a-time). One typed coercion
  (`positionFromTransport`, field kinds from the domain) serves both the
  review and the apply, so the value digest the confirmation binds survives
  the round-trip — the DL-5 lesson applied before it could bite.
- **Drift**: `positionDrift` (domain) compares the agent's values against
  the catalog's config for the label it names; the section says "matches"
  or names exactly the differing fields. CUSTOM and an unanswerable catalog
  draw no claim.
- The consequence names what position management becomes; the AL-1 guard
  caught a preset name in a comment on the way (vocabulary stays read, not
  written down).

Live proof deferred with the platform outage; the command path is the same
one the limits edit proved live, and the payload stays inside the shapes
payload-conformance holds.
