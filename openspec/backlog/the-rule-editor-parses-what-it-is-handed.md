---
id: the-rule-editor-parses-what-it-is-handed
title: The rule editor trusts its query params — NaN allocation rides to the describe
type: question
status: open
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: strategy-authoring
github: "169"
blocked_by: []
tags: [ui, validation]
---

# The rule editor parses what it is handed

## What

Three related findings on `/strategies/[id]/rules/[signalId]`:

1. The `a` (allocation) query param goes into `Number.parseInt` with no
   validation — `?a=banana` sends `NaN` into `describeRetune`, relying on the
   describe to refuse it downstream.
2. A dead ternary in the cannot-retune reason: the `not-a-rule || no-op` arm
   and the fallback arm are both `described.reason` — harmless redundancy.
3. When the signal's parameter contract is unreadable, the form omits param
   inputs and the compiled intent carries `ruleParams: undefined` — whether
   the perform then *preserves* the rule's stored params or clears them is
   decided in the use case, invisible on this page. Worth a spec-side glance:
   the strategy-authoring spec should say which it is.

## Why it matters

p3: the platform refuses garbage, so nothing corrupts — but a NaN riding to a
describe produces the platform's error wording for a mistake this product
could name precisely, and (3) is a genuine unknown about a write's semantics.

## Evidence

`app/(app)/strategies/[id]/rules/[signalId]/page.tsx` — found by the
2026-08-12 ceremony survey (`strategy-rule-editor` manifest, 12 components).

## Notes

(3) is the part that would settle-or-escalate: read the use case, and if
`ruleParams: undefined` clears stored params on the platform, this is not a
p3. The unreadable-date precedent on `/recorder/trim` shows the decided shape
for (1): parse, and render a rejected-input state naming the value.
