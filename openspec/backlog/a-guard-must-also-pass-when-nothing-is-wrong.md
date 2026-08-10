---
id: a-guard-must-also-pass-when-nothing-is-wrong
title: The guard-proof requirement is satisfied by a rule that always fails
type: debt
status: open
priority: p3
created: 2026-08-10
updated: 2026-08-10
change: ""
capability: harness-integrity
github: "123"
blocked_by: []
tags: [guards, spec, mutation-testing]
---

# A guard must also pass when nothing is wrong

## What

`a-guard-nobody-has-seen-fail` merged this requirement:

> Every architecture guard SHALL fail when the matcher producing its offender
> list is made to match nothing, and SHALL fail when that matcher is made to
> match everything.

Both directions are right. But every scenario states what must make a guard
**fail**, and none states that it must **pass** when the product is clean and
the rule is intact. A rule that fails unconditionally satisfies the requirement
as written, and so does one broad enough to report the whole tree.

A second scenario is missing for the same reason: the mutation check is
specified as a command, and nothing says it stays **out** of the ordinary suite.
That was a deliberate decision in the proposal — mutating source and re-running
is slow and stateful, and a gate people route around protects nothing — but a
decision only in prose is one the next person can reverse without noticing.

## Where it came from

Two sessions proposed this change independently, about half an hour apart. The
one that landed was implemented, verified and archived; the other was
proposal-only and was superseded on the branch. It split the same ground into
three requirements rather than two, and carried both scenarios above.

Written down because that proposal is otherwise gone, and being second is not
the same as being wrong.

## Why it matters

Low severity and real. Nothing in the tree fails unconditionally today, and all
seven repaired guards do carry a clean-input case in practice —
`permits an ordinary constant that merely holds a number`,
`reports nothing for a probe that only reads`,
`leaves this product's actual dependencies alone`. The practice is right; the
contract does not require it.

The cost of leaving it is that the next guard written against this spec can
satisfy it without a negative case, which is the direction that silences a rule
while looking rigorous.

## What would close it

A `lite` change adding the two scenarios. No code change expected — this is the
spec catching up to what the guards already do. If any guard turns out **not**
to pass on a clean input, that is a finding and gets its own item.
