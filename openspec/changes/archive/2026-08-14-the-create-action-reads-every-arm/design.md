# Design: The Create Action Reads Every Arm

## Technical Approach

The action gains the edit action's shape: a `backTo(problem): never` helper
that redirects to `/agents/new?problem=<sentence>&<submitted fields>`, and an
exhaustive tail over the three remaining arms. The page already mounts
`CarriedProblem` on every branch (#240's lesson), so the bounced reason renders
wherever the re-render lands — including the no-form branches, which are
exactly where an `at-capacity` or `no-catalog` bounce arrives by construction.
`AgentForm` gains a `composed` prop read from the page's query, and every
control takes its default from it; the six money questions already do this
through `MoneyLimits`' `current` prop.

## Decisions

### Decision: Bounce with the submitted values carried, not re-render with `issues`

Chosen because it is the in-house pattern (`agents/[id]/edit`'s `backTo`) and
because the operator decided it (session 2026-08-14). Rejected: re-rendering
the page in place with the `issues` prop — a server action that returns
nothing cannot re-render with props anyway without converting the flow to
`useActionState`, which would put client state where the product deliberately
has URL state; and the `?problem=` sentence names each field, so nothing the
operator needs is lost.

### Decision: The dedupe key does not ride the bounce

The re-rendered form mints a fresh key, exactly as today ("the dedupe binds a
form instance, not the operator"). All three bounced arms refuse *before*
`createAgent` is attempted, so no ledger row exists under the old key and
nothing is lost by dropping it. Carrying it would re-offer a key whose form
instance is gone — protection-shaped, protecting nothing. Next's `$ACTION_ID*`
transport fields are skipped for the same reason the edit action reads by
allowlist: framework internals are not composition.

### Decision: Exhaustiveness lives in the compiler, pins live in the tests

The action's tail narrows the union so that every arm is consumed and a future
arm added to `CreateAgentResult` is a `typecheck` failure inside the action —
the same gate `brain-with-no-model` used for a union that grew. The textual
pins in `refusals-reach-the-operator.test.ts` then hold the *spelling* of each
arm's read (that file exists because the general scan cannot see partial
reads), and the action-seam tests walk each arm to its bounce. Rejected: a
generic arms-vs-reads scanner in `write-results.test.ts` — matching union
declarations to branch spellings textually across files is a parser wearing a
regex's clothes, and the compiler already owns this question.

### Decision: Remove the dead `issues` prop

No caller has ever passed it (`AgentForm` has exactly one consumer). A prop
nobody passes is the same defect as the position-management select that was
wired to nothing — an offer the component does not keep. Rejected: wiring it
up from the URL, which would need a structured issue transport the house
pattern does not have (see Out of Scope).

## Data Flow

1. Operator submits the form; the action calls `app.createAgent.execute`.
2. `created` → redirect to the agent. `duplicate` → `?problem=` bounce,
   composition not carried (nothing to re-enter). Both as today.
3. `at-capacity` / `no-catalog` / `invalid` → `backTo(sentence)`: every
   submitted field except `idempotencyKey` and `$ACTION*` rides as query
   params alongside `problem`.
4. The page re-renders: `CarriedProblem` shows the sentence on whatever branch
   the fresh reads select; if the form branch renders, `AgentForm` prefills
   from the carried query and carries a fresh dedupe key.

## File Changes

- `app/(app)/agents/new/page.tsx` (modified) — `backTo` helper, exhaustive
  tail, query passed to the form as `composed`.
- `src/presentation/components/agent-form.tsx` (modified) — `composed` prop,
  defaults on every control, `issues` prop removed.
- `tests/agent/refusals-reach-the-operator.test.ts` (modified) — create action
  joins the partial-read pins.
- `tests/rendering/new-agent.test.ts` (modified) — each refused arm walked to
  its bounce; prefill asserted; fresh-key-on-bounce asserted.
