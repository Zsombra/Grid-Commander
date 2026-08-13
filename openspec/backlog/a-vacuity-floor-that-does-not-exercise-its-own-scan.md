---
id: a-vacuity-floor-that-does-not-exercise-its-own-scan
title: Anti-vacuity floors count a different pattern than the rule they are guarding
type: debt
status: open
priority: p2
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: app-access
github: "241"
blocked_by: []
tags: [testing, architecture, vacuity]
---

This repo has now been caught three times by a scan that stopped matching and
reported a clean tree — #230, and twice more in the #232 / PR #235 round. The
countermeasure in place is an anti-vacuity floor. On at least one guard the
floor cannot do its job, because it counts something the rule does not.

## The instance

`tests/architecture/every-perform-says-it-is-working.test.ts`:

- The **rule** walks lines, tracks `inAction` across `<form action=` /
  `method="get"` / `</form>`, and reports submits wearing `BUTTON_PRIMARY` or
  `BUTTON_SECONDARY`. It is an *offender* scan, so finding nothing is the
  correct result at HEAD.
- The **floor** counts files containing the literal `<PerformButton` and
  requires ten.

Those are different mechanisms. If the `inAction` state machine broke — a
multi-line `<form` opening tag, an attribute order it does not expect — the
offender scan would silently find nothing and the floor would still pass,
because `<PerformButton` is unaffected. The floor proves the *files* are still
there. It proves nothing about whether the *scanner* still reads them.

The rule does work today: PR #235 mutation-tested the widened version and a
bare secondary submit inside a `<form action>` was caught. This item is about
the guard on the guard.

## The general shape

An anti-vacuity floor is worth something only if it fails when the rule's own
machinery fails. Two ways to get that:

1. **Positive fixture.** Keep a known offender in a fixture directory the
   scanner also walks, and assert it *is* found. If the scanner breaks, the
   fixture stops being reported and the test fails.
2. **Count with the rule's own machinery.** Assert on an intermediate the rule
   produces — "the `inAction` walk saw at least N action forms" — rather than
   on an independent grep.

(1) is stronger, and is what a mutation test automates. Worth applying to every
offender-style scan under `tests/architecture/`, not only this one.

## The sibling failure, for contrast

`a-refusal-reaches-the-person.test.ts` had the other half of this problem and it
was fixed during PR #235's review: its floor sat at 8 while the scan found 10,
so the eleventh confirmation spender being invisible could not fail it. A floor
set "well under the real count" cannot tell a shrinking product from a shrinking
scan. It is now pinned at the true count, which still permits growth but forces
any loss of reach to be acknowledged in an edit.

Same lesson, two different mechanisms — which is why this is worth a sweep
rather than a second one-off fix.
