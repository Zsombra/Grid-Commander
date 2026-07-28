# UI/UX Review: wire-the-app

Against `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`.

## Scope

Ten route files. The components they render were reviewed in the previous two
changes; this reviews the routes and the one new surface, `NotConnected`.

## Checklist Matrix

| Rule | Where | Evidence |
|---|---|---|
| Components do not fetch data | all routes | Server components call use cases; no component takes a port |
| Routes do not branch on domain state | all routes | The only branch is `not-connected`, and `unreadable` vs `empty`, both decided one layer down |
| Empty distinguished from broken | `agents/page.tsx`, `agents/[id]/page.tsx` | `unreadable` renders an alert; `empty` renders the invitation |
| Consequence before a destructive action | `agents/[id]/rebind`, `agents/[id]/archive` | Both render the stored consequence text and a named confirm control |
| The confirm control names the consequence | `archive/page.tsx` | "Archive Volatilis and free its slot", not "Confirm" |
| The cancel path is named | both | "Leave it active" / "Keep it bound to X" |
| One not-connected surface | `require-connection.tsx` | Every reason lands here with the same message — design W-C |
| Capacity explained before the form | `agents/new/page.tsx` | At-capacity replaces the form entirely rather than rejecting a submission |
| No form without a catalog | `agents/new/page.tsx` | An unreadable catalog explains itself; it does not render a form certain to fail |
| Consent copy is honest | `connect/page.tsx` | Renders `DescribeGrantQuery`, which cannot say read-only |

## Findings

**F-1 — the rebind route needs a strategy id and there is no strategy browser.**
`author-strategies` has not been built, so `/agents/[id]/rebind` accepts the
target as a query parameter and says plainly that browsing is not built yet.
Honest placeholder rather than a dead link; it disappears when change 3 lands.

**F-2 — the agent edit form is not built.** The detail page shows what is
agent-owned and what is inherited, and `UpdateAgentCommand` is wired and tested,
but there is no form bound to it beyond the rename action. Filed as
`agent-edit-form`. The behaviour is delivered and covered; the surface is
partial, and saying so is better than ticking it.

## Status

EVIDENCE RECORDED
