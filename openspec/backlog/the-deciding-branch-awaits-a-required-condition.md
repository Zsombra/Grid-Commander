---
id: the-deciding-branch-awaits-a-required-condition
title: conditionEvaluation's verdict/decidedBy have never been seen populated — observable once a required condition exists
type: question
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-13
change: ""
capability: agent-understanding
github: "147"
blocked_by: []
tags: [battlegrid, v17, conditions, observation]
---

# The deciding branch awaits a required condition

## What

v17's `conditionEvaluation` block is rendered on the evaluation page
(#133, built 2026-08-11), and its `verdict` / `decidedBy` fields are
carried verbatim — but they have **only ever been observed null**,
because no condition yet read on this account is `required: true`, so the
condition system is never asked to decide. The outcome-level `counts`
(presumably the `N_OF` tally) is likewise unobserved populated.

As of 2026-08-13 that premise is no longer a handful of spot checks: it is
measured across 706 occurrences of `required` in eight of the account's 17
strategies. See "Re-checked 2026-08-13" below.

## Why it matters (p3)

The page renders the platform's words the day they appear — nothing is
broken and nothing needs building. But until the deciding branch is seen
once, its vocabulary is unknown, and any future surface that wants to
*explain* a condition-blocked evaluation is designing blind.

The 2026-08-13 counts change what kind of gap this is. It is not that the
deciding branch is rare and will show up in a wide enough read. On the eight
strategies read it cannot occur at all, so waiting for it to appear is waiting
for something the account's own configuration forbids.

## Re-checked 2026-08-13

Read-only, ~20:00 UTC, against the account whose `get_account_state` answers
`username: "Fibonacci"`, BattleGrid v18.2.0.

- `list_strategies` reports **17 strategies** on the account.
- **Eight** were read in full via `get_strategy`: Dunkirk, Leningrad, London,
  Tobruk, Midway, El Alamein, Bastogne, Kursk.
- Across those eight: **706** occurrences of the key `"required"`, of which
  **zero** carry the value `true`. Per strategy the counts were 86, 92, 90,
  89, 89, 86, 88, 86.
- **Nine strategies were not read.** Nothing here is a claim about them.

The 706 is measured: it is the count of the `"required"` key in those eight
payloads. That each occurrence is one condition slot is inferred from the
schema, not proven by the count.

What follows, stated at the width it was measured. Within those eight
strategies nothing requires anything, so the condition system is never asked
to decide, so `verdict` and `decidedBy` cannot be populated by reading. The
deciding branch is not rare there; it is unreachable from a read-only
position. The account-wide version of that sentence is inference, not
measurement, because the nine unread strategies are the one place an existing
`required: true` condition could still be sitting.

## What would unblock it

Two moves, cheapest first.

1. **Read the remaining nine strategies.** Nine `get_strategy` calls, no
   write. Either a `required: true` condition is already there and the branch
   opens for free, or the finding above becomes account-wide instead of
   eight-strategies-wide.
2. **Author a condition with `required: true`.** The path exists end to end:
   the condition composer can set `required` (#88, `a-draft-can-insist`,
   archived 2026-08-11). Then read a few evaluations under it and record what
   `verdict` and `decidedBy` say for a condition that held and one that did
   not. That closes this as an observation, and the evaluation page's
   rendering is confirmed against real words instead of carried on trust.

Move 2 is a write, and writes need `BATTLEGRID_LIVE_WRITES=1` on top of a key
(`HANDOFF.md:106`, enforced by `tests/architecture/live-writes.test.ts:211`).
That flag is unset by default.

So this is observable-in-principle by us, not blocked. BattleGrid does not
withhold the branch, and Grid-Commander can already author the condition that
reaches it. What stands in the way is a decision: set the flag and change a
real strategy on a real account. That is the operator's call, not something a
read-only sweep should make on its own. Calling this item "blocked" would
overstate it; calling it "one read away" would too. It is one deliberate write
away, and nobody has chosen to make it.
