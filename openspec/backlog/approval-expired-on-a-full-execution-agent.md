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
