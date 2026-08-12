---
id: creating-an-agent-cannot-choose-a-strategy
title: The new-agent form has no strategy control, so every create throws before it reaches the platform
type: bug
status: open
priority: p1
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: agent-authoring
github: "177"
blocked_by: []
tags: [dead-write-path, forms, agent-authoring]
---

# Creating an agent cannot choose a strategy

## What

`create` requires a strategy — `strategyId: requiredText(formData, 'strategyId')`
(`app/(app)/agents/new/page.tsx:79`) — and `AgentForm`
(`src/presentation/components/agent-form.tsx`) renders **no strategy control
of any kind**. Not a hidden input, not a select; the word "strategy" does not
appear in the file. `requiredText` throws `FormError` when the field is
absent, so **every submission of the new-agent form throws before the use
case is reached**, and with no error boundary in the product that arrives as
a framework error page.

This is not the same defect as the rebind one found the same day. There the
form simply omitted an id it already had, and the fix was one hidden input.
Here the value is a *choice* — which strategy the new agent reads and reasons
with — and the form was never built to ask it.

## Why it matters

p1: agent creation is the product's entry point, it is advertised on the
roster ("Create an agent — N slots remaining"), and it cannot succeed. The
platform requires the binding too (`create_intelligence_agent` declares
`strategyId` REQUIRED), so there is no version of this that works without
asking.

## Evidence

- `app/(app)/agents/new/page.tsx:79` — the requirement.
- `src/presentation/components/agent-form.tsx` — `grep -n strategy` returns
  nothing.
- `app/(app)/agents/new/page.tsx:54` — the page passes only
  `catalog={catalog.catalog}` and `action={create}`; no strategy is threaded
  in.
- Found 2026-08-12 by `tests/architecture/a-form-sends-what-its-action-reads.test.ts`
  on the day that guard was written, and recorded in its `KNOWN_UNSENDABLE`
  ledger so the suite states the defect rather than hiding it.

## Notes

**Needs a proposal, not a patch.** A chooser is behaviour: which strategies
are offered (the catalog read already fetched, filtered how?), what is
selected by default, what happens when the catalog is empty or unreadable,
and whether the fork-first path applies. The delta belongs in
`agent-authoring` beside the requirements that already govern binding.

The rebind sibling — `RebindConfirm` omitting `agentId` — was fixed in
`the-ceremony-pages-join-the-sweep` because it genuinely was one missing
input. Both were invisible to the test suite for the same reason: the flow
tests call use cases directly, so no test ever walked the form.
