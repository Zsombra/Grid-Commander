# UI/UX Review: a-plan-is-checked-against-the-account-that-compiled-it

## Scope

No rendered output changes. No file under `app/` or `src/presentation/` is touched,
which `git status` confirms.

## What a user sees differently

**The Apply button appears.** On `/strategies/[id]/edit`, after compiling, the review
previously rendered with no control and this sentence:

> This plan was compiled for a different account. Compile it again on yours.

That is `PlanReviewPanel`'s `applyBlockedBecause` path — already built, already
styled per DT-0002, and correct for a plan that genuinely belongs elsewhere. It was
simply always taken. The panel now renders its confirmation branch instead, which is
the branch DT-0002's acceptance lines describe.

Both branches existed and were reachable in tests. Nothing about either changes.

## Design tickets

None implicated. DT-0002 governs the review panel's treatment — `button/primary` on
`color.accent.default`, the consequence rendered in full, "Go back and change it" as
a visible peer — and none of it is touched. No surface manifest goes stale:
`openspec/design/surfaces/strategy-editor.json` describes the states, and the states
are unchanged. Which one renders is behaviour, and behaviour is this change's
subject.

## Accessibility

No markup change.

## Worth noting for the next UI pass

The refusal copy is accurate for its real case and was, for the life of the feature,
the *only* thing this page could say after a compile. A user who saw it had no way to
act on it — they had compiled on their own account. That is the same class of problem
`app-access` now has a requirement about: a surface reporting something wrong without
a next step the reader can take. The fix here is that the sentence is now rare rather
than universal; nothing about the sentence itself needed changing.
