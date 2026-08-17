---
id: asserted-constraints-that-could-be-derived
title: Other asserted manifest claims may be mechanically checkable, and nothing re-derives them
type: question
status: done
priority: p3
created: 2026-08-15
updated: 2026-08-16
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


---

## Measured 2026-08-16 — zero false, at the granularity that measured #243

The cross-check this item asked for was written and run over all 29 manifests.
For each manifest, every `role=` mention in its prose (`current_implementation`,
`constraints`, `notes`) was scored against the roles actually carried by the
files that manifest's own `source_digest` pins — the same evidence, the same
granularity and the same absent-file rule as the client-JS measurement.

```
manifests carrying a role claim  28 of 29
role claims found               191
  role=alert                    144  (4 of them negative)
  role=status                    47
  in current_implementation      93
  in constraints                 56
  in notes                       42
pinned sources unreadable         0
FALSE                             0
```

**Zero.** #243's claim was false in fourteen of twenty; this one is false in
none of 191. So the base rate that argued for a guard does not carry across to
the next claim, and the answer to this item is the one it wrote down in
advance: **measured-and-holding — the guard #243 shipped stays the only one.**

### The zero is not a blind pass

Two plants, because a check that has never caught anything says nothing:

- **A claimed role no source carries.** `role=log` added to `audit-log`'s
  accessibility block fires, naming the manifest and the role.
- **The rot mechanism this item actually named** — "a role rename or removal in
  the source would not fire anything". Renaming `role="status"` to
  `role="note"` in `app/(app)/strategies/[id]/restore/page.tsx` turns **five**
  of `strategy-restore-confirm`'s claims false in one edit.

Both restored; `git status` clean afterwards.

### What a guard of this shape would get wrong, if anyone builds one later

Four claims flagged, and **all four are the check's false positives, not false
claims**. Every one is a *component-scoped contrastive*:

```
agent-detail             components.10.constraints.2   "role=status, never role=alert."
agent-detail             accessibility.notes           "…are role=status, not role=alert"
agent-roster             components.5.constraints.2    "role=status, never role=alert."
strategy-restore-confirm components.2.constraints.0    "role=status, not role=alert, must survive"
```

The manifest asserts a role is *absent from one element*, while the page
legitimately carries it on others. Verified in source: `radar-pause.tsx:41,53`
and the feasibility caveats are `role="status"`, and
`restore/page.tsx:95` is `role="status"` — the `role="alert"` in those
manifests' sources belongs to different elements entirely.

A manifest pins files, not elements, so **manifest granularity cannot resolve a
negative claim** and a guard built at this granularity would be noisy on
exactly the four most carefully-reasoned accessibility notes in the design
record. That is the finding to keep from this measurement.

The same limit caps what the zero proves in the other direction: a positive
claim passes when *any* pinned source carries the role, so a role that moved
from one element to another within a surface would not fire. What is measured
here is what #243 measured — a claim naming a role the surface no longer
carries anywhere — and by that measure the count is zero.

### Not measured

The item's other two candidate families — focus-ring claims ("focus-visible,
2px", asserted in at least ten manifests and pinning a token in one CSS file)
and element-of-record claims ("native `<details>`", "native checkboxes"). The
ARIA family was picked because the item named it the most numerous, and it is:
191 mentions against a handful for the others. Filed as
[[the-focus-ring-and-element-claims-are-unmeasured]] rather than left implied.
