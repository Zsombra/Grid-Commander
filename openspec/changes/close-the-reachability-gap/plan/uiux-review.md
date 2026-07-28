# UI/UX Review — close-the-reachability-gap

- Checklist source: `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`
- Status: `PENDING EXECUTION EVIDENCE`

## Scope Summary

Five new pages, three components gaining a prop, one page gaining a form. This
is the largest UI surface added in the project so far, and it is added
deliberately **unstyled** — the design agent has not seen a surface yet, and
five newly-designed pages would pre-empt it.

## Component Checklist Matrix

| Rule area | Applies | What must hold | Status |
|---|:--:|---|---|
| Component structure | ✓ | Server components; no `'use client'`; no data fetching inside components | PENDING |
| Hooks / store | ✗ | None exist | N/A |
| shadcn/ui, Tailwind | ✗ | Neither installed; none introduced | N/A |
| Consequence & confirmation | ✓ | Archive and restore name the consequence before the button; fork does not confirm (DL-105) | PENDING |
| Accessibility & semantics | ✓ | One `<main>`, one `<h1>` per page; `role="alert"` for errors, `role="status"` for state | PENDING |
| Responsive layout | ✓ | No fixed widths beyond the existing `max-w-*` convention | PENDING |
| State & interaction | ✓ | Every result variant of every use case renders a state | PENDING |

## States Each New Page Must Render

| Page | States |
|---|---|
| agent edit | not-connected · agent not found · not-editable · rejected (named fields) · invalid (named fields) · updated |
| agent reactivate | not-connected · not found · not-permitted · confirmed |
| strategy fork | not-connected · unreadable · at-capacity · forked |
| strategy archive | not-connected · unreadable · refused (system-owned, already archived) · proposal · archived |
| strategy restore | not-connected · unreadable · refused · **repair-required** · restored |

`repair-required` is the one that matters: it is not an error, and rendering it
as one would tell the user to retry something that will never work.

## Design Boundary

| Must not appear in any new page | Status |
|---|---|
| A colour value | PENDING |
| A font family, size or weight beyond the existing `text-*` convention | PENDING |
| A design token reference | PENDING |
| A stylesheet import | PENDING |

## Served Evidence

All sixteen paths the interface can render, requested from the built and served
application. **Zero 404s** — previously five.

```
/connect 200  /agents 200  /audit 200  /strategies 200  /assistant 200
/agents/new 200
/agents/x 200  /agents/x/edit 200  /agents/x/reactivate 200
/agents/x/rebind 200  /agents/x/archive 200  /agents/x/journal 200
/strategies/x/edit 200  /strategies/x/fork 200
/strategies/x/archive 200  /strategies/x/restore 200
```

### Task 4.4 — what the binding looks like in the served HTML

The rendered form is itself the evidence, and better evidence than a forged POST
would be:

```html
<!-- before -->
<form method="post" action="/agents/new">

<!-- after, from the served application -->
<form action="" encType="multipart/form-data" method="POST">
<input name="$ACTION_ID_0004a43e083cbb32539bf647a6c965fcf2f3c57b01" ...>
```

A bound form renders an empty action plus the action id Next resolves on the
server. An unbound one renders a URL. The difference is visible in the markup,
so "is this form connected to anything" is answerable by looking rather than by
pressing.

**Limit, stated rather than glossed.** Only `/connect` renders a form to an
unauthenticated visitor; every other write path sits behind a session, and the
capability pages correctly show the not-connected outcome instead. So the served
probe confirms the mechanism on one path and cannot reach the other five without
an OAuth consent in a browser. The static guard covers those five — it reads the
source rather than the response, which is exactly why both checks exist.

Forging a Server Action POST with `curl` returns 404: Next validates the action
id, a build-time hash embedded in the rendered page. Correct behaviour, not a
defect — and the reason this verification reads markup instead.

## Findings

**F-1 — the layout must not add a landmark**, carried over: every page supplies
its own `<main>`, and the five new pages follow that rather than nesting.

**F-2 — three pages initially reached past the use cases.** `isEditable` and
`isReactivatable` are domain predicates, and importing them into `app/` broke the
route-boundary rule. Moved to `src/presentation/components/agent-edit.tsx`,
alongside `agent-actions.tsx`, which had solved the same problem already. A
pre-existing guard finding real drift in new code, cleanly, for the first time in
this project.

**F-3 — `repair-required` renders as `role="status"`, not `role="alert"`.**
Nothing failed: BattleGrid declined and named what would work instead. Marking it
as an error would tell the user to retry something that never will.

**F-4 — no new page carries a colour, font, spacing or token value.** The five
new surfaces match the plainness of the existing eleven, so the design survey
sees one consistent product rather than five pages designed ahead of the design
agent.

## Verdict

`EXECUTION EVIDENCE COMPLETE`
