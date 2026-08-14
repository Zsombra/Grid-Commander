---
id: the-app-has-no-error-boundary-anywhere
title: The app has no error boundary, so any unexpected throw is a framework page
type: risk
status: done
priority: p2
created: 2026-08-14
updated: 2026-08-14
change: "an-unanticipated-failure-has-a-floor"
capability: app-access
github: "236"
blocked_by: []
tags: [error-handling, operator-facing, nextjs]
---

# The app has no error boundary, so any unexpected throw is a framework page

> **Closed 2026-08-14** — `an-unanticipated-failure-has-a-floor` (archived).
> `app/error.tsx` + `app/global-error.tsx`, one boundary at the app root so
> every route is covered including `/connect` and the group layout. The
> item's open question is settled: a server-action throw from a submitted
> form IS caught by the nearest boundary on Next 15, so the floor covers the
> case that mattered. No retry control (idiom-tested — no prop may hold the
> `reset` callback); digest shown, raw message never. GitHub #236 closed.

## What

```
find app src -name 'error.tsx' -o -name 'global-error.tsx'   ->  nothing
grep -rn 'catch (' app --include=*.tsx                       ->  one
```

Next renders `error.tsx` when a segment throws. There is none, at any level, so
anything that escapes — a port that raises where its callers expected a result
union, a bug, a dependency throwing on a shape it did not expect — reaches the
operator as *"Application error: a server-side exception has occurred"*.

## What this is not

**It is not #232, which is fixed.** Every confirmation refusal now has a
product-authored route: `spending()` catches `ConfirmationRequiredError` in ten
of the eleven spending actions and redirects with the sentence the product wrote
for it (`conditions/save`, the eleventh, has its own correct catch). That was
the known, reachable, operator-facing case.

This paragraph said "nine" and was written while `/agents/[id]/edit` was still
unprotected — see #232's item for how the scan missed it. The claim is true now;
it was not when it was written.

This item is the **floor underneath** — the unknown cases. #232 closed the one
throw anybody had enumerated; it did not give the app a boundary, and the
distinction matters when sizing this: nothing here is a known defect. It is the
absence of a backstop.

## Why it matters

p2, and honestly p2 rather than p1: no reproduction is attached, and the case
that had one is closed.

What earns it a place at all is the product's own posture everywhere else. This
is a client that holds credentials configuring other people's agents, and it is
scrupulous about refusals reaching the person — `write-results.test.ts` polices
dropped results, `refusals-reach-the-operator.test.ts` pins five surfaces to
their refusal arms, and `CarriedProblem` renders a reason on every branch of
several pages. A product this careful about *expected* failure having no floor
under *unexpected* failure is an odd gap, and the fix is small.

## What would settle it

A route-level `app/(app)/error.tsx` rendering the product's own words, and a
decision about whether `global-error.tsx` is wanted too. The content matters as
much as the existence: *"something failed that we did not anticipate; nothing
here tells you whether your last action landed — check the activity log"* is
honest, and is what the operator actually needs. A boundary that says "try
again" would be worse than none, because retrying a write whose outcome is
unknown is exactly the wrong advice.

**Check first whether an error boundary catches a throw from a server action**,
which is the case that matters most here and is not the case `error.tsx` is
documented for. If it does not, this item is smaller than it looks and the
per-action catch #232 shipped is the whole answer.

## Evidence

- No `error.tsx` / `global-error.tsx` in the repo
- `grep -rn 'catch (' app --include=*.tsx` — one, in `conditions/save/page.tsx`
- `src/presentation/confirmation-refusal.ts` — what #232 shipped, and its limit
- `src/application/use-cases/failure-outcome.ts` — throws are a deliberate part
  of this product's vocabulary, which is what makes the missing floor notable

## Notes

Split out of [[a-spent-confirmation-shows-a-crash-page]] (#232) rather than
folded into it. That item named a specific reachable defect and closing it over
a much broader "add a boundary" would have made a fixed thing look unfixed and
an unscoped thing look done.
