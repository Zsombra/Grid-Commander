---
id: the-live-region-count-counts-only-one-of-two-roles
title: The "19 live regions" figure counts role=status and omits role=alert, which is also one
type: debt
status: done
priority: p3
created: 2026-08-14
updated: 2026-08-16
change: the-record-says-what-was-actually-checked
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

---

## Settled 2026-08-16 — `the-record-says-what-was-actually-checked`

**The ruling.** A live region is `aria-live`, `role="status"` **or**
`role="alert"`. ARIA defines `status` as `aria-live="polite"` and `alert` as
`aria-live="assertive"`; both are implicit live regions, so both count. 19 was
the `role="status"` count alone. The sentence in `JOURNAL.md` was the sharpest
case — it *named both roles* while carrying the status-only number.

Written into `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` beneath row 8,
which is where the next person measuring will be standing.

**And the number is not the durable part.** Replaying the item's own greps
across git history:

| commit | date | `aria-live` | `role="status"` | `role="alert"` | total |
|---|---|---|---|---|---|
| `ff5220d` | 2026-08-14 | 0 | 19 | 111 | **130** |
| `0d11966` | 2026-08-14 | 0 | 19 | 113 | 132 |
| `5ae4f2d` | 2026-08-14 | 0 | 19 | 110 | 129 |
| `HEAD` | 2026-08-16 | 0 | 25 | 114 | **139** |

130 reproduces this item's figure exactly, which confirms the method was the
same and only the definition was narrow. But the total took **three different
values inside 2026-08-14 alone**, and moved again by 2026-08-16. A bare
live-region count is a fact about a commit, not about the product — so the
three records now carry the figure with the commit it was measured on, and the
checklist carries the grep instead of a number.

**One known blind spot, recorded rather than fixed.** The literal grep misses
roles built from expressions: `app/(app)/arena/page.tsx:130` carries
`role={s.entered === null ? 'status' : undefined}`. The count is therefore a
floor. It does not affect anything above — the question the checklist asks is
whether a given component announces, and that is read from the component.

**What did not move.** The absence the two dependent records argue from was
re-checked directly at `HEAD`: `src/presentation/components/perform-button.tsx`
and `app/(app)/pending/[id]/page.tsx` carry **zero** live-region markers of any
form, expression roles included. Both items stay open with their conclusions
unchanged; only the denominator was corrected, and it moved in the direction
that makes the absence more conspicuous, not less.

**Corrected records**: `may-a-submit-disable-itself-while-it-is-in-flight.md`,
`the-checklist-and-the-button-disagree-about-disabling.md`, `JOURNAL.md`
(2026-08-14 entry, two sentences — annotated in place, not rewritten; it is
history).
