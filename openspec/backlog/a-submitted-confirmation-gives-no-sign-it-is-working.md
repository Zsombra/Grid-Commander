---
id: a-submitted-confirmation-gives-no-sign-it-is-working
title: A submitted confirmation gives no sign it is working — the button's declared loading state is implemented nowhere
type: debt
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: agent-authoring
github: "153"
blocked_by: []
tags: [ui, design-system, confirmation-pages]
---

# A submitted confirmation gives no sign it is working

## What

Every confirmation page submits through a Next.js server action and renders
no pending state: between the click and the redirect the page just sits
there. The button primitive in `openspec/design/system.json` declares a
`loading` state (and a `disabled` one); neither is implemented by
`BUTTON_PRIMARY`/`BUTTON_SECONDARY` in
`src/presentation/components/control.ts`, and no form in the product
reaches them.

Found while surveying `/agents/[id]/archive` into
`openspec/design/surfaces/agent-archive-confirm.json` (the survey records
it on the `button-primary` component). The same is true of every
confirmation page — archive, rebind, deploy, strategy apply — because they
share the same server-action shape.

Confirmed by the 2026-08-12 ceremony surveys (backlog #157): every one of the
twelve manifests written that day records the same gap on its perform form —
agent edit/deploy/rebind/reactivate/undeploy, strategy
archive/restore/fork/conditions-save/rules, recorder trim, and the strategy
editor's apply. The enumeration is complete; the fix remains the one shared
client-boundary decision below.

## Why it matters

A click that visibly does nothing invites a second click. The confirmation
ceremony (expectedRevision + confirmationToken) makes the double-submit
safe — the second POST is refused on the moved revision — so this is
p3 polish, not a correctness hole. But the refusal the second click earns
("revision moved") is a confusing answer to "I pressed the button twice
because it looked dead".

## The constraint that makes it non-trivial

These pages are deliberately server-rendered with no client JS (recorded as
a constraint on the surface manifest). A pending state needs
`useFormStatus` or equivalent — a client boundary where none exists today.
That is a behavior change: per the design contract it cannot arrive as a
design ticket; it needs a `/propose` change that decides the client-JS
question first. Filed so the decision is made rather than drifted into.

## First step

A `/propose` (lite) that decides whether confirmation pages may carry a
minimal client boundary for submit feedback, and if yes, implements it once
in the shared control layer rather than per page.

---

# Blocked, and by two measured things — 2026-08-13

Attempted. Stopped before writing code, because the obvious implementation
breaks something and the non-obvious part is not this agent's to decide.

## 1. The harness cannot render the fix

A pending state on a server-action form is `useFormStatus()`, which requires a
**client component inside the `<form>`**. `tests/rendering/support/render.ts`
calls function components directly, outside React's renderer, so a hook has no
dispatcher. Probed rather than assumed:

    THREW: Cannot read properties of null (reading 'useHostTransitionStatus')

Twelve confirmation pages have rendering tests that render the page component.
Putting a `useFormStatus` component inside their forms turns all twelve red.

This is not the same limit as [[the-render-harness-cannot-see-a-key-collision]]
(#194, now closed) — that one was a blind spot and the keys turned out to be
readable without a renderer. This one is a hard stop: the hook needs a real
render pass, and no amount of walking the tree provides one.

**`section-nav.tsx` is not a counter-example.** It is the product's only client
component and it is rendered by the layout, which page-level rendering tests
never invoke. The harness has never actually met a client component.

So this needs a decision first: teach the harness to render (react-dom/server,
or a testing library) for the pages that need it, or mock the submit component
in those twelve files. Either is a change of its own, with a blast radius across
36 rendering test files.

## 2. The state is declared but not designed

`openspec/design/system.json` declares the button primitive as
`states: [default, hover, active, focused, disabled, loading]`. It declares the
state **names**. It does not say what `loading` or `disabled` look like — no
token, no treatment.

So implementing it means choosing a treatment, and per `CLAUDE.md` the design
agent owns tokens and treatments; the dev agent implementing a look nobody
designed is the failure the two-agent handoff exists to prevent. This wants a
design ticket, and it is the same surface
[[two-confirmation-row-shapes-and-an-undesigned-page]] (#183) already says has
never been designed.

## What this changes about the item

Nothing about the defect, which is real and unfixed on all twelve surfaces. It
changes the **shape of the work**: this is not a small implementation task that
nobody got to. It is one harness decision plus one design ticket, and only then
an implementation.

Re-read the ordering that follows from that: #183's design round should cover
the button's loading and disabled states while it is covering `AuthorityLost`
and the two confirmation-row shapes, because they are the same surfaces and the
same sweep. The harness decision is independent and can happen first.

---

# Blocker 1 is gone — 2026-08-13, later

The harness needed no change, and the migration this item was priced for would
not have worked.

**The hook is mockable at its module boundary**, which is the move this suite
already makes for `@/presentation/session.js`. `tests/rendering/support/form-status.ts`
holds the double; `tests/rendering/form-status.test.ts` proves the walker calls
a client component through it and reaches **both** states.

**And a real renderer would not have helped.** Measured, not reasoned:

    renderToStaticMarkup(<form><Probe /></form>)
    -> '<form><span>pending=false</span></form>'

`useFormStatus` is a client runtime state — it becomes true after hydration,
when a submission is in flight. React's own server renderer reports `false`. So
swapping the walker for `react-dom/server` would have cost 36 test files and
still rendered exactly one of the two states, never the one worth asserting.

That inverts the reasoning in the section above. Mocking is not a shortcut
around a weak harness; short of driving a browser it is the **only** way to
reach a pending form at all. The claim is pinned by a test rather than left in
prose: if React ever lets a server render report a pending form, that test fails
and tells us the mock has stopped being the only route.

## What is still blocking

**Only the treatment**, which is blocker 2 above and unchanged.
`openspec/design/system.json` declares the button's states as names —
`[default, hover, active, focused, disabled, loading]` — and says nothing about
what `loading` or `disabled` look like. Implementing them means choosing a look
the design agent owns.

So the ordering is now: **#183's design round, then this.** The implementation
itself is no longer the hard part — the double exists, both states are
assertable, and the twelve surfaces share one server-action shape. What is
missing is a decision about what a working button looks like.

`a-remedy-is-a-target-not-a-sentence` (#182) set the precedent for how to
proceed without prejudging that round: reuse an existing primitive, add no new
treatment, and say plainly what is still owed.
