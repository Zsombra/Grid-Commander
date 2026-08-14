# Proposal: The Create Action Reads Every Arm

## Why

`create` in `app/(app)/agents/new/page.tsx` branches on `created` and
`duplicate` and lets the other three arms of `CreateAgentResult` —
`at-capacity`, `invalid`, `no-catalog` — fall off the end of the action. The
server action returns undefined, the page re-renders unchanged, and the
operator's press appears to have done nothing. That is the exact shape "The
Outcome Of A Write Reaches The Person Who Asked For It" was written against,
and it hid because the action *does* read the result once, which is all the
textual scan in `write-results.test.ts` can see (backlog
`the-create-action-ignores-three-of-its-five-outcomes`, #245).

## What Changes

- The create action reads every arm of its result. The three silent arms bounce
  back to `/agents/new` as `?problem=` with the reason the operation returned —
  the `at-capacity` explanation, the `no-catalog` reason, the `invalid` issues
  each naming their field — using the in-house pattern the edit action's
  `backTo` helper established (operator decision: bounce with the submitted
  values carried, not a re-render from stored state).
- The submitted values travel with the refusal, and the re-rendered form is
  prefilled from them, so a refusal naming one field does not cost the operator
  every other one. The dedupe key does **not** travel: the re-rendered form
  mints a fresh key, exactly as it does today.
- The action's tail is made exhaustive, so a future arm added to
  `CreateAgentResult` fails `typecheck` in the action rather than falling
  silently off the end again.
- `AgentForm`'s `issues` prop is removed. No caller has ever passed it — the
  bounce pattern carries reasons through `CarriedProblem` — and a prop nobody
  passes is a claim the component cannot keep.
- The test layer is taught that "reads the result" is not "reads every arm the
  union carries": the create action joins the partial-read pins in
  `tests/agent/refusals-reach-the-operator.test.ts` (the sibling that exists
  for exactly this — the textual scan cannot see partial reads), and the action
  seam in `tests/rendering/new-agent.test.ts` walks each refused arm to its
  bounce.

## Capabilities

**New**: none
**Modified**: `agent-authoring` — "The Outcome Of A Write Reaches The Person
Who Asked For It" gains the partial-read clause and scenario; "A Refused
Create Keeps What Was Composed" is ADDED as the create counterpart of the
edit's keeps-what-was-composed requirement.

## Out of Scope

- **The `duplicate` arm's wording and semantics** — landed with #239 and
  untouched here. The duplicate bounce also deliberately does not carry the
  composition: the first press already landed (or may have), so there is
  nothing the operator needs to re-enter.
- **Per-field placement of refusal reasons on the create form.** The joined
  `?problem=` sentence names each field; structured per-field placement would
  need an issue transport the house pattern does not have, and the edit form
  has the same shape without anyone wanting it there. Not filed as backlog:
  if it becomes wanted, it is wanted product-wide and should arrive as its own
  proposal, not as a note nobody prioritises.
- **The fork-name 500** (`forking-a-name-that-exists-is-a-500`, #102) — a
  separate thread, unblocked by this.

## Impact

- `app/(app)/agents/new/page.tsx` — the action gains a `backTo` helper and the
  three refusal branches; the page passes the carried query through to the form.
- `src/presentation/components/agent-form.tsx` — gains prefill from carried
  values; loses the dead `issues` prop.
- `src/presentation/components/money-limits.tsx` — untouched; its `current`
  prop already does this for the six money questions.
- `tests/agent/refusals-reach-the-operator.test.ts`,
  `tests/rendering/new-agent.test.ts` — extended as above.
- No schema, port, or use-case change. `CreateAgentCommand` already returns
  every arm this change reads.
