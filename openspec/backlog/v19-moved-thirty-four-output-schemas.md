---
id: v19-moved-thirty-four-output-schemas
title: The v19 output additions are surveyed — three adoptable reads remain unread
type: question
status: open
priority: p3
created: 2026-08-15
updated: 2026-08-16
change: ""
capability: platform-mapping
github: "301"
blocked_by: []
tags: [battlegrid, v19, schemas]
---

# v19 moved thirty-four output schemas

## What

The v19.1.0 re-probe (2026-08-15) recorded, against the v18.2.0 generation:

- **114 tools, none added, none removed** — the count proved nothing again.
- **No description changed. No annotation changed.** The read/write/destructive
  split is identical.
- **5 input schemas changed**, all shrinking: `apply_strategy_plan` (−9 leaves),
  `compile_strategy_plan` (−8), `preview_strategy_report` (−2),
  `derive_strategy_rule_view` (−1), `get_strategy_column_contract` (−1).
- **34 output schemas changed.** The large growths:
  `preview_strategy_report` **+66**, `compile_strategy_plan` **+60**,
  `list_gate_blocks` **+39**, `get_agent_budget` **+27**,
  `reset_agent_drawdown_baseline` **+27**, `get_signal_log` **+17**,
  `get_public_agent_signal_log_detail` **+17**, three signal-log reads **+15**
  each. Sixteen tools shrank by 2–4 leaves.

