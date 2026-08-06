---
id: the-cost-of-an-agent-reads-differently-from-two-tools
title: last24hCostUsd is 0.09 on the list row and 0 on the detail read, for the same agent at the same moment
type: risk
status: open
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: ""
capability: agent-understanding
blocked_by: []
tags: [battlegrid, declared-vs-observed, divergence, spend]
---

# The same field, two reads, two answers

`list_intelligence_agents` and `get_intelligence_agent` return the identical
key set for an agent — thirty keys, and
`the-payload-carries-more-than-is-read` says so. The keys agree. **One value
does not.**

Account 2, agent `THE .0` (`26a60e91-6b5c-4a64-8138-04705ec2cf80`), 2026-08-06:

```
list_intelligence_agents  → last24hCostUsd: 0.09022839
get_intelligence_agent    → last24hCostUsd: 0
```

Every other key on the payload matched exactly — the comparison was run
field-by-field over the union of both key sets, and `last24hCostUsd` was the
only difference.

## It is not a moving value

That was the first explanation and it is wrong. Both reads were repeated about
three seconds later:

```
list.last24hCostUsd   : 0.09022839  then  0.09022839
detail.last24hCostUsd : 0           then  0
```

Stable in both, and stably different. A rolling 24-hour window would drift
downward in both reads, not sit at zero in one of them.

## Why it matters

Spend is a way for an agent to be stopped. The older account showed it
happening:

```
COST_LIMIT_REACHED   { error: "Daily cost limit reached ($6.0544 / $6)",
                       errorCategory: "COST_LIMIT" }
```

So the day this product renders what an agent has spent, **it must read that
figure from the list payload.** Reading it from `get_intelligence_agent` — the
natural place, on an agent's own page, from the agent's own read — would show
`$0.00` for an agent that has spent money and may be about to be halted for it.

That is the same shape as the `connectionId` defect: a wrong value from a
plausible source, invisible because nothing compared it against a second one.

## What is not known

Which one is right. `0.09022839` is the plausible figure for an agent that has
run 3 trades today, and `0` is the suspicious one — but neither has been checked
against a cost ledger, and BattleGrid publishes no other cost read
(`get_intelligence_agent`'s whole payload contains exactly one cost-named field,
and it is this one).

## Nothing is broken today

The product reads neither. `last24hCostUsd` is on the unmapped list in
`the-payload-carries-more-than-is-read`, which is why this is a risk rather
than a defect.

## First step when taken

Before mapping the field anywhere, re-measure both reads on an agent with
non-zero spend and decide which source is authoritative — then map only that
one, with a comment naming the other and why it is not used. A comparison test
against both reads would be better still, but it needs a live account with
spend, so it belongs beside the existing key-gated live probes rather than in
the deterministic suite.

## Evidence

Measured 2026-08-06 by a field-by-field comparison of the two reads on the same
agent, sampled twice.

## Related

- `the-payload-carries-more-than-is-read` — where `last24hCostUsd` is listed as
  the unmapped field worth looking at
- the `connectionId` defect — a wrong value from a plausible source, hidden by
  a fake that agreed with the code instead of the database
