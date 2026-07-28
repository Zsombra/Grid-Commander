# Data Pipeline Review: author-agents

Against `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`.

## Scope

No new tables, no migration. BattleGrid is the source of truth for all agent
state (design D-G); the only local write in this change's path is the existing
audit log, which records what *this product* did rather than what the agent is.

## Pipeline Layers Touched

```
BattleGrid MCP → callTool (guards + audit) → agent-adapter → agent-mapper
   → domain agent → use case → component props
```

## Checklist Matrix

| Rule | Where | Evidence |
|---|---|---|
| Iron Rule — one source of truth per fact | `agent-mapper.ts` | Nothing about an agent is persisted. `grep -rn "agents" src/infrastructure/db/schema/` returns no table |
| No client-side recomputation | `agent-roster.tsx`, `agent-form.tsx` | Components render decided values. `CreationAvailability` is computed in `list-agents.query.ts:44`, not from `slots.remaining > 0` in the view |
| Capacity is the platform's number, not ours | `agent-mapper.ts:151` | `remaining` is taken from the response; derived only when absent. `tests/agent/mapper.test.ts::takes the platform's remaining count` |
| No silent defaults | `update-agent.command.ts:83` | Read-modify-write; the merged config is sent whole. `tests/agent/edit.test.ts::sends the whole config` |
| Missing data is a state, not a zero | `list-agents.query.ts`, `agent-adapter.ts:66` | Three-state `RosterResult`; `tests/agent/roster.test.ts::unreadable_is_not_empty` |
| Bounds validated against server-supplied values | `trading-config.ts:44` | `validateTradingConfig` takes the catalog as an argument — it has no bounds of its own to fall back on |
| Unvalidatable ≠ unbounded | `catalog.ts:66` | `checkBound` returns `'unvalidatable'`, not `true`, for a field the registry does not mention. `tests/agent/catalog.test.ts::reports an unbounded field as unvalidatable` |
| A field cannot be sent unvalidated | `update-agent.command.ts:75` | An unreadable catalog fails the edit rather than sending the limits anyway. `tests/agent/edit.test.ts::will not send money limits it could not validate` |

## Contract Map

| Fact | BattleGrid | Domain | Presentation |
|---|---|---|---|
| Agent identity | `id` | `Agent.id` | key only |
| Concurrency token | `revision` (int) | `Agent.revision` — required, never defaulted | hidden input |
| Lifecycle | `status: ACTIVE\|ARCHIVED` | `AgentStatus` | badge |
| What this client may do | `capabilities.{canEdit,canArchive,canEditOverlay}` | `AgentPermissions` (3 of 4) | which actions render |
| **Deletion** | `capabilities.canDelete: true` | **not mapped** | **no affordance** |
| Binding | `strategyId`/`Name`/`Revision`, `bindingState` | `StrategyBinding` | "Bound to X at revision N" |
| Reasoning | `brainPreset` XOR `modelId`+`behavior` | `Brain` union | two mutually-exclusive selects |
| Money limits | `tradingConfig` (25 fields, all-or-nothing) | `TradingConfig.fields` (opaque) | preset select |
| Capacity | `slotUsage.{limit,used,remaining,rank}` | `SlotUsage` | "N slots remaining" / at-capacity notice |

The `canDelete` row is the one worth reading twice. BattleGrid reports the
capability; the MCP surface has no tool that performs it. A pipeline that
propagated every field faithfully would carry a true flag all the way to a
button that cannot work. See findings-agents F-1.

## Findings

**F-1 — one fact is deliberately dropped between layers.** Documented above.
Faithful propagation is the default rule and this is the declared exception.

**F-2 — the trading config is the only value that survives a round trip
unmodified.** It arrives whole, is merged in the domain, and goes back whole,
because the platform rejects nothing and *resets* what is omitted. The read is
part of the write, not a lookup before it — `tests/agent/edit.test.ts::editing one
limit preserves the others` is the test that would fail if someone "optimised"
the read away.

## Status

EVIDENCE RECORDED
