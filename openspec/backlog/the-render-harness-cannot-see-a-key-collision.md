---
id: the-render-harness-cannot-see-a-key-collision
title: The rendering harness never reconciles, so no test in this project can observe a React key collision
type: debt
status: done
priority: p3
created: 2026-08-13
updated: 2026-08-13
change: "the-harness-can-see-a-key-collision"
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

## The minimum landed 2026-08-13 — the header says what it can see

The resolver's header now carries a "what this can see, and what it cannot"
section, read before writing an assertion:

**Collected** — `text`, `headings`, `links`, `values`. With the rule that
`links` and `values` exist *because* the alternative was a green test proving
nothing, so reachability and field contents are asserted on those, never on
`text`.

**Not collected, and not assertable here** — anything that only exists after
reconciliation (React keys, the case that bit), anything CSS decides, anything
the client does.

And the bar for adding a collector: *a property whose absence lets a wrong page
pass a reasonable-looking test.* That is the standard `links` met and `values`
met, and it is what keeps this from growing into a DOM by accretion.

## Half done, and the half that is left is the same as it was

`values` closed the form-state hole (#162 could not have been verified without
it). **Key collisions still need a real DOM**, and the requirement
*A Listing Shows Every Entry It Was Given* stays knowingly uncovered.

What has changed is that the gap is now written where someone meets it, rather
than being something they discover by trusting a false green. That was always
the minimum; it is not the fix.

---

# Closed 2026-08-13 — the harness can see one, and it did not need a reconciler

Fixed by `the-harness-can-see-a-key-collision`. `Rendered` now carries
`duplicateKeys`, and the regression this item says could not be written exists
at `tests/rendering/condition-write.test.ts`, verified by reverting the real fix
and watching it fail:

    AssertionError: expected [ '(an entry with no key)' ] to deeply equal []

**This item's premise held and its conclusion did not.** It is true that no test
here could observe a collision, and true that collisions only *take effect*
during reconciliation. From that it inferred the fix needed a real DOM, and its
first step contemplated swapping in a renderer across 35 consumer files.

That inference confused the effect with the key. A React element is
`{$$typeof, type, key, ref, props}` — the key is a property of the object the
walker already visited, and `expand` destructured `type` and `props` off it and
never read `key`. React reconciles siblings within one array, which is exactly
where `expand` already iterated. The whole fix is a `Set` in that loop.

Worth naming, because the same shape has now appeared several times in this
repository this week: **a correct observation, a correct mechanism, and a
conclusion that skipped a step nobody checked.** The item sat at p3 for the cost
of a renderer migration it never needed.

The blind spot that remains is real and smaller: what reconciliation *does* —
that the two collided rows become one, and which survives — still needs a DOM.
Collisions are now visible; their outcome is not. That is recorded in
`render.ts`'s own doc comment rather than left here.
