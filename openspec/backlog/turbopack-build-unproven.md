---
id: turbopack-build-unproven
title: Only the webpack build is proven; `next dev --turbopack` is unknown
type: question
status: open
priority: p3
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [build, tooling]
---

# Only the webpack build is proven; `next dev --turbopack` is unknown

## What

The project imports with `.js` specifiers that resolve to `.ts` files — correct
under `moduleResolution: "bundler"`, and what `tsc` and vitest both do.
`prove-it-runs` makes the webpack build agree via `resolve.extensionAlias` in
`next.config.ts`.

That setting is a webpack option. Turbopack reads its own resolver
configuration, so whether `next dev --turbopack` resolves these specifiers is
not established, in either direction.

## Why it matters

Only for local development ergonomics — `next build` is what deploys, and it is
gated in CI. But a developer whose dev server cannot resolve half the imports
will reasonably conclude the repository is broken.

## Fix

Run `next dev --turbopack` and find out. If it fails, add the equivalent
`turbopack.resolveAlias` entry; if it works, say so in a comment next to the
webpack option so the next person does not wonder whether both are needed.
