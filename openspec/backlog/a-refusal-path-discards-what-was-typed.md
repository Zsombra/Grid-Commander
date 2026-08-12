---
id: a-refusal-path-discards-what-was-typed
title: Refusal paths re-render the form empty — everything typed is retyped
type: debt
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: agent-authoring
github: "162"
blocked_by: []
tags: [ui, forms, refusal]
---

# Refusal paths re-render the form empty

## What

Two composing surfaces discard the operator's typed values when the platform
(or validation) refuses, re-rendering the form at the entity's *current* state:

1. **Agent edit** — when `describeEdit` refuses, when a preset cannot be
   resolved, and when `applyEdit` bounces back with `?problem=`, the page
   re-renders `AgentEditForm` with the agent's current values as defaults.
   Everything the operator changed is gone and must be retyped.
2. **Rule editor** — the params-not-numeric branch's "Compose it again" link
   points at the bare form; allocation, Required, and every param typed are
   discarded. Its *refusal* path, by contrast, preserves the choice — the two
   paths disagree about whether typing survives a bounce.

## Why it matters

p3: nothing is lost on the platform — only the operator's unsaved typing. But
a refusal usually names what to fix, and the fix currently means re-entering
everything rather than correcting one field. The product's own pattern
elsewhere (deploy's refused describe re-runs with the chosen coin/timeframe)
shows typing surviving a bounce is the house expectation.

## Evidence

- `app/(app)/agents/[id]/edit/page.tsx:140-150` (refused describe), `:179-188`
  (preset unresolvable), `:285` (`?problem=` bounce) — all re-render from
  current agent values.
- `app/(app)/strategies/[id]/rules/[signalId]/page.tsx` — params-not-numeric
  branch links to the bare form; found by the 2026-08-12 ceremony survey
  (surfaces `agent-edit`, `strategy-rule-editor`).

## Notes

Both pages are server components with no client JS; preserving typed values
means carrying them in the bounce redirect / GET params, which the rule
editor's own refusal path already demonstrates. Found by the ui-surveyor pass
for backlog #157; the surface manifests record the states involved.
