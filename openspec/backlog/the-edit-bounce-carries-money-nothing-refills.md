---
id: the-edit-bounce-carries-money-nothing-refills
title: A bounced edit carries the money values home, and the boxes refill from storage
type: debt
status: done
priority: p3
created: 2026-08-14
updated: 2026-08-15
change: "the-bounced-money-refills-the-boxes"
capability: agent-authoring
github: "260"
blocked_by: []
tags: [ui, forms, refusal, money]
---

# A bounced edit carries the money values home, and the boxes refill from storage

## What

On `/agents/[id]/edit`, a refusal bounce restores the typed name and the
twelve `pm.*` values, but the six money boxes re-render from the agent's
stored `tradingConfig` — the typed money values ride the bounce and nothing
reads them back into the form.

## Evidence

- `src/presentation/components/agent-edit.tsx` — `AgentEditForm` passes
  `composed` into `PositionManagement` and prefers `entered()` for
  `displayName`, but renders `<MoneyLimits catalog={…} current={agent.tradingConfig?.fields} />`
  with no `composed` — the component's `current` prop *is* its only prefill
  input.
- `applyEdit`'s `backTo` carries every submitted field (`tc.*` included), and
  the describe/preset bounces carry the unprefixed money names in the query —
  the values arrive; they are simply never preferred over storage.
- The create form got exactly this wiring in
  `the-create-action-reads-every-arm` (#245): `/agents/new` prefills money
  through `MoneyLimits.current` from the composition. The edit form did not.
- `a-refusal-path-discards-what-was-typed` (#162) is `done`, and its landed
  note says "all three refusing sites pass it \[composed]" — true for the
  form and position sections, never wired for money. The rendering pin that
  closed #162 asserts `displayName` survival only
  (`tests/rendering/binding.test.ts`, "a refused edit keeps what was
  entered").

Found by the #259 re-survey of `agent-edit` (reading the form against its
manifest), 2026-08-14.

## Why it matters

p3: nothing is lost on the platform — but the money fields are the ones where
a silently-reverted value costs real dollars if the operator does not notice
the box no longer says what they typed. A refusal naming one field currently
costs them every money value they changed. The stakes argue for the fix; the
`required` attribute on every money box (they are never empty, just wrong)
argues it is easy to miss.

## What to do when taken

Prefer the composed values in `AgentEditForm`'s `MoneyLimits` call — the
bounce carries `tc.`-prefixed names from the apply and bare names from the
GET review, so the merge must read both spellings (or normalise in the page
the way `editIntent` already does). Pin it the way #162's fix was pinned: on
`r.values`, not `r.text`, with a typed money value that differs from storage.

## Landed 2026-08-15 — `the-bounced-money-refills-the-boxes` (archived same day)

`AgentEditForm` now merges the bounced composition over storage for
`MoneyLimits`, reading both spellings the bounce carries (bare from the GET
review's query, `tc.`-prefixed from the apply's `backTo`), with the same
per-field precedence `PositionManagement` already applied. What the pin now
asserts — deliberately more than #162's closure did: on `r.values`, not
`r.text`, a typed `maxDailyLossUsd` of `'325'` present and the stored `'300'`
absent, on **both** bounce spellings, plus a first-visit pin that storage
still prefills. Both bounce pins were run against the unfixed code first and
failed. The spec requirement gained a money-naming scenario so the group can
no longer be the unwritten half of a closure. Both surface manifests sharing
`agent-edit.tsx` (`agent-edit`, `agent-reactivate-confirm`) re-surveyed and
re-pinned at `d782154`.

## Related

- [[a-refusal-path-discards-what-was-typed]] (#162) — the parent defect;
  closed with this half unwired.
- [[the-new-agent-form-has-no-surface]] (#250) — the create-side sibling
  surface gap.
