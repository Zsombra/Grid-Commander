---
id: the-focus-ring-and-element-claims-are-unmeasured
title: The focus-ring and element-of-record manifest claims were never measured, only the ARIA ones
type: question
status: done
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

## Both families measured 2026-08-16 — one holds, one does not

The item asks for the two unmeasured families. Both were measured. **They do not
agree, which is the answer #270's zero could not have predicted.**

### Element-of-record claims — HOLD

Claims found across the manifests: *"native `<details>` element"*, *"native
checkboxes inside their own inline labels"*, *"native checkboxes inside nested
fieldsets"*, *"native checkbox with NO className at all"*, *"native date input
wearing CONTROL"*.

Against the sources:

```
<details>             2 sites
type="checkbox"       4 sites
role="checkbox"       0 sites   <- no re-implementation anywhere
```

Every claim of this family is satisfied, and the negative half — that no custom
checkbox exists — holds too. `CHECKBOX` in `control.ts` is `accent-accent-default`
and nothing else, which is the claim rendered as code.

### Focus-ring claims — **FAIL**

There are two distinct assertions, and the more numerous one is false.

| assertion | manifests | verdict |
|---|---|---|
| *"Focus ring is global (focus-visible, 2px)"* | 7 | misleading |
| *"Focus ring comes from the one global rule in globals.css — **do not add a per-element ring**"* | **12** | **false** |

The global rule exists and is what it says (`app/globals.css:19`):

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--gc-focus);
  outline-offset: 2px;
}
```

**And a per-element ring exists beside it**, in the shared control constant
(`src/presentation/components/control.ts:26`), used in **71 places**:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus
```

`outline-none` switches the global rule **off** for every text input, select and
textarea in the product, and draws a Tailwind ring instead. The two are not the
same treatment: the global is an outline offset 2px from the element, the
override is a ring with no offset. So a focused text input and a focused link do
not currently wear the same focus indicator, which is the thing twelve manifests
say cannot happen.

Filed as [[the-focus-ring-is-not-one-rule]] (#338) — it is a design-system defect, not
a manifest-prose defect, and fixing it changes what 71 controls look like, which
is `/design`'s call and not a passing edit.

### What this settles for the item

**The generalisation this item was kept open to avoid making is now measured, and
it was right to avoid it.** #270's ARIA family came back 0-false-of-191; this
sweep finds one family clean and one with a 12-claim assertion contradicted by a
constant used 71 times. A family can indeed hold at 191 while a ten-claim family
rots — that hypothesis is no longer a caution, it is an observation.

**The granularity limit #270 warned about did not bite here.** Both families
turned out to be checkable at file granularity: the focus-ring claim is about one
global and resolves against two files, and the element-of-record claims resolve
by grepping for the element itself. Neither needed manifest-scoped resolution.

Item can close: both families are measured and the one defect found is filed.
