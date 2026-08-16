---
id: a-surface-is-staled-by-what-it-imports-not-what-it-renders
title: A surface is pinned to files it imports but never renders, so it goes stale for components it does not show
type: debt
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: app-access
github: "331"
blocked_by: []
tags: [design, surfaces, staleness, granularity]
---

# A surface is staled by what it imports, not what it renders

## What

`agent-reactivate-confirm` pins `src/presentation/components/money-limits.tsx`
in its `source_files` and `source_digest`. **Nothing on that surface renders it.**
Its nine components are `reactivate-page`, `problem`, `reactivate-prompt`,
`binding-summary`, `atCapacity`, `button-primary`, `button-secondary`,
`why-not-loaded` and `not-connected` — no `money-limits` among them, correctly,
because `ReactivatePrompt` does not render `MoneyLimits`.

The pin exists because the page imports `ReactivatePrompt` from
`agent-edit.js`, and that **module** also imports `MoneyLimits` for a different
export. The reach is real at module granularity and absent at render
granularity.

## Why it matters (p3)

Every change to `money-limits.tsx` stales a surface that cannot display it. On
2026-08-16 the one-line copy fix in `the-cap-says-what-it-meters` staled three
surfaces; two of them (`agent-new`, `agent-edit`) genuinely render the
component and one did not.

The cost is not the warning. It is that a re-survey is then owed for a surface
whose manifest is not actually wrong, which trains the reader to re-pin without
re-reading — and re-pinning without re-reading is precisely the failure the
digest exists to prevent.

## Measured, not assumed

Dropping the pin was tried on 2026-08-16 and the tool refuses it:

```
WARNING design_surface_incomplete_sources: agent-reactivate-confirm:
  1 UI file(s) imported by this surface are not in source_files
  — src/presentation/components/money-limits.tsx
```

So the two checks disagree by construction: `incomplete_sources` derives from
the import graph and demands the file, `surface_stale` then fires on it. There
is no manifest that satisfies both without the false staleness. The surveyor
skill's own escape hatch — *"leave a file out only when it has no bearing on
what renders"* — is unavailable, because the validator overrides that call.

## What would settle it

1. **Narrow the cross-check to what is rendered.** Hard: it would need to
   resolve which exports a surface actually reaches, not which modules.
2. **Let a manifest declare a deliberate exclusion** — `source_excludes` with a
   reason — so the surveyor's documented judgement survives the validator.
   Cheapest, and it keeps the decision visible rather than silent.
3. **Split `agent-edit.tsx`** so `ReactivatePrompt` does not share a module with
   `MoneyLimits`. Fixes this instance, not the shape, and moves production code
   to satisfy a records check.

(2) is the one that generalises. Related: [[the-focus-ring-and-element-claims-are-unmeasured]]
(#318) records the same granularity mismatch from the other direction — a claim
about one element is not resolvable at manifest granularity.
