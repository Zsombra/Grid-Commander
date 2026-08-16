---
id: an-approval-expires-while-nobody-is-looking
title: A decision waits fifteen minutes and nothing tells the operator it is there
type: feature
status: open
priority: p2
created: 2026-08-15
updated: 2026-08-16
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

## Measured 2026-08-16 — it is not a risk, it is the majority outcome

Read live over the authenticated connector at v19.2.0. Read-only, no writes.

**Vanguard is the account's only `APPROVAL_REQUIRED` agent** — Undertow and
Breakwater are both `FULL_EXECUTION` — and it runs a **15-minute**
`signalTimeoutMinutes`, the platform ceiling. Its whole decision history:

```
total decisions   37
ENTER  -> EXPIRED  5
ENTER  -> EXECUTED 2
```

**Five of its seven proposals expired unanswered. Two were accepted**, both by
hand at battlegrid.trade. That is a **71% loss rate on everything the agent has
ever proposed**, and it is the number this item was filed on a suspicion of.

The five, with their windows — the pattern is the item's whole argument, visible
in one night:

```
f67c36af  created 05:19:37Z  expired 05:34:53Z   AVAX LONG  conviction 0.55  R:R 3.0
a0e4a5c9  created 04:01:25Z  expired 04:16:54Z   AVAX LONG  conviction 0.58  R:R 5.7
d049533c  created 01:58:37Z  expired 02:13:53Z   AVAX LONG  conviction 0.55  R:R 3.7
b1165d28  created 01:21:59Z  expired 01:37:23Z   AVAX LONG  conviction 0.55  R:R 3.5
fb67f4a3  created 22:48:55Z  expired 22:59:54Z   AVAX LONG  conviction 0.55  R:R 5.7
```

Every one is an ENTER the agent reasoned its way to, sized, and set levels for.
Every one died because nobody was looking within fifteen minutes. The agent is
not idle and it is not failing — **it is proposing into silence roughly every
hour or two**, and being answered about a third of the time.

### What this does to the item

- The original evidence was a **count** (12 EXPIRED on Undertow, before that
  agent moved to `FULL_EXECUTION`). This is a **rate**, on the agent that is
  actually in the mode, and a rate is what makes the case: the failure is not an
  edge case, it is the default outcome.
- **It also sets the bar for any notification design.** A mechanism that only
  reaches somebody within fifteen minutes is worth building; one that does not
  changes nothing. That rules out anything requiring the operator to already be
  in the product, which is most of the cheap options.
- `set_agent_per_trade_push` is still **NOT DETERMINED** on whether it covers
  approval-pending decisions or only executed trades. It remains the first thing
  to establish, and this measurement is the reason it is worth establishing.

**Still blocked by** [[approvals-have-no-write-side]]. The queue now exists and
cancelling works, so the "notifying someone about a decision they cannot answer"
objection is close to discharged — but accepting is still unbuilt, and a
notification that leads to a surface offering only *decline* would be worse than
one that leads to both.

**Found while finishing the UI for `the-approval-can-be-answered`**, checking
whether that change's live gate (task 4.5) could be attempted. It could not —
nothing was pending at the time of reading — and the same read produced this.

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
