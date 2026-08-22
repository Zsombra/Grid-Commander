---
id: the-payload-carries-more-than-is-read
title: The agent payload carries six more fields nothing reads
type: question
status: done
priority: p3
created: 2026-07-29
updated: 2026-08-16
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

## 2026-08-12 (v18.2.0) — all six still arrive, and the cost split is confirmed at v18

Read-only, `get_intelligence_agent` on Undertow against this session's
`list_intelligence_agents` payload.

**The six are still there, still unread**: `last24hCostUsd`, `activeGameCount`,
`hasActiveAssignments`, `provider`, `modelDisplayName`, `avatarUrl` /
`modelImageUrl`. v18 added none and removed none — consistent with the surface
diff, which found no input schema changed and no tool added or removed.

**`provider` is still `null`** — three probes now, across three majors. It has
never carried a value on this account, so there is nothing to map even if
something wanted it.

**The cost disagreement reproduces, and this is the fifth measurement and the
first at v18:**

| tool | Undertow | Breakwater |
|---|---|---|
| `list_intelligence_agents` | **0.83259263** | **0.37747612** |
| `get_intelligence_agent` | **0** | — |

Same agent, same session, calls minutes apart, every other key identical. That
is the behaviour `the-cost-of-an-agent-reads-differently-from-two-tools`
recorded and `the-brains-name-and-the-spend-are-read` fixed by reading spend
from the **list**. **That decision is still correct at v18.2.0** — worth saying
plainly, because it is the kind of workaround someone eventually tries to
simplify away.

**Unrelated but observed while here**, for
`preset-custom-in-the-preset-branch-is-unestablished` (#106): Undertow reads
back `brainPreset: "CUSTOM"` alongside a real `modelId` (`z-ai/glm-5.2`) and a
full `behavior` block. So `CUSTOM` is at least a *readable* preset value on a
live agent, which is more than the item had. It still does not establish what
`create_intelligence_agent` does with `{kind:"PRESET", preset:"CUSTOM"}` — that
needs a write, and this sweep was read-only.

## Re-checked 2026-08-14 — nothing moved, and the cost split is untestable today

Read-only, list + detail on Undertow in the same minute. Both reads answer
`last24hCostUsd: 0` — agreement, but the fleet has been idle since 2026-08-12
(no trades, no games), so zero is plausibly the true 24h spend; a zero/zero
pair cannot exercise the list-vs-detail split either way. The read-from-the-list
decision stands untouched.

`provider: null` on all three agents — fourth consecutive probe, fourth major.
`activeGameCount: 0` and `hasActiveAssignments: false` on all three — still
falsy observations only, still unexplained. The four deliberately unmapped
fields stay unmapped; nothing has asked for them and nothing has been observed
that would let them be mapped honestly.


## Measured 2026-08-16 — all six observed, and the ceiling is confirmed unreadable

Read live at v19.1.0 over the authenticated MCP connector. Read-only.
`list_intelligence_agents` returns 29 keys per agent. The six, on the three
ACTIVE agents:

```
last24hCostUsd        Vanguard 0.08093531  Undertow 0.7340375  Breakwater 0.29225819
activeGameCount       0     on all three
hasActiveAssignments  false on all three
provider              null  on all three
modelDisplayName      "GLM-5.2" on all three
avatarUrl / modelImageUrl   populated CDN URLs on all three
```

### The open question is answered, and the answer is no

*"Whether the cap itself is readable is unknown; only the breach event and the
running total have been seen."* — **it is not readable.** There is no cost
ceiling on any read available to this account:

- **Not on the agent payload.** Scanning all 29 keys for a cost or limit field
  returns `last24hCostUsd` and `capabilities`, and nothing else.
- **Not on `get_agent_budget`.** Its four gauges are `dailyTrades`, `exposure`,
  `drawdown`, `dailyLoss`. There is no cost gauge and no cost field anywhere in
  the block.

So the running total is readable and the ceiling that halts the agent is not.
That sharpens what `/limits` should do: it can honestly show spend-to-date as a
fifth way to be stopped, and it must say the ceiling is **not published** rather
than imply there is none — the same distinction `get_agent_budget` draws itself
when it documents `configured: false` as "no limit is set, which is NOT a limit
of zero".

`provider: null` also settles the cheap half. `modelDisplayName` is the field
that can replace the agent page's `CUSTOM`; `provider` cannot help, because the
platform does not populate it.

## Re-checked 2026-08-16 (v19.2.0) — the cost split reproduces under load, and it is the sharpest reading yet

The 2026-08-14 check could not exercise the list-vs-detail split: the fleet had
been idle since 2026-08-12, both reads answered `0`, and a zero/zero pair
falsifies nothing. **Today the fleet is trading** — Undertow shows
`tradesToday: 11` on `get_agent_budget` and holds three open positions — so the
read that was impossible two days ago is possible now.

| tool | Undertow | Vanguard | Breakwater |
|---|---|---|---|
| `list_intelligence_agents` | **1.1710347** | 0.37036041 | 0.36110846 |
| `get_intelligence_agent` | **0** | — | — |

Sixth measurement, first at v19, and the **first taken while the agent was
actively spending**. Same agent, same minute, every other key identical across
the two payloads. The detail read reports zero against $1.17 of real spend.

**This is the reading that makes the workaround defensible rather than merely
inherited.** Every prior confirmation was either on a small non-zero (0.09,
0.83) or on an idle fleet where zero was plausibly true. A dollar of spend
reported as zero cannot be read as rounding, staleness, or a quiet fix.

The product's decision — map spend from the list only — is **correct at
v19.2.0** and is already enforced rather than just documented:
`agent-mapper.ts:120` reads it in `mapRosterAgent`, `mapAgent` pins it to
`null` (`:96`), and `tests/agent/mapper.test.ts:174,182` assert both directions.
Nothing to change; this note exists so the next person to consider "simplifying"
the two mappers into one finds the measurement that says why they are two.

### The other four, unchanged

- **`provider`** — `null` on all three agents. Fourth probe, now spanning v17,
  v18 and v19. Never seen carrying a value on this account.
- **`activeGameCount`** — `0` on all three. **`hasActiveAssignments`** — `false`
  on all three. Both still falsy everywhere, so both stay exactly as unexplained
  as they were; three falsy observations is not an observation of the field.
- **`avatarUrl` / `modelImageUrl`** — present on all three, still presentation
  this product has no use for.

`modelDisplayName` reads `"GLM-5.2"` on all three (mapped since 2026-08-07).

### Recorded in passing

Vanguard runs `tradingMode: APPROVAL_REQUIRED` — it is the agent whose decisions
reach the approval queue, which matters to #101 and #304 and is stated here
because this read is where it was visible.
