---
id: the-focus-ring-and-element-claims-are-unmeasured
title: The focus-ring and element-of-record manifest claims were never measured, only the ARIA ones
type: question
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: app-access
github: "318"
blocked_by: []
tags: [design, surfaces, records-accuracy]
---

# Two of the three candidate claim families are still unmeasured

## What

[[asserted-constraints-that-could-be-derived]] (#270) named three families of
asserted manifest claim that are mechanically checkable against the same
`source_digest` sources, and asked for the most numerous one to be measured
first. That was ARIA roles, and it came back **0 false out of 191** — closed
as measured-and-holding.

The other two were not measured:

- **Focus-ring claims.** "Focus ring is global (focus-visible, 2px)" is
  asserted in at least ten manifests and pins a token that lives in one CSS
  file. A manifest-granularity check is a poor fit here — the claim is about a
  global, so every manifest's answer comes from the same place, and the real
  question is whether that one place still says 2px.
- **Element-of-record claims.** "Native `<details>` element", "native
  checkboxes" and similar. Grep-checkable against the pinned sources in the
  same way the client-JS claim was.

## Why it matters

p3, and weaker than #270 was. #270 had #243's 14-of-20 base rate arguing that
asserted prose rots; this item has #270's zero arguing the opposite. The
honest state is that one family was measured and held, and generalising from
one family to all three is the same over-reach #270 was filed to avoid making
from #243.

The reason to keep it open rather than close it with #270: the ARIA family was
picked *because it was numerous*, and a family can hold at 191 claims while a
ten-claim family rots — the count that made ARIA worth measuring first is not
evidence about the others.

## Evidence

The three families are listed in
[[asserted-constraints-that-could-be-derived]]. The measurement that closed
the first is recorded there in full, including the granularity limit that
would make a guard of that shape noisy on component-scoped negative claims.

## Notes

Cheap to answer — the #270 script is throwaway but its shape is written down
in that item, and the focus-ring family needs a different one (one global, one
CSS file) rather than the same one pointed at a different word.

Whoever picks this up should read #270's "What a guard of this shape would get
wrong" section first: at manifest granularity a claim about *one element* is
not resolvable, and both remaining families contain such claims.
