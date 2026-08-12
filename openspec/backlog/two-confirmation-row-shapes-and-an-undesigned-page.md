---
id: two-confirmation-row-shapes-and-an-undesigned-page
title: Confirmation rows come in two shapes now, and AuthorityLost has never been designed
type: debt
status: open
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
