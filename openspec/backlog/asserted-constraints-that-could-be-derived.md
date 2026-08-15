---
id: asserted-constraints-that-could-be-derived
title: Other asserted manifest claims may be mechanically checkable, and nothing re-derives them
type: question
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: app-access
github: "270"
blocked_by: []
tags: [design, surfaces, records-accuracy]
---

# Which other asserted manifest claims could be derived?

## What

`the-manifests-admit-their-client-code` (from #243) guards exactly one prose
claim — "no client JS" against `'use client'` in the manifest's own recorded
sources — because that one was measured false in fourteen of twenty-four
manifests. The same rot mechanism applies to every other *asserted* claim in
a manifest: the staleness check compares digests, not meaning, so re-pinning
carries prose forward unread.

Candidate claims that are grep-checkable against the same `source_digest`
lists, none of them measured yet:

- ARIA-role claims — "X carries role=alert", "Y carries role=status" appear
  in nearly every manifest's `notes`; a role rename or removal in the source
  would not fire anything.
- Focus-ring claims — "Focus ring is global (focus-visible, 2px)" is
  asserted in at least ten manifests and pins a token that lives in one CSS
  file.
- "Native `<details>` element", "native checkboxes" and similar
  element-of-record claims.

## Why it matters

Same argument as #243, one level up: a false constraint either causes a
design round to refuse a legitimate treatment or teaches the reader that
constraints are unreliable. #243's measurement (14/24 false on the one claim
checked) is the base-rate evidence that asserted prose rots.

## What would settle it

Measure before building: pick the ARIA-role claims (the most numerous), write
the same manifest-text-vs-source cross-check as a throwaway script, and count
how many are false today. Zero or near-zero → close this as
measured-and-holding, and the one guard #243 shipped stays the only one.
A #243-sized count → propose the next diagnostic, same shape.

## Notes

Filed as the Out of Scope residue of `the-manifests-admit-their-client-code`
(2026-08-15). Deliberately a question, not a build: the client-JS claim
earned its guard by being measured false first.
