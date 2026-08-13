---
id: two-confirmation-row-shapes-and-an-undesigned-page
title: Confirmation rows come in two shapes now, and AuthorityLost has never been designed
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: app-access
github: "183"
blocked_by: []
tags: [ui, design, coverage]
---

# Two confirmation-row shapes, and a page no ticket has seen

## What

Two things the post-round re-survey found, both consequences of the ceremony
sweep being scoped to the pages that had tickets rather than to the pattern:

1. **The action rows disagree.** DT-0016/0017/0018 gave deploy, undeploy and
   rebind the archive page's mobile treatment — stacked full-width under
   `tablet`, inline above it. `reactivate`, `recorder-trim`'s perform row and
   deploy's own *chooser* row were not in scope and still wear the flat
   `flex flex-wrap gap-3`. So the product now has two confirmation-row shapes,
   which is worse than the one it had before the sweep: previously they were
   all equally wrong, and a reader could not mistake it for a decision.

2. **`AuthorityLost` has never been designed.** It was built during
   `a-lost-authority-is-not-a-refusal` wearing existing tokens, and its danger
   border and background are byte-identical to `CarriedProblem`'s. Those two
   say very different things — "this attempt was refused, something else may
   work" versus "nothing will work until the credential is fixed" — and they
   currently look the same. `agent-deploy-confirm`, `agent-undeploy-confirm`
   and `agent-rebind-confirm` were set to `needs-redesign` for exactly this:
   each gained a state and a component no ticket covers.

## Why it matters

p3 on both counts: nothing renders wrong, and every ruling needed already
exists. The cost is that the sweep's own consistency claim is now false in
two places, and the newest surface in the product is the one nobody designed.

## Evidence

Recorded in the manifests re-pinned at `e7c56ce`: the three `needs-redesign`
statuses, the `authority-lost` component entries, and the
`current_implementation` notes naming the rows that kept `flex flex-wrap
gap-3`.

## First step

One `/design` pass: a ticket giving `AuthorityLost` a treatment that separates
it from a refusal, and a small one extending the row treatment to the three
rows the sweep missed. Both are inside decided rulings — DT-0004's roles and
the archive page's stack — so neither decides anything new.

Related: `the-authority-page-names-a-remedy-and-offers-no-target` (#182) is
the *behaviour* half of the same surface and needs a proposal, not a ticket.

---

# Ticketed 2026-08-13, and one row could not be — the sweep missed what the manifests did not name

The design round wrote DT-0022 through DT-0025.

- **DT-0023** answers finding 2: `AuthorityLost` gains a leading `danger.default`
  edge that `CarriedProblem` does not, so the two are distinguishable with the
  text masked. Both stay red — moving either to `warning` or `notice` would say
  a refusal is advisory, which the system's own principle forbids. The
  difference becomes structural, per the new v2 principle *terminal and
  recoverable failures are told apart by structure, not by hue*.
- **DT-0024** and **DT-0025** answer finding 1 for `agent-reactivate-confirm`
  and for both of `recorder-trim`'s rows.
- **DT-0022** covers the button's `disabled` and `loading` treatment, which is
  #153's remaining blocker and is on these same surfaces.

**The deploy chooser's row could not be ticketed, and the reason is the finding
this item was missing.** It has no component in
`openspec/design/surfaces/agent-deploy-confirm.json`. It exists only as a
sentence inside `button-secondary`'s `current_implementation` — *"The chooser's
own row is still a plain `flex flex-wrap gap-3`, untouched by that ticket."* A
ticket naming it would fail `design_component_not_found`, because a component id
that appears in no source file is a ticket aimed at nothing.

This item says the sweep was *"scoped to the pages that had tickets rather than
to the pattern"*. That is close, and one step short. **The sweep was scoped to
the components the manifests named.** DT-0016 restyled `perform-deploy` because
`perform-deploy` was a component; it left the chooser row alone because the
chooser row was prose. A design agent can only ticket what the survey modelled,
so a row that is not a unit in the manifest is invisible to the round however
carefully the round is scoped.

**What that costs, generally**: every surface where two rows do different jobs
and only one is modelled will drift the same way, and the drift is invisible
from the design side. Worth a look at the other multi-row surfaces before the
next sweep rather than after it.

**Next step**: `/surface agent-deploy-confirm` modelling the chooser row as its
own component — it has its own job (it asks, and reaches no operation), its own
controls, and its own states — then one more ticket. Not done here because
re-surveying to satisfy a ticket I am about to write is the design agent editing
the developer's report of reality, which the contract forbids.

---

# Closed 2026-08-13 — both findings answered, and the second one taught us why the first happened

**Finding 1, the two row shapes.** DT-0024 gave reactivate DT-0016's treatment,
DT-0025 gave both of recorder-trim's rows the same, and DT-0026 finished the
deploy chooser. Every confirmation row in the product now stacks full-width
under `tablet` and wraps above it. There is one shape.

**Finding 2, AuthorityLost undesigned.** DT-0023 gave it a leading
`danger.default` edge that `CarriedProblem` does not carry. Both stay red —
moving either to `warning` or `notice` would say a refusal is advisory, which
the system's own principle forbids — so the difference is structural, under a
new v2 principle: *terminal and recoverable failures are told apart by
structure, not by hue*.

## The chooser row is the finding this item did not know it had

This item said the sweep was *"scoped to the pages that had tickets rather than
to the pattern"*. That is close and one step short.

**The sweep was scoped to the components the manifests named.** DT-0016
restyled `perform-deploy` because `perform-deploy` was a component. It left the
chooser row alone because the chooser row was a *sentence inside another
component's description* — and a design agent can only ticket what the survey
models as a unit. No amount of care in scoping the round would have reached it.

The row now exists as `deploy-chooser-row`, and the page carries that id in a
comment, because `openspec.py validate` refuses a component whose id appears in
no source file. That check is what would have caught this a month ago, and it is
what stops the next one: a row nobody named is a row no design round can see.

**Worth carrying forward**: any surface where two rows do different jobs and
only one is modelled will drift the same way, invisibly from the design side.
This one was found because a user asked why the shapes disagreed; the others
will not announce themselves.
