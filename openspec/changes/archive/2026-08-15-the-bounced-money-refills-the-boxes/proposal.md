# Proposal: The Bounced Money Refills The Boxes

## Why

On `/agents/[id]/edit`, a refusal bounce restores the typed name and the
twelve position-management values, but the six money boxes re-render from the
agent's stored `tradingConfig` — the typed money values ride the bounce and
nothing reads them back into the form. These are the fields where a
silently-reverted value costs real dollars if the operator does not notice the
box no longer says what they typed, and every box carries `required`, so it is
never empty — just wrong. The behavior is already mandated:
`agent-authoring`'s **A Refused Edit Keeps What Was Composed** says the form
MUST NOT be re-rendered from the entity's stored values, and its bounce
scenario says the submitted values arrive with the person. The implementation
nonconforms for exactly the money group, and the pin that closed the parent
defect (#162) asserted only `displayName` survival — which is how the half
stayed invisible. Backlog item `the-edit-bounce-carries-money-nothing-refills`
(#260) carries the evidence.

## What Changes

- `AgentEditForm` prefers the bounced composition over storage when prefilling
  `MoneyLimits`, for all six undefaultable fields (`tradingMode` plus the five
  USD caps).
- The merge reads both spellings the bounce can carry: bare names (the GET
  review branch bounces the form's own query) and `tc.`-prefixed names (the
  apply action's `backTo` carries the confirm form's hidden inputs).
- The existing requirement gains a scenario naming the money boxes, so the
  spec states the case whose absence let the defect survive its parent's
  closure.
- The rendering pin asserts on `values` (props), not `text`, with a typed
  money value that differs from storage — for both bounce spellings.
- The `agent-edit` surface manifest is re-surveyed after the change — this
  change stales it (design-contract §8; the #259 lesson: re-pinning is this
  round's last task, not the next round's surprise).

## Capabilities

**New**: none
**Modified**: `agent-authoring` — the requirement **A Refused Edit Keeps What
Was Composed** gains a money-box scenario; its statement is unchanged.

## Out of Scope

- The scanner blind spot for unexported server actions
  (`three-actions-live-outside-the-form-field-cross-check`, #263) — separate
  item, stays open.
- The create form's missing surface manifest
  (`the-new-agent-form-has-no-surface`, #250) — the create side's money wiring
  already works (#245); its manifest gap is that item's.
- Any change to `applyEdit`'s `backTo` or the confirm form's `tc.*` transport —
  the values already travel; only the re-render ignores them.
- Normalising the two spellings at the page level. The merge lives in the
  component so the page stays a thin route; see design note in tasks.

## Impact

- `src/presentation/components/agent-edit.tsx` — the one production file
  touched (the `MoneyLimits` call in `AgentEditForm`).
- `src/presentation/form.ts` — imported for `MONEY_FIELDS`; unchanged.
- `tests/rendering/binding.test.ts` — the "a refused edit keeps what was
  entered" describe gains the money pins.
- `openspec/design/surfaces/agent-edit.json` — re-pinned by the re-survey,
  with its four defect-recording prose passages rewritten to the new truth.
- `openspec/design/surfaces/agent-reactivate-confirm.json` — also re-pinned:
  it shares `agent-edit.tsx` (ReactivatePrompt lives in the same file), so
  the edit staled it too; its prose describes only ReactivatePrompt, which
  this change does not touch.
- No BattleGrid write path, no scope change, no schema change.
