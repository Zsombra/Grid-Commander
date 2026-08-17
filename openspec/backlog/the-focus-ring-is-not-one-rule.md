---
id: the-focus-ring-is-not-one-rule
title: A shared control constant disables the global focus ring and draws its own
type: bug
status: done
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: ""
github: "338"
blocked_by: []
tags: [design, accessibility, focus, tokens, manifest-claim]
---

# The focus ring is not one rule

## What

Twelve surface manifests assert *"Focus ring comes from the one global rule in
`globals.css` — **do not add a per-element ring**."* Seven more assert *"Focus
ring is global (focus-visible, 2px)."*

There is a per-element ring. `src/presentation/components/control.ts:26`:

```
export const CONTROL =
  'w-full rounded-gc-2 border border-border-default bg-bg-raised p-2 ' +
  'text-base font-normal text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';
```

`CONTROL` is used in **71 places** — every text input, select and textarea in
the product. `focus-visible:outline-none` switches off the global rule for all
of them.

The two treatments are not the same. `app/globals.css:19`:

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--gc-focus);
  outline-offset: 2px;
}
```

An **outline offset 2px from the element** against a **ring with no offset**. So
a focused text input and a focused link wear visibly different focus indicators.

## Why it matters

The global rule's own comment says it exists so the treatment *"cannot be
forgotten on the next control someone adds"*. It was not forgotten — it was
overridden, by the constant that exists so that seven copies of a treatment
cannot disagree. Both mechanisms did their job and the product still ended up
with two focus rings.

p3 and not higher: every interactive element **does** have a visible
focus-visible indicator at 2px in the focus token, so nothing is unreachable or
invisible to a keyboard user. What is wrong is consistency, and a design-system
claim repeated in nineteen manifests that the code contradicts.

## Evidence

- `src/presentation/components/control.ts:26` — the override.
- `app/globals.css:12-22` — the global rule and its stated purpose.
- `grep -rn "CONTROL\b" src/presentation app` — 71 sites outside `control.ts`.
- 12 manifests carry *"do not add a per-element ring"*; 7 carry *"Focus ring is
  global (focus-visible, 2px)"*. Measured 2026-08-16 while closing
  [[the-focus-ring-and-element-claims-are-unmeasured]] (#318).

## Notes

- **The fix is `/design`'s call, not a passing edit.** Removing the three
  `focus-visible:` utilities from `CONTROL` would change what 71 controls look
  like when focused. That is a visual decision with a design contract over it.
- **Which one should win is genuinely open.** The global outline is the one the
  manifests describe and the one every non-`CONTROL` element already uses. The
  ring may have been chosen deliberately for inputs — `control.ts`'s comment
  notes the `focus` token *"had existed in `system.json` since DT-0001 and was
  referenced by nothing until now"*, which reads as the override being written
  to give that token a first consumer rather than to change the treatment.
- Whichever wins, **the nineteen manifest claims need to match it afterwards**.
  Fixing the code and leaving the prose is the failure #318 exists to catch.

## Fixed 2026-08-17 — the global rule wins

`CONTROL` drops all three focus utilities. Inputs, selects and textareas now
wear the same indicator as links and buttons.

**The design system decided this, not me.** `openspec/design/system.json`'s
principle reads *"Every interactive element has a visible focus state at 2px
offset."* The global rule is `outline: 2px` with `outline-offset: 2px`. A
Tailwind `ring-2` has **no offset** — so the override was not a second way of
saying the same thing, it was the one treatment on the product that did not meet
the stated principle. That settles the "genuinely open" question in the Notes.

**The `focus` token is not orphaned.** `globals.css:20` reads it as
`var(--gc-focus)`. The original comment's reasoning — that the token *"was
referenced by nothing until now"*, which is why the override existed — was
mistaken about the global rule already consuming it. Corrected at the call site.

### The assertions moved rather than went

Two tests in `controls.test.ts` pinned the override. Deleting them would have
left the nineteen manifest claims checked by nothing, which is how they came to
be false. They are replaced by:

- `carries no focus treatment of its own — the global rule owns it`
- `and the global rule draws it, on keyboard focus only, at 2px offset`, which
  **reads `app/globals.css`** rather than restating it, so a constant in the
  test file cannot agree with itself while the stylesheet says otherwise.

Confirmed non-vacuous: restoring the three utilities fails the first one.

### A defect caught while writing those tests, worth recording

The first version of those regexes went through a shell heredoc, where `\b`
collapsed and Python emitted **three literal 0x08 bytes**. `/\x08ring-/` matches
nothing, so two `.not.toMatch` assertions were **vacuously true and passing** —
a green test checking nothing, in the very change whose subject is a claim
nothing checked. Found by byte-inspecting the file, repaired from `chr(92)` in a
script written to disk rather than piped.

### Shipped as `one-focus-ring` (lite, archived)

21 surface manifests re-pinned for `control.ts`, digest only — no manifest
describes the override (`ring-2` appears in none of them), so the nineteen claims
are *repaired* by this rather than falsified. Gates: `tsc` clean, `lint` clean,
**2713/2713 across 212 files**.
