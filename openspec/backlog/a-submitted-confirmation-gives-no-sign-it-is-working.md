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
