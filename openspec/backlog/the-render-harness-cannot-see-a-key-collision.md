---
id: the-render-harness-cannot-see-a-key-collision
title: The rendering harness never reconciles, so no test in this project can observe a React key collision
type: debt
status: open
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: app-access
github: "194"
blocked_by: []
tags: [testing, harness, vacuous-test, react]
---

# The render harness cannot see a key collision

## What

`tests/rendering/support/render.ts` resolves a server component by walking the
returned element tree — arrays, fragments, intrinsics, and nested components
called and awaited in turn. It never runs React's reconciler.

**Key collisions only exist during reconciliation.** Two `<li>` with the same
`key` render as two nodes in the tree and as *one* in the DOM. So the harness
sees both, always, whatever the keys are.

Established the hard way while implementing
`what-the-page-shows-is-what-happens`: a test written for the two-key-less-
entries case passed against the **fixed** code and passed identically against
the **old, broken** code, verified by reverting the fix and re-running. The
test was removed rather than kept — a green assertion that cannot fail is worse
than no assertion, because it reports coverage that does not exist.

## Why it matters

p3, and it is about what the suite can *promise*, not about a live defect.

The suite is 2213 tests across 169 files and is the project's main evidence
that a surface says what it should. This is a class of UI defect it is
structurally blind to — and the blindness is silent. Nothing warns that a
rendering assertion about list identity is vacuous; it simply passes.

The immediate consequence: the requirement **A Listing Shows Every Entry It Was
Given** (strategy-authoring, added by `what-the-page-shows-is-what-happens`) has
two scenarios that **no automated test covers**, and none can be written with
what exists today. The requirement is still correct and still observable — in a
browser, with two key-less entries — so it stays. What is missing is the means
to check it here.

## Evidence

- `tests/rendering/support/render.ts` — the resolver's own header describes
  expanding the tree; there is no reconciliation step
- `openspec/changes/what-the-page-shows-is-what-happens/` — the change whose
  scenarios this leaves uncovered
- The experiment: revert `named.map((key, i) => <li key={i}>` to
  `<li key={key}>` in `app/(app)/strategies/[id]/conditions/save/page.tsx`,
  run `tests/rendering/condition-write.test.ts` — 17 passed, both ways

## Notes

**Three candidate answers, none obviously right.**

- **Assert on keys, not on output.** Have the resolver collect each element's
  `key` alongside text and links, and let a test assert that a list's keys are
  distinct. Cheap, and it checks the property directly rather than its
  consequence — at the cost of asserting an implementation detail, which is
  what the harness's design deliberately avoids everywhere else.
- **Render for real** with a DOM (`@testing-library/react` or similar) for the
  handful of surfaces where identity matters. Honest, and a large new
  dependency and a second rendering idiom in a suite that has exactly one.
- **Accept it and say so** in the harness header, so the next person writing a
  list-identity test learns it from the file rather than from a false green.

The third is the minimum, and should happen whatever else does: the trap here
is not the gap, it is that the gap is invisible.

Related: [[dt-0014-acceptance-outlived-the-receipt-it-described]] — the other
finding from this session about a check that reads as passing when it has
stopped meaning anything.
