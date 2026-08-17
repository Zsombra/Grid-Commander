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

## 2026-08-16 — the producer changed; the finding did not

**This item's case was already made.** `approvals-have-no-write-side.md`
established the mechanism, the ~15-minute window, `total: 12` EXPIRED on
Undertow, and the rate — *"roughly one unheld-coin ENTER per hour or two"* — on
2026-08-15. None of that needs re-deriving, and a later reader should go there
rather than here for it.

**What has changed is who produces the rows.** Undertow is now
`FULL_EXECUTION`; so is Breakwater. **Vanguard is the account's only
`APPROVAL_REQUIRED` agent**, at the 15-minute ceiling, and it has taken over as
the source of approval rows. Its whole history, read 2026-08-16:

```
total decisions   37
ENTER -> EXPIRED   5      (f67c36af, a0e4a5c9, d049533c, b1165d28, fb67f4a3)
ENTER -> EXECUTED  2      (both accepted by hand at battlegrid.trade)
```

Five of seven, on the new producer, in one night. That is the same finding
continuing on a different agent — **confirmation, not new evidence** — and its
only operational value is that it names Vanguard as the agent to watch when
`the-approval-can-be-answered`'s live gate is attempted.

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

## 2026-08-16 — the "first thing to establish" is established, and a Note is wrong

The Evidence names one thing as NOT DETERMINED and *"the first thing to
establish"*: whether `set_agent_per_trade_push` covers approval-pending
decisions or only executed trades. **It is determined, and it needed no write.**

The tool's own `enabled` parameter says what it delivers:

> `enabled` — *"True to receive a push notification **per executed trade**;
> false to stop them."*

**Per executed trade.** A decision awaiting approval has not executed — that is
the entire condition this item exists for — so `set_agent_per_trade_push` does
not cover it. **It is not the mechanism.** The second of the two shapes in the
Notes is struck.

### A correction, and it is the safety-relevant kind

The Notes say of that same option: *"The second is a `mcp:read` write (scope is
not a safety boundary here) and changes the user's platform-side settings, so it
needs its own confirmation."*

**The scope is wrong.** The tool's description, at v19.2.0 and in
`docs/battlegrid-mcp-capabilities.json`:

> *"Requires the **mcp:wager** scope: it writes the same funding-envelope row
> that carries the halt state, so it is gated with the rest of that surface
> rather than treated as a free-standing preference."*

So turning a notification preference on is a **wager-scoped** write against the
row that carries the agent's halt state. That is a materially different act from
what the Note describes, and the Note's parenthetical — *"scope is not a safety
boundary here"* — is the repository's standing rule applied in the wrong
direction: the rule warns that `mcp:read` can mutate, not that a wager-scoped
write can be treated as a preference.

The conclusion the Note reaches (*"it needs its own confirmation"*) survives and
is if anything understated.

### Why believing the declaration is safe here, unusually

[[battlegrid-declared-vs-observed]] says a declaration is not an observation, and
that normally cuts against trusting one. **Both conclusions above narrow what may
be built**, so believing them costs nothing:

- Believing "executed trades only" means **not** building on this tool. If the
  declaration were wrong and it did cover approvals, the loss is an option not
  taken.
- Believing "`mcp:wager`" means treating it as a money-scoped write. If the
  declaration were wrong, we over-protected a preference.

Believing the opposite of either would mean making a wager-scoped write against
a live funding row **to find out**. The asymmetry is the whole argument.

### What is left

**The cheapest partial mitigation in the Notes is now the only candidate that
does not depend on the platform**: show, inside the queue surface, the count of
decisions that expired unanswered in the last day. It converts a silent loss
into a visible one with no notification machinery and no new scope.

Two facts for whoever builds it, from today's reads:

- **`list_pending_approvals` returned `[]`** at 2026-08-16T13:4xZ. The queue is
  empty as often as not, so a surface that only shows *pending* rows will read as
  "nothing is happening" during exactly the window this item is about. The
  expired-count is what makes the empty state legible.
- **Vanguard remains the only `APPROVAL_REQUIRED` agent** (confirmed on
  `list_intelligence_agents`: `tradingMode: APPROVAL_REQUIRED`, the other two
  `FULL_EXECUTION`), so it is still the agent to watch.

Unchanged: blocked by `the-approval-can-be-answered`, because notifying someone
about a decision they cannot answer would be worse than silence.
