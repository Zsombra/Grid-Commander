---
id: an-archived-agent-is-shown-on-duty
title: An ARCHIVED agent still holds a radar slot, and the surface says it is scanning
type: feature
status: open
priority: p2
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-deployment
blocked_by: []
tags: [battlegrid, radar, lifecycle, live, false-claim]
---

# An archived agent renders as on duty

Found 2026-08-06 on the second account, by joining the radar to the roster:

```
deployments: 15 with an ACTIVE agent, 1 with only archived agents, 0 empty
  SP500@15m  slots=Volatilis[ARCHIVED]
```

The radar still holds `Volatilis` in the `SP500@15m` slot. `Volatilis` has been
**archived**.

## Why this reaches a surface

`listAgents` reads `statuses: ['ACTIVE', 'ARCHIVED']`, so an archived agent
appears in the roster and has a page. `deploymentsFor`
(`src/domain/agent/deployment.ts`) filters deployments by `agentId` and **takes
no account of lifecycle**. So `/agents/[id]` renders, for an archived agent:

> On duty: scanning SP500 on the 15m radar.

An archived agent scans nothing. The sentence is definite and false.

The same join produces the other half: **SP500 is a market nobody is
scanning**, and no surface says that either. The radar reports the slot as
occupied, so it reads as covered.

## Why it is p2

Nothing is lost and no money moves — an archived agent cannot trade, which is
exactly why the claim is safe to be wrong about in the short term. It is
p2 because it is a *false statement about what is running*, on the surface an
operator uses to decide whether their coverage is intact. Someone reading "15
deployments" and "SP500 on duty" believes a market is covered that is not.

This is the same defect family as `an-orphaned-agent-is-shown-as-bound`, filed
the same day and from the same account: a surface asserting something definite
that the payload contradicts.

## What is not known

Whether BattleGrid *intends* an archived agent to keep its slot — whether
archiving is meant to vacate the radar and does not, or whether the slot is
deliberately preserved so reactivation restores coverage. Both are plausible
and neither is established. The product's job is to report the state
accurately, which it can do without settling that question.

## First step when taken

Join lifecycle to standing where deployments render. An agent that is not
`ACTIVE` is not on duty whatever the radar says — say it holds the slot and is
not scanning. Then, on the deployment surfaces, flag a policy whose slots hold
no active agent as a market that is deployed and unscanned.

`deploymentsFor` takes only `(deployments, agentId)` today; it will need the
agent's status, or the caller will need to pass it. Prefer the former — the
standing is a property of the pair, and computing it in the domain keeps every
surface honest at once.
