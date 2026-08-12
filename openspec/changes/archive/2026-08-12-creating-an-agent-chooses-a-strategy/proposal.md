# Proposal: Creating An Agent Chooses A Strategy

## Why

`create` requires `strategyId` (`app/(app)/agents/new/page.tsx:79`) and
`AgentForm` renders no strategy control at all — not a hidden input, not a
select; the word does not appear in the file. `requiredText` throws when the
field is absent, so **every submission of the new-agent form has always thrown
`FormError` before reaching the use case**, and with no error boundary in the
product that arrives as a framework error page. Agent creation is the entry
point, advertised on the roster as "Create an agent — N slots remaining", and
it cannot succeed. Filed as #177, found by
`a-form-sends-what-its-action-reads.test.ts` on the day that guard was written.

The value was never obtainable from what the form is given: `Catalog` carries
models, brain presets, position presets, bounds and defaults — no strategies.
So this is not a missing input to re-add. The form has to ask a question it
has never asked.

## What Changes

- `/agents/new` reads the strategy list alongside the catalog and passes it to
  `AgentForm`.
- **`AgentForm` gains a required strategy control**, offering what
  `list_strategies` returns — BattleGrid's own catalog and the user's private
  ones, which is exactly the set an agent may bind to.
- **Nothing is preselected.** Every other choice on this form either has a
  platform-declared default or is refused a default deliberately (the six
  money fields). A strategy is the agent's whole reasoning; picking one on the
  user's behalf would bind their money to a policy they did not read.
- **No strategies, or an unreadable list, means no form** — the treatment the
  page already gives an unreadable catalog, and for the identical reason
  stated in its own comment: "an unreadable catalog means no form, rather than
  a form whose submission is certain to fail". An empty list is its own case:
  `list_strategies` returns the platform's visible catalog too, so nothing at
  all means there is nothing to bind to and nothing to fork from either.
- The scope of the spec's existing "A Field Offered Reaches The Operation It
  Configures" is widened to its converse: today it forbids a control the
  operation never reads; it now also forbids a value the operation requires
  that no control supplies. The defect this change fixes is that missing half.

## Capabilities

**New**: none
**Modified**: `agent-authoring` — one requirement gains the converse
direction, and one new requirement states what creating an agent must ask.

## Out of Scope

- **Editing an agent's strategy.** Rebinding already exists as its own
  ceremony, with its own confirmation and consequence, precisely because
  changing a binding is destructive. Creation is not rebinding and gets no
  ceremony.
- **Filtering or ranking the offered strategies.** Which strategies suit an
  agent is a judgement this product has no basis for; the list is offered as
  the platform returns it.
- **The fork-first flow** — offering to copy a BattleGrid strategy from inside
  the create form. An agent may bind to a SYSTEM strategy directly, so this is
  a convenience, not a requirement. Filed if wanted.
- **#175** (revocation framing) and **#162** (typed values lost on refusal),
  which touch the same pages but are separate defects.

## Impact

- `app/(app)/agents/new/page.tsx` — reads strategies; branches on empty and
  unreadable
- `src/presentation/components/agent-form.tsx` — the control
- `openspec/specs/agent-authoring/spec.md` — on archive
- `tests/architecture/a-form-sends-what-its-action-reads.test.ts` — the
  `KNOWN_UNSENDABLE` ledger row for `create::strategyId` is deleted, which its
  own stale-row assertion requires once the form sends the field
- Surface manifests: `/agents/new` has none today; not added here
