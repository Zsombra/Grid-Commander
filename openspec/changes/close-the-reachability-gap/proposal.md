# Proposal: Close The Reachability Gap

## Why

The product can connect a BattleGrid account and archive an agent. It cannot
create an agent, rename one, rebind one, or apply a strategy change — the whole
authoring surface. Five links it renders return 404, and four of its six write
paths post into a void.

None of this is missing behaviour. Every use case is written, tested, audited
and wired into the composition root. What is missing is the connection between
what the interface offers and what the application can serve.

`app-access` already requires that *"each behaviour delivered by a capability of
this product SHALL be reachable by a user through the interface"*. That
requirement has passed a production gate three times over this code — most
recently this morning, when I MODIFIED it and re-verified it.

It kept passing because every check derived its list from the routes that
**exist**: the build compiles them, the served probe requests them, the wiring
audit traces them. No check ever started from what the interface **offers**. A
link to a route nobody built is a string, and a form that renders perfectly and
submits nowhere is indistinguishable from a working one unless you press it.

## What Changes

- **Five routes that the interface already links to.** Agent edit and
  reactivate; strategy fork, archive and restore. All five affordances are
  already rendered, gated by deliberate permission checks, and all five 404.
- **Four form bindings.** Create, rename, rebind and apply-plan submit via
  `method="post"` with a string action, which does not invoke a Server Action.
  Forms take their action as a prop so that a missing binding is a type error.
- **The apply action for the strategy pipeline**, which does not exist at all —
  `plan-review.tsx` renders an Apply button with nothing behind it.
- **A guard that measures reachability from the interface.** Two halves: every
  link the presentation layer can render resolves to a route; every form is
  bound to a function, and every `'use server'` export is referenced by one.
- **BREAKING (internal):** `AgentForm`, `RebindConfirm` and `PlanReview` gain a
  required `action` prop. No external contract changes.

## Capabilities

**New**: none

**Modified**: `app-access` — reachability is redefined to be measured from what
the interface offers rather than from the route table, and the two ways this
product broke it become requirements of their own.

## Out of Scope

- **The agent edit form's full field set.** This change makes `/agents/{id}/edit`
  exist and bind correctly, over the agent-owned fields the domain already
  validates. The trading-config section driven by the live catalog stays in
  `agent-edit-form`, which remains open.
- **The strategy section editor.** `strategy-section-editor` is untouched; the
  edit page continues to compose a tagline. This change makes *applying* the
  resulting plan work, not composing a richer one.
- **Strategy browsing for rebind.** `/agents/{id}/rebind` still requires a
  strategy id in the query string. Making it a picker is separate work.
- **Styling.** No visual design, no tokens, no Tailwind. The new pages match the
  plainness of the existing ones so the design survey sees one consistent
  surface.
- **Proving a real round trip against BattleGrid.** See the ceiling below.

## The honest ceiling

This change can prove that a form is bound to its action, that the action runs,
and that the request reaches the use case. It **cannot** prove that a user
successfully created an agent on BattleGrid, because that needs a live OAuth
consent in a browser — a human clicking approve. That is `prove-token-lifetimes`,
open since the first change.

Given that this session has been a sequence of "it looked verified and was not",
the limit is stated here rather than discovered later. The claim this change is
entitled to make is: **the wiring is correct, and the guard catches it breaking.**

## Impact

- **Code**: 5 new routes under `app/(app)/`, 4 components gaining an `action`
  prop, 1 new server action, `strategy-list.tsx` and `agent-actions.tsx`
  unchanged in behaviour
- **Tests**: a new structural suite; existing suites unaffected
- **Data**: none — no schema change, no migration
- **CI**: none — the guard runs inside `npm test`
- **Consumers**: none
