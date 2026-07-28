# Design: Close The Reachability Gap

## Technical Approach

Two defects, one cause. The interface offers things the application cannot
serve, in two ways: a link to a route nobody built, and a form bound to nothing.
Both were invisible to every check because every check enumerated what the
application *contains* and asked whether it worked. Neither started from what
the user is shown.

So the work is in three parts, and the third is the one that matters in a year.
Build the five routes. Bind the four forms. Then write the guard that compares
the two lists — offered against servable — so that the sixth instance fails a
build instead of reaching someone's screen.

The routes come first because the guard cannot be turned on until they exist;
the guard would fail on the very defects it is being added to catch. That
ordering is a hazard rather than a convenience: a guard written after the code
it green-lights has never been seen to fail. So the guard is written first
against the *current* broken tree, observed failing on all nine defects, and
only then are the defects fixed.

## Decisions

### Decision: Forms take their action as a prop
`AgentForm`, `RebindConfirm` and `PlanReview` will require an `action` prop of
type `(formData: FormData) => Promise<void>`. The page passes its own server
action in.

Chosen because it converts the failure from silent to a type error. A component
that hardcodes `action="/agents/new"` compiles, renders, and does nothing; a
component that requires an action prop cannot be used without one.

Rejected: **keeping the string action and adding a `route.ts` POST handler for
each page.** It would work, and it re-implements Server Actions by hand — losing
progressive enhancement, the automatic revalidation, and the single place the
form and its handler are typed together. Rejected: **moving the forms into
client components with `onSubmit`.** These are server-rendered pages with no
client JavaScript at all, and adding a client boundary to fix a wiring bug is a
large architectural change smuggled in as a repair.

### Decision: The guard has two halves, and both are necessary
Half one, **link resolution**: extract every path the presentation layer can
render and check each against the route tree, expanding `[id]`-style segments.

Half two, **form binding**: no `<form>` may carry a string or template literal
as its `action`, and every exported `'use server'` function must be referenced
by an `action={...}` somewhere.

Neither half implies the other. A form correctly bound to an action on a page
nobody can navigate to is unreachable; a page reachable by a link whose form
submits nowhere is useless. This project's history is a list of guards that
covered one side of something, so both are stated and both are tested.

### Decision: The guard is written before the fix and observed failing
Standard practice here now, from DL-003 of the last change: a guard that has
only ever been seen passing is a comment. This one is unusual in that the
defects it must catch are *currently present*, which makes the demonstration
free — write it, run it, watch it name all nine.

Recording the exact output in the review artifact matters more than usual,
because after the fix nobody can reproduce it without reverting nine changes.

### Decision: Reactivate is a route, not a query parameter on archive
`SetLifecycleCommand` takes `to: 'ACTIVE' | 'ARCHIVED'`, and the temptation is
`/agents/{id}/archive?to=ACTIVE`. Rejected: the confirmation copy differs, the
consequence stored with the token differs, and the page title differs. Two
consequences with one URL is how a user ends up confirming text written for the
other operation.

### Decision: Strategy archive and restore reuse the confirmation-token path
`DescribeArchiveStrategyQuery` already issues a token bound to
`('archive_strategy', strategyId)` carrying the consequence text, exactly as the
agent archive page does. The new pages follow that page as a template rather
than inventing a second confirmation shape.

Restore is different and deliberately so: `SetStrategyActiveCommand` can come
back `repair-required`, which is not an error but a state with its own way
forward. `REPAIR_REQUIRED_GUIDANCE` already exists in the domain and the page
renders it rather than a failure.

### Decision: Fork does not confirm
Forking creates a new private strategy and changes nothing that exists. It has
no blast radius, so it gets a form and a button rather than a confirmation
token. Adding one would train users to click through confirmations that carry no
consequence, which is how the confirmations that do carry one stop being read.

## Data Flow

The binding, which is the whole defect:

```
BEFORE
  <AgentForm />                       renders <form method="post" action="/agents/new">
  browser POSTs /agents/new           Next has no POST handler for a page
  page re-renders                     nothing runs, 200 returned
  export async function create()      referenced by nothing, never called

AFTER
  page:  <AgentForm action={create} />
  form:  <form action={action}>       Next serialises an action id into the form
  submit                              the action runs on the server
         -> app.createAgent.execute() -> guard sequence -> audit -> BattleGrid
```

## File Changes

- `app/(app)/agents/[id]/edit/page.tsx` (new) — the edit form over agent-owned fields
- `app/(app)/agents/[id]/reactivate/page.tsx` (new) — reactivate, its own consequence
- `app/(app)/strategies/[id]/fork/page.tsx` (new) — fork, no confirmation
- `app/(app)/strategies/[id]/archive/page.tsx` (new) — archive, confirmation token
- `app/(app)/strategies/[id]/restore/page.tsx` (new) — restore, handles `repair-required`
- `app/(app)/strategies/[id]/edit/page.tsx` (modified) — the apply server action that does not exist
- `app/(app)/agents/new/page.tsx` (modified) — pass `create` to the form
- `app/(app)/agents/[id]/page.tsx` (modified) — render the rename form, pass `rename`
- `app/(app)/agents/[id]/rebind/page.tsx` (modified) — pass `performRebind`
- `src/presentation/components/agent-form.tsx` (modified) — require `action`
- `src/presentation/components/rebind-confirm.tsx` (modified) — require `action`
- `src/presentation/components/plan-review.tsx` (modified) — require `action`
- `tests/architecture/reachability.test.ts` (new) — both halves of the guard
