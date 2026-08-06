# Proposal: The Last Two Surfaces That Assume A Binding

## Why

`bound-and-on-duty-are-claims-the-payload-must-back` rendered `binding.state` on
the two surfaces the backlog item named — the roster row and `/agents/[id]` —
and left two others still describing the binding as though it were `BOUND`.
Its own author filed the remainder rather than letting it pass silently.

`agent-edit.tsx` still carries, in two places, the sentence `/agents/[id]` used
to carry:

- **"Not editable here"** sends an operator to edit a strategy that an
  `ORPHANED` binding says cannot be read.
- **The reactivate confirmation** reads *"It returns to your roster bound to X
  at revision N"* — and this is the pointed one. `Volatilis`, the agent all of
  this was found on, is **ARCHIVED and ORPHANED**: its reactivate page is
  exactly the page an operator would open, and the word "bound" is in the
  sentence.

## What Changes

Both sentences render through `BindingSummary` and `BindingInheritance` — the
components the previous change built for precisely this, so the four surfaces
that describe a binding cannot drift apart again.

The reactivate copy is restructured rather than patched: what it returns *with*
(the configuration it had when archived, and the slot it takes) is a fact about
reactivation and stays; what it returns *bound to* is a claim about the binding
and moves to the component that tells the truth about it.

## Why No Delta Spec

`An Agent's Binding State Is Stated Wherever The Binding Is Described` was
ADDED hours ago and already binds these two surfaces — "wherever" is the whole
force of it. Nothing is added, modified or removed; two surfaces that were
already in scope are brought into compliance. The same reasoning
`the-exposure-panel-explains-itself` used earlier today, for the same kind of
remainder.

## Capabilities

None modified. The behaviour contract is unchanged.
