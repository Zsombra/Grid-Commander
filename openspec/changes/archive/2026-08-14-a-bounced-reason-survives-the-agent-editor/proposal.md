# Proposal: A bounced reason survives the agent editor

## Why

The agent editor is the product's one remaining page that renders refusals its
own way — and the derived scan built for #240 measured what that costs
(backlog item `the-agent-editor-reads-a-refusal-its-own-way`, #255, the
board's sharpest p2). Of its seven render branches, a bounced `?problem=`
reaches only the compose branch; the roster-unreadable, no-such-agent,
no-catalog and confirm branches drop it outright, and the unresolvable-preset
and describe-refused branches **replace** it with their own fresher sentence.
The banner it does render is hand-rolled (`{problem && <p…}`) — a spelling
that also evades the product-wide one-banner guard, whose matcher covers only
the ternary form. The page is the scan's only `KNOWN_SILENT` ledger row.

## What Changes

- Every one of the edit page's seven branches mounts the shared
  `CarriedProblem` for the bounced reason, unconditionally (the component
  renders nothing when there is no problem).
- A branch that forms a refusal of its own (unresolvable preset, refused
  describe) renders **both** facts: the bounced reason at page level, its own
  refusal beside the fields it refused — matching `/pending/[id]`, where the
  Shell carries the bounce and the branch carries its own state.
- `AgentEditForm`'s hand-rolled banner is replaced by the shared
  `CarriedProblem`; its `problem` prop narrows to branch-local refusals only
  (the page stops passing the bounced reason into the form, which is what
  makes the reconciliation safe from double-rendering).
- The `KNOWN_SILENT` ledger row is deleted — the scan's stale-row direction
  enforces this the moment the page starts carrying.
- The `HAND_ROLLED` matcher (both copies in
  `tests/agent/refusals-reach-the-operator.test.ts`) widens to the `&&`
  spelling, in this change and not separately — the 2026-08-14 (roads)
  journal entry pins that ordering, because widening first would fail the
  ledger row's recorded verdict while it still stands.
- The edit page joins the `CARRY_PROBLEM` pinned list — loud and cheap,
  beside the derived scan that now carries the rule alone.

## Capabilities

**New**: none
**Modified**: `app-access` — "A Refused Confirmation Reaches The Person Who
Spent It" gains a scenario: a fresher refusal does not replace a carried one.

## Out of Scope

- The other stale-surface work — `agent-edit`'s surface manifest re-pin
  belongs to `the-design-round-staled-what-it-designed-against` (#259),
  already filed, and is deliberately run *after* this change so the re-pin
  captures these edits.
- Any change to `applyEdit`'s bounce composition (what rides back in the URL)
  — the carry mechanics are correct and tested; only the rendering side was
  defective.
- Restyling `CarriedProblem` or revisiting DT-0004's "named as well as
  tinted" ruling — the component is used as it is.
- The `AgentEditForm` not-editable branch's status explanation (archived /
  platform-locked) — that is a status, not a refusal, and keeps its own
  rendering.

## Impact

- `app/(app)/agents/[id]/edit/page.tsx` — seven branches mount the shared
  banner; compose branch stops forwarding the bounced reason into the form.
- `src/presentation/components/agent-edit.tsx` — hand-rolled banner replaced
  with `CarriedProblem`; prop contract re-documented.
- `tests/agent/refusals-reach-the-operator.test.ts` — matcher widened (both
  copies), edit page pinned.
- `tests/architecture/a-problem-redirect-is-read-where-it-lands.test.ts` —
  `KNOWN_SILENT` becomes empty.
- `tests/rendering/binding.test.ts` (or a sibling) — a rendering test proving
  both facts render together on a branch that forms its own refusal.
