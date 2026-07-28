---
id: form-inputs-ignore-dark-mode
title: Text inputs stay white in dark mode
type: bug
status: open
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [ui, dark-mode, forms]
---

# Text inputs stay white in dark mode

## What

Every `<input>` in the product is styled `w-full rounded border p-2` — stock
Tailwind utilities with no token behind them. `border` resolves to Tailwind's
default grey and the background is left at the browser default, which is white.

In dark mode the result is a white box with dark text on a near-black page,
next to correctly themed panels.

## Why it matters

It is not a contrast failure — the text inside stays legible. It is worse in a
quieter way: the surrounding surfaces *are* themed, so the input reads as an
element that does not belong to the page, or as one in some other state. On the
strategy editor, where a themed panel sits directly above an unthemed textarea,
it looks like the panel is disabled.

This is also the visible edge of a larger thing: `tailwind-classes-with-no-tailwind`
closed by making the 213 utility classes real, and DT-0001 generated tokens for
colour roles. Neither pass touched form controls, so they are the one family of
elements still styled by defaults.

## Evidence

Found 2026-07-28 while rendering the assistant disclosure in both colour schemes
for `disclose-the-assistant-model` — the disclosure itself was correct in both,
and the input beneath it was white on black.

`docs/merge/proof/assistant-disclosure-dark.png` — visible directly beneath the
disclosure block.

Same markup in `app/(app)/assistant/page.tsx`, and in the agent, strategy and
rebind forms under `src/presentation/components/`.

## Fix

A design ticket against the form primitives rather than a per-page edit: one
input treatment, using `bg-bg-raised`, `border-border-default` and
`text-text-primary`, plus the focus token that already exists in `system.json`
and is currently used by nothing.

Worth doing as part of the first design pass over a form-carrying surface —
`agent-roster` or the assistant — rather than alone, since the same ticket
should also settle the button and label treatments those pages leave to
defaults.
