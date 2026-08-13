---
id: a-surface-forbids-client-js-while-rendering-it
title: pending-proposal still records "No client JS" as a constraint while rendering a client component
type: debt
status: open
priority: p3
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: app-access
github: "243"
blocked_by: []
tags: [design, surfaces, records-accuracy]
---

`openspec/design/surfaces/pending-proposal.json` states **"No client JS."**
twice — once as a constraint (line 57) and once in `notes` (line 245).

DT-0027 moved that surface's Decline submit to `<PerformButton weight="secondary">`.
`src/presentation/components/perform-button.tsx` opens with `'use client'` and
uses `useFormStatus`. So the surface now renders client JS, and PR #235
re-surveyed this exact manifest — adding `perform-button.tsx` to its
`source_files` — without removing the constraint that forbids it.

## Why it matters more than a stale line

A surface constraint is what the design agent is told it **must not break**.
Leaving a false one in place means either:

- the next design round honours it and refuses a legitimate treatment, or
- it notices the contradiction and learns that constraints in these manifests
  are not reliable — which is worse, because the reliable ones are what stop a
  design ticket changing behaviour.

The constraint was true when written. The Agree button on this page has been a
`PerformButton` for a while, so it may have been false before DT-0027 too —
worth checking the manifest's history rather than assuming this round
introduced it.

## A second instance, found and corrected the same day

`agent-edit` carried the same falsehood: *"The page renders whole from one
server round trip — no client JS, no hydration."* Its own `source_files` list
`perform-button.tsx`, and `agent-edit.tsx` renders three `<PerformButton>`s.
Found while re-surveying that surface (PR #235's review changed its page), and
corrected there to state the truth: full navigation, no client state, with
`PerformButton` named as the one exception and the design veto kept — no client
state, no optimistic rendering, no partial update.

Two surfaces out of the handful anyone has looked at. That is the reason to
treat this as a class rather than two edits.

## The wider question

This is the second thing the re-survey should have caught and did not (the
first being that `perform-button.tsx` was in no manifest's `source_files` at
all — #230). The surveyor updates `source_files` and digests; it does not
appear to re-derive `constraints` from what the sources actually do. If that is
right, every constraint in every manifest is only as fresh as the last human
who read it, and `design_surface_stale` will never say so.

Worth deciding whether a constraint like "No client JS" should be *derived*
(check the source files for `'use client'`) rather than *asserted*. Several
constraints of that kind are mechanically checkable.

p3: no operator-visible defect. Found reviewing PR #235.
