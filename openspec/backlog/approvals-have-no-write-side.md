---
id: approvals-have-no-write-side
title: The human-in-the-loop can be read but not answered — accept/cancel are unbuilt
type: feature
status: open
priority: p3
created: 2026-08-03
updated: 2026-08-03
capability: agent-understanding
blocked_by: []
tags: [battlegrid, approvals, human-in-the-loop, wager]
---

# The human-in-the-loop can be read but not answered

`why-it-did-not-trade` (archived 2026-08-03) built the read half:
`/agents/[id]/pipeline` shows the three stages a candidate can end at, and
an entry decision arrives with the agent's own reasoning. What an operator
cannot do is answer one.

Unbuilt: `accept_entry_decision`, `cancel_entry_decision`,
`list_pending_approvals`.

## Why it matters

The product's premise is "the human decides, informed". The pipeline surface
delivers *informed* and stops one click short of *decides*. An operator who
reads "ENTER BTC long, 0.78 conviction, entry 94,200 / stop 91,000" has
everything needed to judge it and no way to say yes.

## What discovery settled (2026-08-03)

- **The mode is settable over MCP.** `tradingConfig.tradingMode` accepts
  `OFF | APPROVAL_REQUIRED | FULL_EXECUTION` on both
  `create_intelligence_agent` and `update_intelligence_agent`. This is not
  a battlegrid.trade-only switch.
- **This product already offers it.** `MoneyLimits` renders *"Approval
  required — proposes trades, waits for you"* on the create and edit
  surfaces. An operator can select it today and then has nowhere to answer.
  `the-decision-shows-its-work` adds a line saying so at the point of
  choosing; it does not make the option answerable.
- **No agent on this account has ever used it.** All 15 agents, active and
  archived, are `OFF` (9) or `FULL_EXECUTION` (6). `list_pending_approvals`
  answers `{approvals: []}` and takes no arguments — it returns the whole
  queue, unpaginated.
- **`accept_entry_decision` and `cancel_entry_decision` take one argument**,
  `decisionId` (uuid). Ownership is enforced from the stored decision, so
  no agent id is passed. Accept is `destructiveHint: false`; cancel is
  `destructiveHint: true`.
- **`get_entry_decision` is redundant** — it returns the same 35 keys
  `list_entry_decisions` already sends per row. Do not add a detail fetch.

So the queue is empty because nothing on this account produces approvals,
not because the tool is broken.

## Why it is not built yet

Both writes are `mcp:wager` and one is destructive — this is the ceremony's
whole purpose, not a place to shortcut it. It is its own change, full track:

- The confirmation target must bind the **decision id, its revision, and the
  price levels** (entry, stop, target). Accepting a decision whose stop moved
  between read and click is a different act from the one agreed to — the same
  reasoning as `confirmation-is-not-bound-to-values`.
- Consequence wording names money: accepting opens a position at real size.

## The trap to avoid when taken

`list_pending_approvals` answers `{approvals: []}` on this account, so **its
row shape has never been observed**. Do not model it from the declaration.
Every one of the seven dead paths in HANDOFF.md came from trusting a schema
over a call — including two where the declared write shape and the accepted
write shape simply differed. Get a real pending approval on the account
first (an agent with equity above the $10 floor and an ENTER decision), read
it, then model it.

## First step when taken — and it needs the operator

Producing one pending approval means putting a real agent into
`APPROVAL_REQUIRED`. That changes how an account that trades real money
behaves, and it is the operator's call, not this client's:

1. Operator decides which agent goes to `APPROVAL_REQUIRED` (or funds a
   throwaway past the $10 equity floor — the account sat at $2.18 on
   2026-08-03, which is why candidates were gate-blocked).
2. Wait a cycle for an ENTER decision to reach the queue.
3. Read `list_pending_approvals` **with a row in it** and model from that.
4. `/propose` the full-track change, with `cancel` built and proven before
   `accept` — cancelling costs nothing, accepting opens a position.
