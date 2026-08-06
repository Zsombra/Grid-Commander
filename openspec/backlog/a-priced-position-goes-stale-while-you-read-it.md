---
id: a-priced-position-goes-stale-while-you-read-it
title: The platform asks for a 10-second refresh and every surface here is a static render
type: risk
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, positions, staleness, money]
---

# A position page is a photograph of a moving thing

`list_user_active_positions` returns, in its `totals`:

```json
{"pricingStatus": "LIVE", "generatedAtMs": 1786038921702, "refreshIntervalMs": 10000}
```

The platform is telling a client **how often to re-read**: every ten seconds.
Every surface in Grid-Commander is a server-rendered snapshot, and
`what-it-holds-and-what-it-could-not-place` shipped the first one whose numbers
move that fast — mark price, unrealized P&L, ROE.

## What was done, and why it is not enough

The surface states when it was priced and calls itself "a snapshot, not a live
ticker". That is honest and it is the right floor: a page that says how old it
is cannot mislead about how old it is.

It still leaves a real gap. An operator who opens the agent page, reads
`-$0.01 unrealized`, and sits with it for four minutes is looking at a figure
the platform considers twenty-four refreshes out of date — on a **5×
leveraged** position, where a 1% move against is a 5% move on margin.

The one page in this product where the numbers actually move is the one page it
has no mechanism for.

## Why it is p3, not higher

Nothing is wrong. Nothing is claimed falsely — the timestamp is right there. No
decision this product offers depends on the freshness of that figure: there is
no close-position action, no reduce, no move-stop. The reader can refresh.

It becomes p2 the moment any action is offered against an open position,
because then a stale number is one someone acts on.

## Options, none chosen

- **Say nothing more.** Defensible: the timestamp is stated and the reader has
  a refresh button. Costs nothing and claims nothing.
- **Auto-refresh the section.** Would require the first client component in the
  product beyond `SectionNav`, and this product renders everything on the
  server on purpose. A real architectural change for one panel.
- **A refresh control on the section** — a link back to the same page,
  server-rendered, no client JavaScript. Cheap, honest, and keeps the
  architecture. Probably the right answer if this is taken at all.
- **Show the age rather than the timestamp** — "priced 4 minutes ago" reads as
  staleness in a way an ISO timestamp does not. Cheapest of all, but it needs a
  clock at render time, which this repo keeps behind a port.

## First step when taken

Decide between the last two. Neither needs a new read: `generatedAtMs` is
already carried on `ExposureTotals` and already rendered.
