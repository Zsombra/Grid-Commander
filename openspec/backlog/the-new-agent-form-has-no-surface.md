---
id: the-new-agent-form-has-no-surface
title: The new-agent form is invisible to the design layer — no surface manifest covers it
type: debt
status: done
priority: p3
created: 2026-08-14
updated: 2026-08-15
change: ""
capability: agent-authoring
github: "250"
blocked_by: []
tags: [design-layer, ui-surveyor, coverage]
---

# The new-agent form has no surface manifest

## What

`openspec/design/surfaces/` holds 24 manifests and none references
`src/presentation/components/agent-form.tsx` or `app/(app)/agents/new/page.tsx`
(grep for `agent-form` across the surfaces returns nothing). The create form —
the surface that binds money limits to a new agent — has never been surveyed.

## Why it matters

Two costs, both quiet:

- The design agent cannot design what it cannot see; the form's states
  (carried problem, at-capacity, no-catalog, empty strategy list, prefilled
  bounce) are exactly the kind of state inventory a surface manifest exists to
  carry.
- Staleness detection is blind here. `the-create-action-reads-every-arm`
  (2026-08-14) changed this form's rendering — prefill from carried values,
  the `issues` prop removed — and `validate --all` flagged three *other*
  surfaces on comment-only diffs while the genuinely changed component tripped
  nothing, because no manifest pins it.

## Evidence

- `grep -r "agent-form" openspec/design/surfaces/` — no matches (2026-08-14).
- Contrast: the same session's comment-only edit to `money-limits.tsx` flagged
  `agent-edit` and `agent-reactivate-confirm` stale — the check works where a
  manifest exists.

## What would settle it

One `/surface` run over the new-agent page and form, producing the manifest
with the states named above. No design round required — the point is coverage,
not a restyle.

## Closed 2026-08-15 — surveyed as `agent-new`

`openspec/design/surfaces/agent-new.json`, pinned at `042266a` over nine
sources (the page, its actions module, the form, CarriedProblem,
MoneyLimits, PerformButton, control, WhyNotLoaded, require-connection).
Six components; the states this item named are all carried — the four gates
(at-capacity, catalog-unreadable, strategies-unreadable, strategies-empty),
the carried problem mounting on every branch, and the prefilled bounce —
plus the ones the code held that the item did not name (no-presets-declared,
the zero-unbounded warning, the approval-mode note). The import cross-check
was quiet on the first pass. Status `functional`; the expected
`design_orphan_surface` info row is the system noting no tickets exist yet,
which is coverage doing its job — exactly what this item asked for.
Staleness detection now sees the create form: the blind spot the
2026-08-14 evidence demonstrated (a real change to this form tripping
nothing while comment-only edits elsewhere fired) is closed.
