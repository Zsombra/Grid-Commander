# UI/UX Review — prove-it-runs

- Checklist source: `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`
- Status: `PENDING EXECUTION EVIDENCE`

## Scope Summary

**One file: `app/layout.tsx`.** No existing component, page, or route handler is
modified.

This is a UI review of a file whose entire job is to exist. App Router refuses to
build without a root layout; every route in this product has been unreachable
for that reason. What the layout must do is render the document and get out of
the way.

It is reviewed rather than waived because a root layout is the single most
tempting place in a Next.js application to establish a visual language by
accident — a font stack, a background colour, a max-width — and those decisions
belong to the design agent, who has not yet seen a surface. See DL-007.

## Component Checklist Matrix

| Rule area | Applies | What must hold | Status |
|---|:--:|---|---|
| Component structure | ✓ | Server component; no `'use client'`; no data fetching; renders `children`; no props beyond `children` | PENDING |
| Hooks design | ✗ | No hooks | N/A |
| Store design (Zustand) | ✗ | No store exists in this product | N/A |
| shadcn/ui usage | ✗ | Not installed; not introduced here | N/A |
| Tailwind | ✗ | Not installed; not introduced here | N/A |
| Consequence & confirmation | ✗ | The layout has no actions | N/A |
| Accessibility & semantics | ✓ | `<html lang>`; a document title via `metadata`; page content in a landmark | PENDING |
| Responsive layout | ✓ | No fixed widths; the layout constrains nothing about what routes render | PENDING |
| State & interaction | ✗ | No state | N/A |

## Accessibility Detail

| Check | Status | Evidence |
|---|---|---|
| `<html>` carries a `lang` | PENDING | |
| The document has a title | PENDING | via the `metadata` export |
| Page content sits in a landmark rather than a bare `<div>` | PENDING | |
| Nothing is announced that has no content | PENDING | |

## Design Boundary (DL-007)

The auditor checks this list. Any hit is a finding, not a preference.

| Must not appear in `app/layout.tsx` | Status |
|---|---|
| A colour value of any kind | PENDING |
| A spacing or sizing value | PENDING |
| A font family, size, or weight | PENDING |
| A design token reference | PENDING |
| An import from `openspec/design/` | PENDING |
| A stylesheet import | PENDING |

`openspec/design/system.json` is still `status: placeholder`. A layout that
picked values now would be settling questions ahead of the agent whose job that
is, and the values would be invisible in every future design ticket because they
would already look like the baseline.

## Route Boundary

| Check | Status | Evidence |
|---|---|---|
| `app/layout.tsx` imports nothing from `src/` | PENDING | The rule that moved `audit-list.tsx` out of `app/` in `wire-the-app` |
| The structural test enforcing the route boundary still passes | PENDING | |

## Served-Application Evidence (task 6.2)

Every capability page, requested from the built and served application by a
visitor with no connection. Each must return 200, render the not-connected
outcome, and attempt no BattleGrid call.

| Route | Status | Rendered outcome |
|---|---|---|
| `/connect` | PENDING | |
| `/agents` | PENDING | |
| `/audit` | PENDING | |
| `/strategies` | PENDING | |
| `/assistant` | PENDING | |

## Findings

_To be filled by the executor with `path:line` evidence._

## Verdict

`PENDING EXECUTION EVIDENCE`
