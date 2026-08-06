---
id: approval-expired-on-a-full-execution-agent
title: AGENT_APPROVAL_EXPIRED is the account's commonest block and fires on agents that need no approval
type: question
status: open
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, gate-blocks, unexplained, live]
---

# The commonest block on the account is one nobody can explain

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
