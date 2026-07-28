# UI/UX Review — prove-it-runs

- Checklist source: `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`
- Status: `EXECUTION EVIDENCE COMPLETE`
- Evidence window: `7f4cea3..HEAD`

## Scope Summary

**One file: `app/layout.tsx`.** No existing component, page, or route handler was
modified.

A UI review of a file whose entire job is to exist. App Router refuses to build
without a root layout, and every route in this product was unreachable for that
reason. What the layout has to do is render the document and get out of the way.

## Component Checklist Matrix

| Rule area | Applies | Status | Evidence |
|---|:--:|---|---|
| Component structure | ✓ | PASS | Server component; no `'use client'`; no data fetching; takes `children` only |
| Hooks design | ✗ | N/A | No hooks |
| Store design (Zustand) | ✗ | N/A | No store exists in this product |
| shadcn/ui usage | ✗ | N/A | Not installed; not introduced |
| Tailwind | ✗ | N/A | Not installed — see F-2 |
| Consequence & confirmation | ✗ | N/A | The layout has no actions |
| Accessibility & semantics | ✓ | PASS | See below |
| Responsive layout | ✓ | PASS | No width, no height, no breakpoint; the layout constrains nothing about what routes render |
| State & interaction | ✗ | N/A | No state |

## Accessibility Detail

| Check | Status | Evidence |
|---|---|---|
| `<html>` carries a `lang` | PASS | `lang="en"` |
| The document has a title | PASS | `metadata.title`; served pages render `<title>Grid-Commander</title>` |
| Page content sits in a landmark rather than a bare `<div>` | PASS — supplied by pages | Every page renders its own `<main>`. The layout deliberately does **not** add one |
| Nothing is announced that has no content | PASS | The layout renders `children` and nothing else |

**On the landmark.** The obvious implementation wraps `children` in `<main>`.
That would have been wrong here: all thirteen routes already open with their own
`<main>`, so every page in the product would have carried two `<main>` landmarks
and a screen-reader user would have found two "main" regions on every screen. The
layout renders `children` directly for that reason.

## Design Boundary (DL-007)

| Must not appear in `app/layout.tsx` | Status |
|---|---|
| A colour value of any kind | PASS — none |
| A spacing or sizing value | PASS — none |
| A font family, size, or weight | PASS — none |
| A design token reference | PASS — none |
| An import from `openspec/design/` | PASS — none |
| A stylesheet import | PASS — none |
| A `className` anywhere | PASS — none |

`openspec/design/system.json` is still `status: placeholder`. A layout that
picked values now would settle questions ahead of the agent whose job that is,
and those values would be invisible in every future design ticket because they
would already read as the baseline.

## Route Boundary

| Check | Status | Evidence |
|---|---|---|
| `app/layout.tsx` imports nothing from `src/` | PASS | One import: `type { ReactNode } from 'react'` |
| The structural test enforcing the route boundary still passes | PASS | `tests/architecture/**` green within the 390 |

## Served-Application Evidence (task 6.2)

Built with `npm run build`, served with `npm run start`, against a real
PostgreSQL, requested by a visitor with no session.

| Route | HTTP | Rendered |
|---|---|---|
| `/connect` | 200 | "Connect your BattleGrid account — What Grid-Commander will be able to do…" |
| `/agents` | 200 | "Not connected. You are not connected to BattleGrid. Connect your account to continue." |
| `/audit` | 200 | same |
| `/strategies` | 200 | same |
| `/assistant` | 200 | same |
| `/agents/some-id` | 200 | same |
| `/strategies/some-id/edit` | 200 | same |

Two things checked beyond the status code, because a 200 alone proves very
little:

- **No BattleGrid call was attempted.** Server log clean — zero matches for
  `mcp.battlegrid` and zero errors across all seven requests.
- **No row was written.** `audit_entries` and `connections` both still empty
  afterwards. Nothing about an unconnected visitor reached storage.

This is the `app-access` requirement that every way of lacking authority
produces one outcome, observed in a served build rather than asserted in a unit
test — five different capability pages, one identical answer.

## Findings

**F-1 — the layout must not add a landmark.** Covered above. The natural
implementation would have doubled `<main>` on every page in the product.

**F-2 — 213 Tailwind class names, and no Tailwind.** Every page and component is
written with Tailwind utilities: `mx-auto max-w-2xl space-y-6 p-6`,
`text-xl font-medium`. Tailwind is not a dependency; there is no
`tailwind.config`, no `postcss.config`, and no stylesheet in the repository.

The product serves and is legible — browser defaults, black on white, full
bleed. It is not what the markup describes. This was invisible until now for the
plainest possible reason: nothing had ever rendered.

Out of scope here, and deliberately not fixed by installing Tailwind, which
would pre-commit the design agent to a utility vocabulary it did not choose.
Filed as `tailwind-classes-with-no-tailwind` (p2). DL-013.

**F-3 — the surfaces are worth surveying now.** `openspec/design/` has no
surface manifests, and until this change there was nothing to survey. There is
now: thirteen routes that build and serve. The `/surface` → `/design` handoff has
a subject for the first time.

## Verdict

`EXECUTION EVIDENCE COMPLETE` — ready for the production gate.
