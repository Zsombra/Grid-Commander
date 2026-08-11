---
id: approval-expired-on-a-full-execution-agent
title: AGENT_APPROVAL_EXPIRED is the account's commonest block and fires on agents that need no approval
type: question
status: done
priority: p2
created: 2026-08-06
updated: 2026-08-11
change: ""
capability: agent-understanding
github: "98"
blocked_by: []
tags: [battlegrid, gate-blocks, unexplained, live]
---

# The commonest block on the account is one nobody can explain

## Update 2026-08-06 (second account): two of yesterday's claims were wrong

The second account (`Fibonacci`, one active agent, `THE .0`) breaks the pattern
this item asserted from the first account alone. **Both corrections are against
what was written below.**

| | account 1 (three agents) | account 2 (`THE .0`) |
|---|---|---|
| `AGENT_APPROVAL_EXPIRED` | 134 | **90** |
| evaluations | 0 | **71** |
| entry decisions | 0 | **71** |
| closed trades | 0 | **26** |

**Wrong claim 1: "the block lands on agents that have never traded, not on the
one that has."** `THE .0` trades — 71 evaluations, 27 executed orders, 26 closed
trades, real P&L — and carries 90 of these blocks. The account-1 pattern did
not generalise past account 1.

**Wrong claim 2: `lifetimeAllocatedUsd: 0` means "never funded."** `THE .0`
also reads `availableUsd: 0, lifetimeAllocatedUsd: 0` while having closed 26
trades. Whatever that counter tracks, it is not "has this agent ever had
capital".

### The core conclusion survives, and is now stronger

The operator's "a signal fired and the order missed its fill window" reading is
still ruled out, on two independent grounds:

1. **The counts are nowhere near each other.** `THE .0` has `expiredCount: 5`
   against **90** approval blocks — off by 18×. Account 1 has 134 blocks and
   zero decisions of any status.
2. **On account 2 the windows do not even overlap.** All five expired decisions
   are 28–29 July; the 90 approval blocks run 30 July → 6 August. The blocks
   begin after the last expiry.

### What the operator's intuition *did* find

Decision expiry is real, it is just a much smaller and separate thing — and the
observation settles an open question about a setting:

```
created=2026-07-29T08:02  expires=2026-07-29T08:17  HYPE       (15 min)
created=2026-07-29T01:20  expires=2026-07-29T01:35  HYPE       (15 min)
created=2026-07-28T22:35  expires=2026-07-28T22:50  BRENTOIL   (15 min)
```

Exactly 15 minutes, matching `signalTimeoutMinutes: 15`. First live
confirmation of what that setting governs — and it governs the decision's own
expiry, not a gate block.

## Update 2026-08-06 (evening): the "unfilled order" reading is ruled out

The operator's reading was that the platform threw a signal, the order did not
fill inside the timeout, and the decision expired unexecuted. It is a natural
reading of the name and it does not survive the data.

**All three agents carrying this block have never evaluated anything.**

| | CONTRARIAN | CONFLUENCE | VELOCITY | Fade Master II |
|---|---|---|---|---|
| `get_signal_performance.totalEvaluations` | **0** | **0** | **0** | 245 |
| `list_entry_decisions` total | **0** | **0** | **0** | 151 |
| `list_signal_logs` | **0** | **0** | **0** | many |
| `AGENT_APPROVAL_EXPIRED` blocks | 98 | 27 | 9 | **0** |

No signal was ever thrown, so no order could fail to fill. A gate block happens
*before* signal evaluation by definition, and these three have no evaluations,
no signal logs and no decisions in their entire history.

The contrast is the sharpest part: **Fade Master II, the one agent that
actually trades, has none of these blocks.** It has `INSUFFICIENT_EQUITY`
instead. The block lands on agents that have never traded, not on the one that
has.

### What the evidence does point at

All three were created 2026-07-29/30, and CONTRARIAN's activity feed has
exactly two events since creation:

```
2026-07-29T16:08 AGENT_BLOCKED_NO_ALLOCATION   {}
2026-07-29T14:16 AGENT_CREATED                 {strategyName: "Fade Master — imported", modelDisplayName: "Grok 4.3"}
```

`get_agent_fund_allocation` for all three: `availableUsd: 0, committedUsd: 0,
**lifetimeAllocatedUsd: 0**`. They have never been funded.

So the shape is: created, never allocated, blocked ever since. Whether
`AGENT_APPROVAL_EXPIRED` *means* something about allocation is still not
established — the enum carries a separate `NO_AGENT_ALLOCATION` code, and the
activity feed uses `AGENT_BLOCKED_NO_ALLOCATION` while the gate block says
`AGENT_APPROVAL_EXPIRED`. Three names in the neighbourhood of one condition.

