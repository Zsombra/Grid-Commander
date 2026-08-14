---
id: the-create-action-ignores-three-of-its-five-outcomes
title: The create action reads only `created` — invalid, at-capacity and no-catalog vanish
type: risk
status: open
priority: p3
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: agent-authoring
github: "245"
blocked_by: []
tags: [server-actions, refusals, operator-facing]
---

# The create action reads only `created`

## What

`create` in `app/(app)/agents/new/page.tsx` ends with:

```ts
if (result.kind === 'created') redirect(`/agents/${result.agent.id}`);
```

`CreateAgentResult` has four other-than-created arms today (`at-capacity`,
`invalid`, `no-catalog` — and `duplicate` once
`a-duplicate-create-returns-the-original` lands). Three of them fall off the
end of the action: the server action returns undefined, the page re-renders
unchanged, and the operator's press appears to have done nothing. That is the
exact shape "The Outcome Of A Write Reaches The Person Who Asked For It" was
written against, and the same class as `three-actions-silence-their-refusals`
(done) — this action was not among the three because it *does* read the result
once, which is all `write-results.test.ts` can see.

## Why it matters

p3, not p2: the arms are reachable mostly by race. The page refuses to render
the form at capacity or without a catalog, so a swallowed refusal needs the
state to move between render and submit (a slot filled from another tab, the
catalog moving under a long-open form, HTML validation bypassed). Nothing is
lost on the platform and no crash is shown — but a press that silently does
nothing teaches the operator the product ignores them.

## Evidence

- `app/(app)/agents/new/page.tsx:148` — the single-arm read.
- `agent-form.tsx` can render `issues` (line 84) and nothing passes them from
  this action; the prop is exercised by other surfaces only.
- Found while proposing `a-duplicate-create-returns-the-original` (#239),
  which deliberately adds only the `duplicate` arm and leaves these three —
  bundling them would have widened a p1 fix with a race-reachable p3.

## Notes

The fix shape exists in-house: bounce with the values carried
(`agents/[id]/edit` carries every submitted field) or re-render with `issues`.
Whoever picks this up should also teach `write-results.test.ts` — or a sibling
— that "reads the result" is not "reads every arm the union carries"; that gap
is how this one hid, and it is the synonym-mutation lens from the 2026-08-14
journal applied to a result union instead of a spelling.
