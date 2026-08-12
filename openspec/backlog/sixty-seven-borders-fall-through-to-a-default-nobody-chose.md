---
id: sixty-seven-borders-fall-through-to-a-default-nobody-chose
title: 67 rounded-border boxes wear Tailwind's default grey instead of the border token
type: debt
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: app-access
github: "155"
blocked_by: []
tags: [ui, design, tokens, sweep]
---

# 67 borders fall through to a default nobody chose

## What

`grep 'className="rounded border' app src` finds 67 boxes across 20+ files
wearing bare `rounded border` — Tailwind's 4px radius and its default grey
border color, neither of which is a token. This is the exact defect
`control.ts`'s header documents on inputs ("`border` resolved to Tailwind's
default grey … so in dark mode each control was a white box beside panels
that *were* themed"), surviving product-wide on cards, message boxes and
list containers. The tokened spelling exists and is already worn by newer
surfaces: `rounded-gc-2 border border-border-default` (the proposal queue's
lists, the difference table, every role block).

## Why it matters

The default grey is not in the palette and does not follow the dark scheme
the way `border.default` does — the boxes read slightly foreign in dark
mode, and 67 copies of an untokened value is 67 places the design system
does not reach. It is p3 because nothing is illegible; it is not p4 because
every new surface copies the nearest existing box, so the count grows.

## First step

A mechanical lite change once a design ticket decides the target treatment —
DT-0008 (explorer field cards) is positioned to be that precedent. The sweep
is `rounded border` → `rounded-gc-2 border border-border-default` with
radius unified to `radius.2`, file by file, gated by the full local CI. The
existing role blocks (danger/notice/consequence/quiet) are already tokened
and are not part of the sweep.
