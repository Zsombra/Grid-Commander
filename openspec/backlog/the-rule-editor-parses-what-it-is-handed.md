---
id: the-rule-editor-parses-what-it-is-handed
title: The rule editor trusts its query params — NaN allocation rides to the describe
type: question
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-13
change: "the-round-trip-keeps-what-the-person-needs"
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

## Landed 2026-08-13 — two of three

**Fixed**: the allocation is parsed and an unusable one renders a rejected-input
state naming it, in `/recorder/trim`'s decided shape. Nothing is sent.

That needed a structural change the item did not anticipate: `a` being absent
was the page's only signal to show the composer, so a link carrying values back
skipped the form and re-ran the describe that had just refused. `edit=1` is now
that signal, and the composer prefers query values over the stored rule.

The bad allocation is deliberately **not** carried back — returning the value
that could not be read would re-fill the field with the thing to fix.

**Also fixed**: the params-not-numeric branch's "Compose it again" pointed at a
bare form while the refusal path preserved the choice. The two disagreeing was
the bug; both now build the same address through `composeAgain()`.

**Not fixed, and closing anyway**: the dead ternary in the cannot-retune reason.
Both arms read `described.reason`; it is harmless, and removing it is a tidy.
The third finding — whether `ruleParams: undefined` clears stored params —
**was answered while verifying**: `retune-rule.command.ts:50` omits the key
rather than sending a clearing value, so stored params survive. Nothing to do.
