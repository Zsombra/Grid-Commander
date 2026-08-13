---
id: the-live-region-count-counts-only-one-of-two-roles
title: The "19 live regions" figure counts role=status and omits role=alert, which is also one
type: debt
status: open
priority: p3
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: app-access
github: "242"
blocked_by: []
tags: [accessibility, records-accuracy]
---

Three binding records carry the sentence *"the product has 19 live regions
elsewhere; none is on the pending state"*:

```
openspec/backlog/may-a-submit-disable-itself-while-it-is-in-flight.md:68
openspec/backlog/the-checklist-and-the-button-disagree-about-disabling.md:125
openspec/JOURNAL.md:160
```

## Measured

```
aria-live=      0
role="status"  19
role="alert"  111
                ---
any of three  130
```

So **19 is exactly the `role="status"` count**. The figure is not invented; the
definition was narrowed. But `role="alert"` is an implicit live region — it is
defined as `aria-live="assertive"` — so the product has 130, not 19.

## What this does and does not change

**It does not change the argument the number supports.** That argument is about
an *absence* on one path: `perform-button.tsx` carries no live region, so the
progressive label is announced only because the pressed control still holds
focus, and disabling would move focus off it. I re-measured that directly —
`app/(app)/pending/[id]/page.tsx` and `src/presentation/components/perform-button.tsx`
contain no `aria-live`, no `role="status"` and no `role="alert"`. The absence is
real and the reasoning built on it stands.

What moves is the *denominator*, and it moves in the direction that makes the
absence more conspicuous: a product with 130 live regions and none on the one
control that changes state under the user's hands is a starker fact than one
with 19.

## Why file it rather than fix it inline

The same three records were already corrected once this session, for the
`"a disabled control is unreachable to a screen reader"` claim. Correcting a
number in three places is cheap; deciding **which definition the product means
by "live region"** is the part worth doing once, deliberately, so the next
measurement is comparable. If `role="alert"` counts — and it does — then some
other statements about announcement behaviour in these items may also be
scoped to `role="status"` without saying so.

p3: nothing is broken, and no decision currently rests on the denominator.
Found reviewing PR #235.
