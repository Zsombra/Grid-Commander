---
id: an-approval-expires-while-nobody-is-looking
title: A decision waits fifteen minutes and nothing tells the operator it is there
type: feature
status: open
priority: p2
created: 2026-08-15
updated: 2026-08-15
change: ""
capability: agent-understanding
github: "304"
blocked_by: [the-approval-can-be-answered]
tags: [battlegrid, approvals, human-in-the-loop, notification]
---

# A decision waits fifteen minutes and nothing tells the operator it is there

## What

`the-approval-can-be-answered` makes a proposed trade answerable. It does not
make anyone aware one is waiting. The window is **fifteen minutes** — the
longest the platform allows — after which the decision expires unanswered and
the agent does not re-propose it.

An operator who is not already looking at the queue will miss it.

## Why it matters

An approval nobody sees is indistinguishable from an agent that does not trade.
The operator chose approval-required to stay in control; the outcome is an agent
that silently does nothing, which is not the control they asked for — it is the
appearance of it.

This was measured, not imagined: on 2026-08-15 a decision was proposed at
13:18:03Z and expired at 13:33:10Z with nobody answering, during a session
actively watching for exactly that row.

## Evidence

- `signalTimeoutMinutes` accepts only 5, 10 or 15 — 15 is the ceiling
  (`update_intelligence_agent` input schema).
- Observed expiry, HYPE, agent Undertow: `createdAt 2026-08-15T13:18:03.199Z`,
  `expiresAt 2026-08-15T13:33:03.199Z`, `closedAt 2026-08-15T13:33:10.729Z`,
  `status EXPIRED`, `executedOrderId null`. Full payload in
  [[approvals-have-no-write-side]].
- `total: 12` EXPIRED decisions already exist for that one agent.
- `get_agent_activity_feed` is useless as a detector: `total: 1` (AGENT_CREATED)
  against 41 lifetime trades.
- `set_agent_per_trade_push` exists on the surface and this product does not use
  it — `perTradePushEnabled: false` on Undertow's budget read. **Whether it
  covers approval-pending decisions or only executed trades is NOT DETERMINED**
  and is the first thing to establish.

## Notes

- Blocked by `the-approval-can-be-answered` — notifying someone about a decision
  they cannot answer would be worse than silence.
- Two shapes to weigh: a product-side notification, or wiring the platform's own
  `set_agent_per_trade_push`. The second is a `mcp:read` write (scope is not a
  safety boundary here) and changes the user's platform-side settings, so it
  needs its own confirmation.
- Cheapest partial mitigation, worth considering inside the queue surface
  itself: show the count of decisions that expired unanswered in the last day.
  That converts a silent loss into a visible one without any notification
  machinery.
