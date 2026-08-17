---
id: ten-refusals-still-wear-the-neutral-border
title: Ten ceremony problem banners still wear the neutral border DT-0004 retired
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: the-refusals-dress-alike
capability: app-access
github: "156"
blocked_by: []
tags: [ui, design, tokens, sweep]
---

# Ten refusals still wear the neutral border

## What

DT-0004 ruled that a bounced write's `?problem=` banner wears the danger
role behind a semibold "Refused:" prefix, and DT-0007/the pending fix
carried it to `/pending`. Eleven ceremony pages still render theirs in the
neutral `border-border-default` box: agent deploy, rebind, reactivate,
undeploy; strategy archive, restore, fork, conditions/save, rules (twice), recorder trim.
`agent-edit.tsx` is the eleventh, with a nuance: its `problem` prop mixes
bounced writes with the product's own catalog advisory, so it takes the
danger role without the prefix.

## Why it matters

A refusal that renders like a neutral card is skimmable past — the exact
failure DT-0004 named. Eleven copies of the retired treatment is eleven
pages that disagree with the archive and pending pages about what a
bounced write looks like.

## First step

A mechanical lite change executing DT-0004's decided treatment — the same
precedent-sweep shape as #155.

## Closed same-day — the sweep ran

`the-refusals-dress-alike` (lite, archived): twelve instances, not ten —
recorder trim and agent-edit.tsx joined the count. Eleven page banners
took DT-0004's exact treatment; agent-edit took danger without the prefix
(its problem prop also carries the product's own catalog advisory). Grep
gate clean; full local CI green.
