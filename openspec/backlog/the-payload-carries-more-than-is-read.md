---
id: the-payload-carries-more-than-is-read
title: The agent payload carries six more fields nothing reads
type: question
status: open
priority: p3
created: 2026-07-29
updated: 2026-08-12
change: ""
capability: agent-understanding
github: "110"
blocked_by: []
tags: [battlegrid, agent-understanding, mapping]
---

# The agent payload carries six more fields nothing reads

`list_intelligence_agents` and `get_intelligence_agent` return the identical
thirty keys. After `performance-was-already-in-the-payload`, these are unmapped:

```
last24hCostUsd        activeGameCount     hasActiveAssignments
provider              modelDisplayName    avatarUrl / modelImageUrl
```

**`last24hCostUsd` is the one worth looking at.** The older account showed that
an agent can be stopped by spend, not just by loss:

```
COST_LIMIT_REACHED   { error: "Daily cost limit reached ($6.0544 / $6)",
                       errorCategory: "COST_LIMIT" }
SKIPPED_COST_LIMIT   (thought outcome, twice)
```

So there is a ceiling that halts an agent, and the product's `/limits` page —
titled *what would stop this agent* — does not mention it. That page shows four
gauges from `get_agent_budget`, all about money lost or at risk. Spend is a
fifth way to be stopped and it is invisible there.

Whether the cap itself is readable is unknown; only the breach event and the
running total have been seen. Worth one probe before any modelling.

## Not the same as the others

`modelDisplayName` and `provider` are the human names for a brain the agent page
currently shows as `CUSTOM` — cosmetic, but cheap. `avatarUrl` and
`modelImageUrl` are presentation the product has no use for.
`hasActiveAssignments` and `activeGameCount` are unexplained.

These stay unmapped because nothing has asked for them — deliberately a
different reason from the performance block, which was excluded by a rule that
turned out to be one step too wide.

## Related

- `performance-was-already-in-the-payload` — declared these out of scope

---

# Probed 2026-08-06 — the cost ceiling is not readable, and one field disagrees with itself

The item asks for "one probe before any modelling". Here it is, on account 2's
only active agent (`THE .0`, which trades).

## `last24hCostUsd` — the field worth looking at, and it is worse than unmapped

**The list read and the detail read disagree, stably:**

```
list_intelligence_agents  → last24hCostUsd: 0.09022839
get_intelligence_agent    → last24hCostUsd: 0
```

Sampled twice, three seconds apart, identical both times in both reads. Every
other key on the payload matched exactly. Filed as
`the-cost-of-an-agent-reads-differently-from-two-tools`; the consequence for
this item is that **whichever surface reads spend must read it from the list**,
and a comment must say why.

## The ceiling itself is not published

The whole of `get_intelligence_agent` contains exactly **one** cost-named field,
and it is `last24hCostUsd`. `get_agent_budget` — the read behind `/limits` —
carries no cost field at all:

```
maxConcurrentExposureUsd, maxCumulativeDrawdownUsd, capitalAtRiskUsd,
headroomUsd, realizedPnlUsd, drawdownUsd, haltedAt, haltReason,
perTradePushEnabled, maxDailyLossUsd, dailyRealizedPnlUsd, accountEquityUsd,
budgetOverSubscribed, effectiveNotionalUsd, openUnrealizedPnlUsd,
stopBelowSingleTradeLoss, stopEffectivelyUnbounded, maxDailyTrades,
tradesToday, gauges{dailyTrades, exposure, drawdown, dailyLoss}
```

So the answer to *"whether the cap itself is readable is unknown"* is: **it is
not.** The only place the number has ever appeared is inside the breach message
(`"Daily cost limit reached ($6.0544 / $6)"`), as prose.

**That settles what `/limits` can honestly do.** It cannot add a fifth gauge —
a gauge needs a ceiling and there is none to read. What it *could* say is that
spend is a fifth way to be stopped, and show the running total without a bar
beside it. Whether that is worth a surface is a judgement, but it is no longer
blocked on a question.

## The other five

```
activeGameCount        0
hasActiveAssignments   false
provider               null
modelDisplayName       "GLM-5.2"
avatarUrl/modelImageUrl  present
```

`modelDisplayName` is **populated and useful** — the agent page shows this
agent's brain as `CUSTOM`, and `GLM-5.2` is the human name for it. That is the
cheap cosmetic win the item predicted, and it is real.

`provider` is `null` on the one agent measured, so the pair
"provider + modelDisplayName" is not a pair — only one of them answers. Nothing
should render "provider" until an account is seen where it is not null.

`activeGameCount` and `hasActiveAssignments` were both falsy on the only agent
available to measure, so they stay exactly as unexplained as they were. An
observation of one zero is not an observation of the field.

---

# Two of the six landed 2026-08-07 — the item stays open for the other four

`the-brains-name-and-the-spend-are-read` mapped the two fields this item and
its probe singled out:

- **`modelDisplayName`** — mapped on both reads (they agree on it) and
  rendered on the agent page's brain line, which used to show the bare
  flattened `CUSTOM`. Falls back to exactly what the line showed before when
  the platform names nothing; claims nothing about preset-vs-custom.
- **`last24hCostUsd`** — mapped from the list only, per
  `the-cost-of-an-agent-reads-differently-from-two-tools` (now done, against
  the same change); rendered on `/agents/[id]/limits` as a running total with
  no gauge, because the probe above established the ceiling is not readable.

Still unmapped, deliberately, because nothing has asked for them:
**`provider`** (observed only null — nothing renders a field never seen
populated), **`avatarUrl` / `modelImageUrl`** (presentation the product has
no use for), **`activeGameCount`** and **`hasActiveAssignments`** (both
unexplained; one falsy observation each). The exclusion comment in
`src/domain/agent/agent.ts` and the noise assertion in
`tests/agent/mapper.test.ts` both name these four.

The `change:` link to `performance-was-already-in-the-payload` was cleared
2026-08-12: that change archived long ago, and the two fields that later
landed did so under a different change (`the-brains-name-and-the-spend-are-read`,
also archived). What stays open here is only the watch on the four
deliberately unmapped fields — `provider` was observed null again on all
three agents on 2026-08-12 (v17.2.0), so nothing has moved.
