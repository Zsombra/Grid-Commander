---
id: the-authority-page-names-a-remedy-and-offers-no-target
title: AuthorityLost states the remedy in words and offers nothing to click, unlike NotConnected
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: "a-remedy-is-a-target-not-a-sentence"
capability: battlegrid-connection
github: "182"
blocked_by: []
tags: [ui, auth, design]
---

# The authority page names a remedy and offers no target

## What

`AuthorityLost` (`src/presentation/components/authority-lost.tsx`, added by
`a-lost-authority-is-not-a-refusal`) renders the failure's own sentence —
which contains the remedy, *"Connect your account again"* or *"repair the
configured credential"* — and then offers no link, button or form at all. The
only way onward is the global `SectionNav`.

`NotConnected`, which answers the same question one step earlier, does the
opposite: DT-0006 ruled that its one remedy is **a target, not a sentence**,
and it renders a `BUTTON_SECONDARY` anchor to `/connect`.

So the product now states the same remedy two ways, and the newer surface is
the weaker one.

## Why it matters

p3: the operator is told exactly what to do and the global navigation can get
them there. But DT-0006's ruling exists because a remedy the reader has to
act on themselves is one they may not, and an authority failure mid-write is
precisely when someone is least inclined to go hunting.

## Evidence

- `src/presentation/components/authority-lost.tsx` — no anchor, no control.
- `src/presentation/require-connection.tsx` — the `BUTTON_SECONDARY` anchor
  DT-0006 required.
- Found by the post-round re-survey of `strategy-rule-editor`, recorded in
  that manifest's `current_implementation` for the component.

## The reason it was not simply done

The target depends on the deployment, and the component cannot tell. On a
delegated deployment `/connect` is right. On a personal one it renders *"There
is nothing to connect"*, which was the exact reason
`a-lost-authority-is-not-a-refusal` refused to redirect there — offering it as
a link has the same defect as redirecting to it, one click later.

`ConnectionRevokedError` knows which remedy applies; the string it produces
does not. Fixing this means carrying the `Remedy` value to the surface
alongside the sentence, and rendering the target only where one exists —
which is a small behaviour change (a new field on the outcome), so it wants a
proposal rather than a design ticket.

## Notes

Filed as a deferral of `a-lost-authority-is-not-a-refusal`, which decided the
routing question and left this one open deliberately.

---

# Closed 2026-08-13 — the remedy is a target where one exists

Fixed by `a-remedy-is-a-target-not-a-sentence`. `AuthorityLost` renders a
`BUTTON_SECONDARY` anchor to `/connect` when the deployment's remedy is
`reconnect`, and nothing when it is `repair-the-key`.

**The component was not simply missing a link — it argued against one**, and the
argument was right:

> Sending the operator to `/connect` is right on a delegated deployment and
> lands a personal one on "there is nothing to connect".

The spec agrees: *A Remedy Named Must Exist In That Deployment*. With no way to
tell the deployments apart, refusing to link was the only honest option the
component had.

What unblocked it was not a new decision but an existing one nobody had wired
through. `composition.ts` already fixes the remedy once — 
`config.personal ? 'repair-the-key' : 'reconnect'` — under the comment *"Fixed
here so that no failure path has to work it out."* It was handed to the MCP
adapter and never to the presentation layer. The change exposes it on `App` and
moves the expression rather than copying it, so "which deployment is this" still
has exactly one answer.

**One wording correction this item carried**: it quotes the delegated remedy as
*"Connect your account again"*. That string is a test fixture
(`tests/rendering/authority-lost.test.ts`). The sentence a user reads is
*"Reconnect to continue."* (`src/domain/connection/remedy.ts:31`). The item's
argument is unaffected — it was about the absence of a target, not the wording —
but the quotation was of the wrong artifact.

**Not fixed here**: `AuthorityLost` has still never been designed, and its
danger border and background remain byte-identical to `CarriedProblem`'s, which
says something different. That is
[[two-confirmation-row-shapes-and-an-undesigned-page]] (#183) and still owed.
This change reused `BUTTON_SECONDARY` — the primitive `NotConnected` already
uses for exactly this — and introduced no new treatment, so it does not
prejudge that round.
