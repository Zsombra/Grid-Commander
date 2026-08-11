---
id: the-deciding-branch-awaits-a-required-condition
title: conditionEvaluation's verdict/decidedBy have never been seen populated — observable once a required condition exists
type: question
status: open
priority: p3
created: 2026-08-11
updated: 2026-08-11
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
because every condition on the account is `required: false` and the
condition system never decides anything. The outcome-level `counts`
(presumably the `N_OF` tally) is likewise unobserved populated.

## Why it matters (p3)

The page renders the platform's words the day they appear — nothing is
broken and nothing needs building. But until the deciding branch is seen
once, its vocabulary is unknown, and any future surface that wants to
*explain* a condition-blocked evaluation is designing blind.

## First step

The path exists end to end as of today: the condition composer can now
set `required` (#88, `a-draft-can-insist`). When the operator next lands
a strategy revision carrying a `required: true` condition — a deliberate
act on a real strategy, theirs to choose — read a few evaluations under
it and record what `verdict` and `decidedBy` say for a condition that
held and one that did not. Then this closes as an observation, and the
evaluation page's rendering is confirmed against real words instead of
carried on trust.
