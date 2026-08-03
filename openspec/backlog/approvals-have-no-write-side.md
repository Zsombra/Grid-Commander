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

## First step when taken

Fund a throwaway agent past the equity gate, wait for an ENTER decision,
observe `list_pending_approvals` with a row in it, then `/propose` the full
track change.
