# An agent can be read thinking

## Why

Grid-Commander is described as a workbench for **building, tuning, and
understanding** BattleGrid agents. Building and tuning now work, proven live.
Understanding is at zero: of 110 tools, 21 are used and **none** of the 28 that
carry an agent's reasoning.

The account has **340 thought-log entries** and the product cannot show one.

What is in them, read live before writing any of this:

```
outcome        AGENT_TRADE_THESIS 35 · SUBMITTED 10 · SKIPPED_LOW_CONFIDENCE 3 · ERROR 2
confidence     0.35  against a threshold of  0.35
snapshot       { coinTicker: LDO, thesisDirection: UP, primaryTimeframe: 1h }
reasoning      515 characters of the agent's own prose
```

`SKIPPED_LOW_CONFIDENCE` is the entry worth building for. It is an agent
declining to act because its own confidence did not clear its own bar — the
single most useful thing an operator can know, and the product has never been
able to say it happened.

**This was built against observation, not schema.** Five agent-internals reads
were called live first — `get_agent_thought_log`, `get_agent_performance`,
`get_agent_budget`, `get_agent_activity_feed`, `get_agent_fund_allocation` —
because three defects this week came from trusting a declared shape. The types
below are what the server returned, not what it advertises.

## What Changes

- A `ThoughtEntry` domain type: what the agent saw, what it concluded, how
  confident it was **against its own threshold**, and what happened.
- `AgentsPort.readThoughtLog`, backed by `get_agent_thought_log`, with the
  account-wide `get_user_thought_log` behind the same shape.
- Outcomes are **not** a closed enum. Four were observed; the repo has been
  burned twice by hard-coding a list the platform later grew. An unrecognised
  outcome renders as itself rather than being dropped or mislabelled.
- A route that shows an agent's decision cycles, newest first, with the
  confidence-against-threshold reading made explicit.
- The probe learns to call reads that need an id it can discover, so the next
  agent-internals tool is observed before it is modelled rather than after.

## Capabilities

- `agent-understanding` — new.

## Out of Scope

- **The other 23 agent-internals tools.** Budget gauges, performance curves and
  fund allocation were observed and their shapes recorded; building surfaces for
  them is separate work and each deserves its own reading.
- **Pagination controls.** The tools take `limit` and `page`; this reads the
  first page. A log of 340 entries needs paging, and it needs a design rather
  than a Next button bolted on.
- **The activity feed.** Observed (`GRID_GENERATED`, `AUTO_SUBMIT_TRIGGERED`,
  `AGENT_FUNDS_COMMITTED_WAGER`, and four more) and deliberately left. It is a
  different question — what happened — from what this change answers, which is
  why.
