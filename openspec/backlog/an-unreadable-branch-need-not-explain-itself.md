---
id: an-unreadable-branch-need-not-explain-itself
title: Twenty-five surfaces print a failure's reason and stop; five explain it
type: debt
status: open
priority: p3
created: 2026-08-05
updated: 2026-08-05
change: ""
capability: app-access
blocked_by: []
tags: [ui, failure, consistency]
---

# Twenty-five surfaces print a reason and stop

## What

`WhyNotLoaded` exists. It takes a `FailureCause` and a subject and adds the
sentence that turns a failure into something an operator can act on:

> This does not mean your agents are gone — Grid-Commander could not reach
> BattleGrid to ask.

Counted 2026-08-05: **30 files render a `kind === 'unreadable'` branch. 5 use
it.** The other 25 render `{result.reason}` and stop.

The component's own header says it is "shared by the roster and the strategy
list so the two cannot drift" — and it is used by exactly those two plus three
agent pages. Everything built since has hand-rolled the branch.

## Why it matters

Less than it did this morning, and that is worth being precise about.

`the-outage-explains-itself` fixed the *reason* at the boundary, so the base
sentence is now good everywhere — `/arena` went from

> The arena could not be read. tools/call failed with 502

to

> The arena could not be read. BattleGrid is not answering right now (HTTP 502).
> This is a fault on BattleGrid's side — not with your account, your key, or
> anything you did.

which is most of what `WhyNotLoaded` was adding. What is still missing on those
25 is the subject-specific reassurance ("this does not mean your *agents* are
gone") and the refused-versus-unreachable branch, which reads the `cause` rather
than the message.

So this is now consistency debt rather than a broken surface: p3.

## The part that actually matters

**A guard, more than the sweep.** Twenty-five hand-rolled branches is a symptom;
the cause is that nothing stops the twenty-sixth. A check that every
`kind === 'unreadable'` branch reaches the shared component would fix the
category, and this repository's own history says the category is what to fix —
five separate defects this week came from a check matching how something was
*spelled* rather than what it *reached*.

Doing the sweep without the guard buys one clean afternoon.

## Evidence

```
$ grep -rl "kind === 'unreadable'" app/ src/presentation | wc -l
30
$ grep -rl "WhyNotLoaded" app/ src/presentation | wc -l
5   # plus the component itself
```

## Notes

Noted while fixing the reason, and not folded into that change: it would have
been the larger half of something proposed as the smaller one. See the
"Deferred, with its scope measured" section of
`openspec/changes/the-outage-explains-itself/proposal.md`.

One thing to decide when this is taken: the audit table now carries the full
three-sentence reason in its Outcome column, once per row. During an outage that
is the same paragraph repeated down the page. It is *correct* — and a second,
shorter wording for the same failure would be a second vocabulary, which is the
thing this product refuses elsewhere. Possibly a presentation problem (collapse
repeats) rather than a copy one.
