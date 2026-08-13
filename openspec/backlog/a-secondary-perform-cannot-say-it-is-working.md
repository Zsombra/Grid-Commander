---
id: a-secondary-perform-cannot-say-it-is-working
title: A perform that wears the secondary weight has no pending treatment to wear
type: debt
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: app-access
github: none
blocked_by: []
tags: [design, pending-state, confirmation, dt-0022]
---

# A perform that wears the secondary weight has no pending treatment to wear

## What

`#153` gave every perform submit a pending state. One is still silent, and it is
the one that cannot be fixed the same way.

`/pending/[id]` offers two submits against the same proposal:

```
Agree and make this change                          BUTTON_PRIMARY  -> PerformButton
Decline — this closes the proposal permanently      BUTTON_SECONDARY -> still bare
```

Both mutate. Declining closes the proposal permanently — it is not a cancel, and
there is no undo. It gives no sign it is working between click and redirect,
which is exactly the defect #153 describes.

## Why it was not swept in

`PerformButton` wears `BUTTON_PRIMARY`. Putting Decline inside it would promote a
deliberately secondary control to the page's main weight, and the weight is a
decision the design system already made: `control.ts` states that **primary is
the action the page exists to offer**. This page exists to offer agreement.
Making both controls primary would say the page is neutral between them, which
is a visual claim about a destructive choice.

So the fix is not a wiring change. It needs a **secondary variant of the pending
treatment** — what a `BUTTON_SECONDARY` control looks like while its submit is in
flight — and that is DT-0022's shape one weight along.

## Why it matters

p3, and the priority is honest rather than deferential.

One control on one page. But it is a **destructive** control with no undo, and it
is the one a user is most likely to press twice: declining is the hesitant
choice, and a page that does not respond to a hesitant click invites a second
one. The guard is single-use confirmation tokens, so the second press is refused
rather than harmful — the cost is a refusal message where a spinner belonged.

It is also the only hole in a rule that is otherwise enforced. That matters more
than the single page: a rule with one silent exemption is a rule people learn to
work around.

## What a fix needs

1. A design ticket defining `loading` for the secondary weight. Not a copy of
   DT-0022's — the primary keeps its accent ground because a working control is
   not an unavailable one, and the secondary has no ground to keep. The
   indicator's colour is the open question, since `accent.text` is wrong on a
   bordered transparent control.
2. Then a `weight` prop on `PerformButton`, or a sibling component. The prop is
   the smaller change and keeps one place spending the treatments; a sibling
   duplicates the hook and the aria wiring, which is two places to forget
   `aria-busy`.

## Evidence

- `app/(app)/pending/[id]/page.tsx` — the two submits, one converted and one not
- `tests/architecture/every-perform-says-it-is-working.test.ts` — the guard's
  regex is scoped to `BUTTON_PRIMARY`, and its doc comment names this exemption
  as a gap rather than a rule
- `src/presentation/components/control.ts` — "primary is the action the page
  exists to offer; secondary is its peer and every submit that only asks a
  question". Decline is neither of those, which is the wrinkle: it is a peer
  that performs.
- `openspec/design/tickets/DT-0022.json` — the primary treatment this extends

## Notes

`github: none` — filed at the moment it was found rather than at the end of the
work that found it, so it does not live only in a closed item's body and a test
comment. The issue should be opened when someone picks it up; it is not urgent
and it is precisely scoped.

Found while closing #153. Deliberately not swept in, because sweeping it would
have meant making a visual decision from the implementation lane — the failure
the two-agent handoff exists to prevent.
