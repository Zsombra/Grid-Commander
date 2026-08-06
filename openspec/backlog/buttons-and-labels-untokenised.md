---
id: buttons-and-labels-untokenised
title: Buttons and labels still use stock utilities
type: debt
status: in-progress
priority: p3
created: 2026-07-29
updated: 2026-08-06
change: "buttons-and-labels-from-one-source"
capability: app-access
blocked_by: []
tags: [ui, dark-mode, design]
---

# Buttons and labels still use stock utilities

## What

`forms-that-work-in-the-dark` gave every input, select and textarea one
token-based treatment from `src/presentation/components/control.ts`. It did not
touch the buttons or labels beside them, which are still
`rounded border px-4 py-2 text-sm` and `block text-sm font-medium`.

## Why it is P3 and not P2

The inputs were a *defect*: they had no background, so the browser supplied
white, and a control was a white box on a near-black page. Buttons and labels
inherit the page's colours and are legible in both schemes — they are
untokenised, not broken.

Left deliberately, and named, so the one thing that change fixed stayed
checkable. Sweeping them in would have made "the inputs are fixed" and "the
forms were restyled" the same commit, and only one of those was verified by
looking at it.

## Fix

Worth doing as part of the first design pass over a form-carrying surface —
`agent-roster`, the assistant, or the agent editor, none of which have been
surveyed — rather than alone. A button treatment is a design decision (which
weight is primary, what a destructive action looks like beside `accent` and
`danger`) and `system.json` has the tokens but no ticket has spent them.

`src/presentation/components/control.ts` is the pattern to follow: one constant,
one source, imported everywhere.
