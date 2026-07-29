---
id: performance-and-allocation-are-unmodelled
title: get_agent_performance and get_agent_fund_allocation are observed and unread
type: debt
status: open
priority: p2
created: 2026-07-29
updated: 2026-07-29
change: the-journal-can-never-show-anything
capability: agent-understanding
blocked_by: []
tags: [battlegrid, agent-understanding, mapping]
---

# get_agent_performance and get_agent_fund_allocation are observed and unread

Two read tools the probe reached and the product does not call. The journal
change modelled `get_agent_journal`; these are what is left of the
agent-internals reads.

The order matters less than the discipline: **call them first, model second.**
Every defect this week came from a mapper written against a declared schema
instead of an observed response, and the journal was the fourth.

## Why it matters

`recentGames` carries `finalScore`, `rank` and four payout fields, and every one
of the ten games observed had them `null` — the account has nothing settled. So
the product currently has no observation of what a *result* looks like.
`get_agent_performance` is where that would come from, and until it is called
nothing should be written about scoring.

## Related

- `the-journal-can-never-show-anything` — declared these out of scope
