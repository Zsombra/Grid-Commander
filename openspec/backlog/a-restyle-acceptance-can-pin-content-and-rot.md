---
id: a-restyle-acceptance-can-pin-content-and-rot
title: A restyle ticket's acceptance can pin content, and it expires silently when the content legitimately changes
type: debt
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: harness-integrity
github: "320"
blocked_by: []
tags: [design, contract, drift, staleness]
---

# A restyle ticket's acceptance can pin content, and nothing notices when it rots

## What

`DT-0014` was `type: restyle`, `behavior_impact: none`, `status: implemented`,
and two of its seven acceptance lines pinned **content** rather than treatment:

```
"...keeps role=status with its counts intact"
"Zero copy changes anywhere on the page"
```

On 2026-08-13 the approved change `the-receipt-states-what-remains` removed
those counts deliberately (#168). Both lines became false the moment it landed,
the ticket stayed `implemented`, and **nothing checked** — `validate` has no
opinion about an acceptance line, because acceptance is prose aimed at a human.

That is settled for the one ticket (#193, annotated in place by
`the-record-says-what-was-actually-checked`). This item is the general rule that
was deliberately not written there.

## Why it matters

p3. It is a trap rather than a defect — nothing renders wrong. The cost is that
a design round reading the acceptance at face value would "restore the counts"
and re-introduce exactly the defect #168 was filed for, believing it was
repairing a regression.

`"Zero copy changes anywhere on the page"` is the sharper of the two. It was a
constraint on *that restyle* — this ticket changes no copy. Read later as a
standing rule it forbids every future behaviour change to the page.

## What would settle it

A rule in `.claude/references/design-contract.md` §5, beside the three already
there: **a restyle ticket's acceptance describes treatment and structure, and
refers to content only where the treatment depends on it.** "The block is
legible as text, not decoration" qualifies; "with its counts intact" does not.

Three questions make it a decision rather than an edit:

1. Does it extend past `restyle` to `relayout` and `tokens`, which have the
   same property?
2. Is there a mechanical half worth having — `validate` warning when an
   `implemented` ticket's surface changed after the ticket's `updated` date?
   That is the check that would have caught this one, and it is the same
   missing signal as [[a-design-round-stales-the-manifests-it-designed-against]].
3. Does a sweep of the existing 27 tickets follow, or does the rule bind going
   forward only?

## Notes

Deferred out of `the-record-says-what-was-actually-checked` (2026-08-16), which
settled #193 for the single ticket. Writing the contract rule there would have
been a change to the contract smuggled inside a bookkeeping pass.

Same family as [[a-design-round-stales-the-manifests-it-designed-against]] and
[[the-re-pin-pins-to-the-commit-before-its-own-edits]]: the design layer's
records are pinned to a moment, and nothing tells them when the moment passed.

## 2026-08-16 — no decision taken, and one datum for whoever takes it

Untouched: the three questions in "what would settle it" make this a decision
about the design contract, not an edit, and nothing in this session had standing
to take it.

One datum from today that bears on it. #318's sweep measured the two unmeasured
manifest-claim families and found the **focus-ring family false in 12
manifests** — they assert *"do not add a per-element ring"* while a shared
constant adds one at 71 sites (#338). That is the same failure mode as `DT-0014`,
one layer along: **prose asserted about the product, believed by everyone,
contradicted by the code, and checked by nothing.**

It argues that the rule this item proposes should be written as a *general*
constraint on asserted prose rather than scoped to restyle-ticket acceptance
lines — the acceptance line and the manifest constraint rot the same way, for
the same reason, and a rule that covers only one of them leaves the other.

Whether that widens the decision past what is worth deciding is itself part of
the decision. Recorded, not concluded.