### Tools checked, and what they were worth

- `get_agent_activity_feed` — **useful**. Named `AGENT_BLOCKED_NO_ALLOCATION`,
  which nothing else did. Two events total for CONTRARIAN.
- `get_agent_fund_allocation` — **useful**. `lifetimeAllocatedUsd: 0` is the
  fact the whole picture turns on.
- `get_agent_automation_status` — **not related**. It answers Market Grid game
  assignments and assignable presets (`CRYPTO WARS`, `STOCKS OFFENSIVE`,
  `entryFee: 10`), nothing about trading authorization. Struck off this item's
  first-step list.

### What is still open

Whether the fix is "allocate funds to these three agents" — which the operator
can test directly, and which would resolve 134 blocks a week if right. That is
an account action, not a product change, so this item stays a question rather
than becoming a change.

Found while building `what-keeps-stopping-this-agent`, by folding every gate
block on the operator's five agents (2026-08-06):

| agent | count | window |
|---|---|---|
| CONTRARIAN | **98×** | 2026-07-30 → 2026-08-06 |
| CONFLUENCE | 27× | 2026-07-31 → 2026-08-06 |
| VELOCITY | 9× | 2026-07-30 → 2026-08-06 |

**134 blocks in one week**, more than any other reason on the account, and
`reasonDetail` is `{}` every single time.

## Why it does not add up

BattleGrid's own reference ties approval to one trading mode:

> `tradingMode` — `APPROVAL_REQUIRED` = evaluate + require manual accept
> `signalTimeoutMinutes` — Signal approval window in minutes — **APPROVAL_REQUIRED mode**

All three agents above are `tradingMode: FULL_EXECUTION` right now. So either

1. they were in `APPROVAL_REQUIRED` during that week and their decisions
   expired unanswered — plausible, but the blocks continue through today; or
2. "agent approval" is a different thing from decision approval — an
   authorization the agent itself holds, which expires; or
3. something else again.

`list_pending_approvals` answers `{approvals: []}`, which rules nothing out —
an expired decision would not still be pending.

## Why it is p2 rather than p3

Three of five agents have been stopped by this more than a hundred times in a
week. If reading (2) is right, the operator has an account-level thing to
re-authorize and nothing tells them. If reading (1) is right, they switched
modes and left a week of decisions unanswered. Either way it is the largest
single fact about why their agents are not trading.

## What was deliberately not done

`what-keeps-stopping-this-agent` **shows the code, the count and the window and
asserts no meaning**. That is true under all three readings. Writing a sentence
explaining the code would have been this product inventing platform semantics —
the mistake behind three of the dead paths in `HANDOFF.md`.

## First step when taken

Ask the platform rather than the schema. `get_agent_activity_feed` and
`get_agent_automation_status` are both unread by this product and are the two
most likely to name an authorization state. `get_agent_decision_context` may
say what the agent believed it was waiting for. If none of them answers, the
question belongs to BattleGrid's operators, not to a guess.

## Closed 2026-08-11 — overtaken by the fleet re-organisation; semantics stay upstream

The operational fact this item was p2 for is gone. The funded fleet
(Undertow, Breakwater, Vanguard — the 2026-08-08 re-organisation) was
probed across its whole lifetime:

| agent | total blocks | `AGENT_APPROVAL_EXPIRED` seen |
|---|---:|---|
| Undertow | 3,809 | **0** in 600 rows sampled across 6 pages, creation → now |
| Breakwater | 346 | **0** in the latest 100 |
| Vanguard | 0 | — |

Every sampled row is `OPEN_POSITION_CONFLICT` but one
`EXCHANGE_MIN_NOTIONAL_UNREACHABLE` and 22 `DAILY_TRADE_LIMIT_REACHED`
(2026-08-08 evening). Three days of funded, evaluating, actually-trading
agents have never produced the block; the never-funded trio that produced
134/week is archived. "The largest single fact about why their agents are
not trading" is no longer a fact about this account.

What stays deliberately unanswered: what `AGENT_APPROVAL_EXPIRED` *means*.
Both accounts' 2026-08-06 evidence still contradicts every clean reading
(never-funded agents produced it on account 1; a funded, trading agent
carried 90 on account 2), and there is no live subject left on this
account to probe. Per this item's own rule, that residue belongs to
BattleGrid's operators — it is a candidate line for the upstream report
(#107), not a guess for this product to render. The product's surface
already does the right thing under every reading: code, count and window,
no invented meaning.

Recorded in passing: Undertow's `OPEN_POSITION_CONFLICT` rate has grown to
~90/hour (3,809 in three days, `gateStage: TOKEN` — before the model call,
so not a spend line). The known re-evaluates-what-it-holds pattern,
unchanged in kind since #96, larger in volume.
