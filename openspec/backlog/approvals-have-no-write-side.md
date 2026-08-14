---
id: approvals-have-no-write-side
title: The human-in-the-loop can be read but not answered — accept/cancel are unbuilt
type: feature
status: open
priority: p3
created: 2026-08-03
updated: 2026-08-14
capability: agent-understanding
github: "101"
blocked_by: []
tags: [battlegrid, approvals, human-in-the-loop, wager]
---

# The human-in-the-loop can be read but not answered

## Update 2026-08-06: re-checked, and it is blocked twice over

Picked up as the next build and put back down, with the reasons recorded so
nobody spends the afternoon again:

- **Our own spec forbids the write.** `accept_entry_decision` and
  `cancel_entry_decision` both say *"Requires mcp:wager scope"*, and
  `Read Scope Is Requested And Wager Scope Is Not` says Grid-Commander MUST NOT
  request authority to commit funds. Building it is an operator's decision to
  relax a standing requirement, not a commit.
- **The read side still has no observed shape.** `list_pending_approvals`
  answers `{approvals: []}` — no agent on either account runs
  `APPROVAL_REQUIRED`, so the row has never been seen. Modelling it means
  inventing key names, which is what produced three of the dead paths in
  `HANDOFF.md`.

`why-it-would-not-take-this-coin` was built instead, for the opposite reason:
its rows are populated on this account today.

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

## Step 1 taken, 2026-08-14 — Vanguard is in APPROVAL_REQUIRED

The operator named the agent ("the one with basically no traits" — Vanguard,
0 games, 0 trades, empty curve) and the write was made this session over MCP:

```
update_intelligence_agent(Vanguard c8f20b9e…, expectedRevision: 10)
  tradingConfig sent complete and verbatim except:
    tradingMode           FULL_EXECUTION → APPROVAL_REQUIRED
    signalTimeoutMinutes  5 → 15   (longest window the platform allows —
                                    a 5-minute window on an unwatched
                                    account expires before anyone reads it)
  read-back: revision 11, both values landed, every other field identical;
  strategyTimeframe / regime fields (not in the write schema) preserved.
```

Conditions at the time of the write, all read in the same minutes:

- Account balance **$38.63** — above Vanguard's own `balanceThresholdUsd: 35`
  (it was $2.18 when this item was first blocked).
- Vanguard is on duty on **five Radar coins** (BTC, ETH, SOL, XRP, AVAX),
  default slot on each, conviction bar 0.6.
- **The whole Radar fleet is `PLATFORM_PAUSED`** — all 20 policies,
  `summary.radarPaused: true`, nothing fired since 2026-08-13 evening. Until
  the platform unpauses, no candidate reaches any agent and no approval can
  arrive; this is the platform's pause, not a setting on this account that
  was found writable.
- `list_pending_approvals` → `{approvals: []}` — the baseline, taken after
  the flip.

**What to watch**: when Radar shows fired rows again, read
`list_pending_approvals` within a candidate's 15-minute window. The first
Vanguard candidate that clears its gates lands in the queue instead of
auto-executing — that is the row this item needs observed before anything
is modelled. Steps 2–4 above unchanged.