The input shrinkages are handled: the regime keys leaving `apply` and
`preview` are `the-plan-matches-the-live-contract` (#285, landed) and
`the-preview-matches-the-live-contract` (this session). **The output additions
are read by nothing.**

## Why it matters

This is #198's lesson recurring on schedule: "outputs drift when inputs do
not", and the reason the capabilities record exists at all. The additions are
not defects — a field the product does not read costs nothing — but they are
*unexamined*, and three of the largest sit on surfaces this product already
renders (`get_agent_budget`, `list_gate_blocks`, the signal logs). Something
the platform now publishes per response may already answer a question a
backlog item is holding open.

p3 because nothing is broken; it is a survey, and the record it needs is now
committed.

## Evidence

- `docs/battlegrid-mcp-capabilities.json` at v19.1.0 vs the v18.2.0
  generation in git history — the leaf-delta sweep above was produced by a
  structural diff of the two, not by eyeballing.
- Precedent: [[the-capabilities-record-was-a-major-version-stale]] (#198),
  where 188 output leaves across 11 tools moved unseen because nothing
  compared the third record.

## Notes

The survey is cheap and mechanical: for each of the eleven tools that grew,
read the added leaves out of the record and ask whether the product's mapper
for that tool drops something now answerable. The four signal-log reads
growing by the same +15/+17 suggests one shared block was added across the
family — likely worth reading first, since it lands on four surfaces at once.

Do **not** re-probe to do this; the record is current as of 2026-08-15.

## Surveyed — 2026-08-16

Done, by leaf-diffing the v19.1.0 record against the v18.2.0 generation
(`fbe0aa2`) and grepping every addition for a reader. Method and results are
reproducible from `docs/battlegrid-mcp-capabilities.json` alone.

### The metric above answers a different question than the one this item asks

The `+66 / +60 / +39 / +27 …` figures are **raw JSON node counts**, reproduced
exactly (34 schemas differ). Counting *readable property paths* instead —
what a consumer could actually read, union arms flattened, array items
collapsed — gives **27 schemas changed, 57 leaves added, 18 removed**.

Both are true. The node metric is the right one for detecting drift, which is
what the re-probe uses it for. It is the wrong one for "nothing has read the
additions", because most of the delta is `type`, `required` and `description`
nodes that no consumer reads. `preview_strategy_report` is +66 nodes and
**+19 readable fields**. Anyone sizing work off the node count will overestimate
it roughly threefold.

### The 18 removals are entirely accounted for

Every one is the `regimeAutoDerive` deletion already handled by #285/#287
(14 tools, plus `compile_strategy_plan`'s two `approvedPlan` paths and the
catalog's `defaultRegimeAutoDerive` / `defaultRegimeTimeframe`). **No removed
field has a reader in `src/`.** Nothing broke; the sweep confirms it rather
than assuming it.

### The 57 additions are five families, and one was a defect

1. **Market-read markers** — 38 of the 57, split evenly between
   `preview_strategy_report` and `compile_strategy_plan`: `marketReadMarkers[]`
   (`token`, `resolvedName`, `resolvedValue`, `status`, `qualifiedForms`,
   `index`, `end`), `marketReadPreview` (`gridText`, `tradeText`, `lensTicker`),
   `markerConditions[]` (with `unreferenceableReason`), `conditionsTableText`,
   `tradeConditionsBlockText`. All unread. This is the output half of
   [[the-preview-cannot-carry-a-market-read]] (#302) — noted there.
2. **`list_radar_deployments.summary.platformPaused` / `.radarPaused`** —
   unread, and the product renders "on duty: scanning" regardless. **Left as
   [[a-paused-radar-is-rendered-as-on-duty]] (#311), p2.** The survey's one
   defect.
3. **`list_gate_blocks.summary[]`** — `{gateStage, reasonCode, count,
   latestAt}`, plus `reasonDetail.evaluationFaultAttempts` /
   `evaluationFaultDetail`. Unread. `src/domain/agent/blocks.ts:118-163`
   builds this aggregate itself, from a **window** whose partiality that file
   goes to real trouble to admit. A platform-side summary is computed over the
   whole population, so this is not a like-for-like swap — it may retire the
   window caveat entirely, which is worth more than the saved arithmetic.
4. **`get_agent_budget.budget.blockedReason` / `.blockedSince`** (same pair on
   `reset_agent_drawdown_baseline`). Unread. The limits page asks exactly this
   question and currently cannot answer *why* or *since when*.
5. **`debriefVerdict`** on five signal-log reads (`get_signal_log`,
   `list_signal_logs`, `get_public_agent_signal_logs`,
   `get_public_agent_signal_log_detail`, `get_public_agent_realized_trades`).
   Unread. This confirms the item's own hypothesis about the +15/+17 cluster —
   one shared thing across several surfaces — with one correction: it is a
   **single field**, not a block, and it is five reads, not four.

Also: `list_strategy_vocabulary.rankedTimeframes`, unread — noted on
[[v19-narrowed-the-authorable-timeframes]] (#300), whose subject it is.

## Remaining scope

Three adoptable reads, each small, each landing on a surface this product
already renders: the gate-block summary (3), the budget block reason (4), the
debrief verdict (5). Family 1 belongs to #302 and family 2 left as #311.

Still p3: nothing is broken by any of the three, and each is an optional read
whose absence costs a caveat rather than a correctness claim.

## Observed 2026-08-16 — all three adoptable reads met live, and only one of them carries data

The survey was schema-side: the additions were *declared* and unexamined. All
three of the remaining adoptable families were read live at v19.2.0 today, while
answering #146, #147 and #299. **They do not rank equally, and the schema could
not have told you that.**

### (3) `list_gate_blocks.summary[]` — populated, load-bearing, and it does retire the caveat

Read four times today across two agents. Shape confirmed exactly as declared,
`{gateStage, reasonCode, count, latestAt}`, and populated every time:

```
Undertow, 2026-08-16T14:10Z          total 7147
  TOKEN      OPEN_POSITION_CONFLICT             6886  latest 14:04:52Z
  EVALUATION LLM_UNAVAILABLE                     140  latest 08-15T13:04:31Z
  TOKEN      EXCHANGE_MIN_NOTIONAL_UNREACHABLE    90  latest 14:00:25Z
  ACCOUNT    DAILY_TRADE_LIMIT_REACHED            22  latest 08-09T03:15:46Z
  EVALUATION LLM_OUTPUT_SCHEMA_INVALID             9  latest 14:09:11Z
```

**The hypothesis in this item is confirmed: it is computed over the whole
population, not the page.** The counts sum to 7,147 — the `total` — while the
page carried 100 rows. So it does retire the window caveat that
`blocks.ts:118-163` goes to real trouble to admit, and that is worth more than
the saved arithmetic, exactly as this item argued.

It is also already proving itself: **the summary is what answered #146** (the
churn series) and **what found the row that settled #299** (it named
`EXCHANGE_MIN_NOTIONAL_UNREACHABLE`'s `latestAt`, which is how the right page was
located). Two closed issues in one session came off this field.

`reasonDetail.evaluationFaultDetail` / `evaluationFaultAttempts` — the other half
of family 3 — were also **seen populated**, for the first time:

```json
{ "reasonCode": "LLM_OUTPUT_SCHEMA_INVALID",
  "reasonDetail": { "evaluationFaultDetail": "entry: Expected object, received string",
                    "evaluationFaultAttempts": 2 } }
```

### (4) `get_agent_budget.blockedReason` / `.blockedSince` — declared, never seen populated

`get_agent_budget(Undertow)` at 13:40Z, on an agent that had been refused an
entry 20 minutes earlier and was blocking ~120 times an hour:

```
blockedReason: null    blockedSince: null    haltedAt: null    haltReason: null
```

**Null while the agent was demonstrably being blocked.** So whatever
`blockedReason` reports, it is not the gate-block stream — the limits page's
question ("why, and since when") is *not* answered by this pair on the evidence
available. Per [[battlegrid-declared-vs-observed]] nothing may be built on it
until it is seen carrying a value.

### (5) `debriefVerdict` — declared, never seen populated

`list_signal_logs(Breakwater)`: `debriefVerdict: null` on all five rows read.
`get_signal_log` carries the key at the top level; also null. No value observed
on any read.

### What this does to "three adoptable reads"

**One is adoptable now; two are not yet.** The item's Remaining scope should read:

1. **`list_gate_blocks.summary[]` — take it.** Populated, whole-population,
   already earning its keep, and it retires a caveat the product currently
   writes prose to excuse.
2. **`blockedReason` / `blockedSince` — hold.** Declared and null under exactly
   the conditions that should populate it.
3. **`debriefVerdict` — hold.** Declared and null on every row seen.

That ordering is not a schema fact and could not have come from the diff. It is
the same lesson this item exists for, pointed the other way: **a declared output
is not an available one**, and the only way to tell is to read it while the
condition it describes is true.

Still p3. Nothing is broken by any of the three.
