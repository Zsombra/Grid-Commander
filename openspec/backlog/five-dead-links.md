---
id: five-dead-links
title: The UI renders five links to routes that do not exist
type: bug
status: open
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [reachability, routing, spec-violation]
---

# The UI renders five links to routes that do not exist

## What

Probed against the built and served application:

| Link the UI renders | Rendered by | Status |
|---|---|---|
| `/agents/{id}/edit` | `agent-actions.tsx:20` | **404** |
| `/agents/{id}/reactivate` | `agent-actions.tsx:29` | **404** |
| `/strategies/{id}/fork` | `strategy-list.tsx:74` | **404** |
| `/strategies/{id}/archive` | `strategy-list.tsx:81` | **404** |
| `/strategies/{id}/restore` | `strategy-list.tsx:88` | **404** |

Every one of these is offered to the user by an affordance that the code
computes deliberately — `isEditable(agent)`, `isReactivatable(agent)`, and the
strategy list's own permission checks. The product decides the user is allowed
to do the thing, renders the link, and then 404s.

The use cases behind all five exist, are tested, and are wired into the
composition root: `UpdateAgentCommand`, `SetLifecycleCommand` (which only ever
receives `to: 'ARCHIVED'` from the one page that calls it),
`ForkStrategyCommand`, `DescribeArchiveStrategyQuery`, `SetStrategyActiveCommand`.

## Why it matters

**It is a spec violation in an archived capability.** `app-access` requires:

> #### Scenario: Authoring agents
> - **WHEN** a user wants to view, create, edit, rebind, archive or reactivate
>   an agent, or read its journal
> - **THEN** each is reachable

Edit and reactivate are not reachable. That requirement passed a production
gate and was archived twice — once in `wire-the-app`, once again in
`prove-it-runs`, where it was MODIFIED and re-verified.

## How it survived

The fourth instance of this project's recurring pattern: a check that covers
something adjacent to the thing it is trusted for.

- `wire-the-app` found that use cases existed with no routes and fixed it. It
  did not check that the routes the UI *links to* are the routes that exist.
- `prove-it-runs` added `next build`, which compiles the routes that exist. A
  link to a route that does not exist is a string; webpack has no opinion on it.
- The served probe in that change requested seven routes, all of which it took
  from the route directory — the same source as the build. It never asked what
  the UI links to.

Every check derived its list from the routes that exist. None derived it from
the links the product renders. The two lists were never compared, which is
exactly the comparison "every capability is reachable" means.

## Fix

Two halves, and the second matters more than the first.

1. **Build the five routes.** All five use cases are already wired, so these are
   pages, server actions, and confirmation flows — not new behaviour. Archive
   and restore need the confirmation-token path the agent archive page already
   demonstrates.

2. **Make the comparison a check.** Extract every `href` the presentation layer
   can emit and assert each resolves to a route under `app/`. A static test can
   do it for literal paths; the templated ones (`/agents/${id}/edit`) need the
   pattern compared against the route tree rather than the string. Without this,
   the sixth link nobody built is invisible again.

Do not fix this by removing the affordances. The capabilities are real and
tested; what is missing is the page.
