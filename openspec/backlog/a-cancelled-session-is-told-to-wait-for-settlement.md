---
id: a-cancelled-session-is-told-to-wait-for-settlement
title: The arena promises results after settlement on 48 of 50 sessions that will never settle
type: risk
status: done
priority: p2
created: 2026-08-06
updated: 2026-08-07
change: "a-cancelled-session-is-promised-nothing"
capability: market-grid
blocked_by: []
tags: [battlegrid, market-grid, status, false-claim]
---

# "Results arrive after settlement", said to a cancelled session

The arena branches on `status !== 'SETTLED'` and, on everything else, tells the
reader results arrive once the session settles. A **CANCELLED** session does not
settle. Ever.

Live census, account 1, 2026-08-06 — all 50 rows `list_market_grid_sessions`
returned:

```
PENDING     2
CANCELLED  48
```

So the sentence is wrong on **48 of 50 sessions on the page**, which makes this
the ordinary case rather than an edge one. The platform is explicit about it:

```
CONFLICT  Results are not available yet: Market Grid session … is CANCELLED.
          Results are published after the session settles.
```

BattleGrid's own message has the same problem — "not available yet" for a
terminal state — but this product repeats the promise in its own voice, where
it is this product's claim.

## Why it is p2

It is a false statement of fact on the most-populated surface state, and it is
the kind that costs someone time: a reader who wants the outcome of a session
they were watching is told to come back, and there will never be anything to
come back for. No money moves, which is the only reason it is not higher.

## Why it was not fixed in `the-schedule-comes-off-the-list`

Correctly. It is pre-existing, it needs a decision about what to say for each
of six states rather than a one-line patch, and it would put more platform
vocabulary into a page — a behaviour change with its own scenarios, which is
the same "deserves the diff of its own" reasoning that item used on itself.

## The vocabulary, from the surface record

`input_constants` on the Market Grid tools declares six:

```
PENDING · LIVE · RESOLVING · SETTLED · CANCELLED · SETTLEMENT_QUARANTINED
```

Three of those have never been observed on any session (`LIVE`, `RESOLVING`,
`SETTLEMENT_QUARANTINED`) — the live arena has only ever shown `PENDING` and
`CANCELLED`. So this cannot be fixed by writing six sentences: five of them
would be prose about states nobody has seen, which is the mistake behind three
dead paths in `HANDOFF.md`.

## The shape that is probably right

Say the promise only where it is warranted, and name the state otherwise.
Something like: results are promised for the states known to reach settlement,
`CANCELLED` says plainly that the session was cancelled and there will be no
results, and any other value renders the platform's own word with no claim
attached — the `binding.state` treatment, which already exists in this product
for exactly this problem (`BindingSummary`'s third branch).

That also keeps the enum out of source, which
`tests/strategy/structure.test.ts` requires: the states are read from the
discovered schema, and only the two observed ones get bespoke prose.

## Evidence

- `app/(app)/arena/page.tsx` — the `status !== 'SETTLED'` gate
- the live census above; `get_market_grid_results` refusal quoted verbatim
- `market-grid-payloads-that-only-fill-once-someone-plays` — the sibling record
  of what a settled session would carry, still unobserved
