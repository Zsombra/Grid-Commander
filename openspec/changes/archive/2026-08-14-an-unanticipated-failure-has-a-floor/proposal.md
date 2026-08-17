# Proposal: An unanticipated failure has a floor

Resolves #236 (backlog: `the-app-has-no-error-boundary-anywhere`).

## Why

The app has no `error.tsx` and no `global-error.tsx` at any level, so anything
that escapes the product's deliberate refusal routes — a port raising where a
caller expected a result union, a dependency throwing on an unexpected shape, a
plain bug — reaches the operator as *"Application error: a server-side
exception has occurred."* Every *anticipated* failure in this product has a
carefully-authored sentence; the unanticipated ones have a framework page. The
item's open technical question is settled: on Next.js 15 App Router, a throw
inside a server action submitted from a form **is** caught by the nearest
`error.tsx` (redirects pass through untouched), so a boundary covers the case
that matters most here.

## What Changes

- **`app/error.tsx`** — one boundary under the root layout, covering every
  route (including the `(app)` group and its layout, whose errors bubble up to
  it). It renders the product's own words: something failed that was not
  anticipated; **nothing on this page can say whether the last action landed**;
  the activity log records every write, check it before repeating anything.
- **`app/global-error.tsx`** — the floor under the root layout itself, with its
  own `<html>`/`<body>`, same posture.
- **No retry affordance.** The boundary deliberately renders no "try again"
  control: retrying a write whose outcome is unknown is exactly the wrong
  advice, and the item names a retry-offering boundary as worse than none.
- The error `digest` (Next's opaque server-error reference) is shown so a
  report can name the failure; the raw message is not, since an unanticipated
  error's text was not written for the operator and may carry anything.

## Capabilities

**New**: none
**Modified**: `app-access` — one ADDED requirement (new concern: what renders
when nothing anticipated the failure)

## Out of Scope

- **Making any specific throw legible.** A boundary is a floor, not a route;
  known failure classes keep their authored routes (`spending()`,
  `CarriedProblem`, the refusal arms). The fork-name 500 stays its own item.
- **The create action's silent arms** — #245, unchanged.
- **Error reporting/telemetry.** Showing the digest is as far as this goes;
  wiring a reporter is a different decision with different stakes.

## Impact

- `app/error.tsx`, `app/global-error.tsx` (new; both client components, as the
  boundary contract requires)
- New rendering tests; no existing file changes expected beyond tests
- No schema, no ports, no BattleGrid surface — this change performs no
  operation and needs no scope
