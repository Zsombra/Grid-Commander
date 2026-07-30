---
id: tailwind-classes-with-no-tailwind
title: 213 Tailwind class names, and no Tailwind
type: bug
status: done
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [ui, styling]
---

# 213 Tailwind class names, and no Tailwind

## What

Every page and component in this product is written with Tailwind utility
classes — `mx-auto max-w-2xl space-y-6 p-6`, `text-xl font-medium`, 213
`className` occurrences across `app/` and `src/presentation/`.

Tailwind is not a dependency. There is no `tailwind.config`, no
`postcss.config`, and no stylesheet of any kind in the repository. Not one of
those classes resolves to a rule.

Found once the application could be built and served for the first time
(`prove-it-runs`). Until then nothing rendered, so nothing was unstyled.

## Why it matters

The product serves. Every page returns 200 and says the right words, in the
browser's default styles: black Times New Roman on white, full bleed, no
spacing. It is legible and it is not what any of this markup describes.

The subtler cost is that the code reads as though the styling question has been
answered. A reader — human or agent — seeing `max-w-2xl space-y-6 p-6` on every
page concludes the layout is decided and moves on. The classes are a description
of an intended design that nothing implements.

## Fix

Two decisions, and they are not the same one.

1. **Whether Tailwind.** Install it and these classes light up as written, which
   is the cheapest path and pre-commits the design agent to a utility vocabulary
   it did not choose.
2. **What the design is.** `openspec/design/system.json` is still
   `status: placeholder`. The honest order is `/surface` to survey what exists,
   then `/design` to own the tokens, then a change that implements the tickets.

Do not resolve this by deleting the classes. They are the best surviving record
of the layout each page intended, and the surveyor should read them.

## Resolved (2026-07-28)

Closed by DT-0001, which installed and configured Tailwind alongside the token
generator. Verified rather than assumed: `tailwind.config.mjs` and
`postcss.config.mjs` exist, `app/globals.css` carries the `@tailwind`
directives, and the CSS `next build` emits contains the utilities themselves
(`max-w-2xl`, `space-y-6`) rather than only their names in the markup.

The config uses `extend` rather than a replacement theme, deliberately: 28
components use stock utilities like `p-3` and `text-sm`, and a replacement theme
would have deleted them while the class names stayed in the markup — the same
bug this item describes, reintroduced from the other direction.
