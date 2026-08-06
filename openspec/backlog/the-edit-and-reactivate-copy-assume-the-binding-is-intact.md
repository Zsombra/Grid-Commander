---
id: the-edit-and-reactivate-copy-assume-the-binding-is-intact
title: Two more surfaces describe a binding without reading its state
type: bug
status: done
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: the-last-two-surfaces-that-assume-a-binding
capability: agent-understanding
blocked_by: []
tags: [battlegrid, binding, false-claim, deferred]
---

# The edit and reactivate copy still assume the binding is intact

`bound-and-on-duty-are-claims-the-payload-must-back` rendered `binding.state` on
the two surfaces `an-orphaned-agent-is-shown-as-bound` named — the roster row
and `/agents/[id]` — and left two others describing the binding as though it
were `BOUND`.

## What

`src/presentation/components/agent-edit.tsx:156`, under "Not editable here":

```tsx
Context sources, signal rules, prose and timeframe are inherited from{' '}
{agent.binding.strategyName}. They change by editing that strategy, or by
rebinding — which replaces all of them.
```

and `:356`, the reactivate confirmation:

```tsx
It returns to your roster bound to {agent.binding.strategyName} at revision{' '}
{agent.binding.strategyRevision}, with the configuration it had when it was
archived.
```

Both are the sentence `/agents/[id]` used to carry, and both send an operator to
edit a strategy that an `ORPHANED` binding says cannot be read. The second is
the more pointed of the two: the archived agent this was all found on
(`Volatilis`, second account, 2026-08-06) is exactly the agent whose reactivate
page an operator would open, and the word "bound" is in the sentence.

## Why it matters

p3 rather than p2 because neither is the surface an operator reads to understand
what they own — one is behind an edit form for an agent that must be ACTIVE to
edit, and the other is a confirmation. Nothing acts on the claim. It is still
the same false claim, now in the two places the fix did not reach, which is how
a defect comes back.

## Evidence

`src/presentation/components/agent-edit.tsx:156` and `:356`.
`src/presentation/components/binding.tsx` holds `BindingSummary` and
`BindingInheritance`, written for exactly this — both call sites are a component
swap, not new copy.

## Notes

The reactivate sentence needs its own wording rather than `BindingInheritance`:
it is about what happens *next*, not about where configuration came from. What
an `ORPHANED` agent returns to the roster as is not established, so that copy
should say what it can see and stop — the same restraint the change applied
everywhere else.
