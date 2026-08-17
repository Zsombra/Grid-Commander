---
id: agent-create-composes-fields-v14-refuses
title: The create/edit config paths compose two fields v14 refuses and omit the brain behavior it now requires
type: bug
status: done
priority: p1
created: 2026-08-08
updated: 2026-08-08
change: the-agent-write-follows-v14
capability: agent-authoring
blocked_by: []
tags: [battlegrid, v14, dead-write-path, live]
---

# Agent create is a dead write path at v14

## Closed 2026-08-08 by `the-agent-write-follows-v14`

The two dropped fields left `TRADING_CONFIG_FIELDS` the same session this
was filed, and the guards that stated the break are green on the v14
record. One correction against the original write-up: the brain half was
never a product defect — the product has modelled and sent
`brain.behavior` since findings-agents F-5, and the behavior-missing
refusals in the evidence below came from a raw one-off script omitting
the triple, not from the app's composition. What v14 changed there is
only that the platform now *requires* what the product already sends.

## What

BattleGrid v14.0.0 changed `create_intelligence_agent` and
`update_intelligence_agent` in two ways the product has not caught up with:

1. `tradingConfig` no longer accepts `atrTimeframe` or
   `atrMatchesStrategyTimeframe` — the write object went 20 → 18 fields,
   `additionalProperties: false` as always.
2. A `CUSTOM` brain now **requires** `behavior: {risk, outlook, conviction}`
   (`CONSERVATIVE|MODERATE|AGGRESSIVE`, `OPTIMIST|REALIST|PESSIMIST`,
   `CAUTIOUS|MEASURED|BOLD`). The product's `Brain` type has no behavior at
   all — the field the explorer renders as an agent's "behaviour triple" was
   read-only until now.

`TRADING_CONFIG_FIELDS` in `src/domain/agent/catalog.ts` still carries both
dropped names, so `buildTradingConfig` composes them into every create and
`applyEdit` merges them into every full-config edit. Every agent create the
product composes at v14 is refused; a config edit that reaches the platform
will be too.

## Why it matters

This is the ninth-plus-one instance of the repo's core defect class: a
composed write the platform refuses wholesale. `agent-authoring`'s create
form fails 100% at v14 with a refusal the form never anticipated. It is the
same shape as the `arenaChallengeEnabled` drop at v11 — but this one breaks
a core capability rather than an unused field.

## Evidence

Live, 2026-08-08, during the operator's agent build (this session ran the
product path first and was refused, then composed against the v14 schema
directly, which succeeded):

```
unrecognized_keys: ['atrMatchesStrategyTimeframe', 'atrTimeframe'] at tradingConfig
brain.behavior.risk: Required — expected 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
brain.behavior.outlook: Required — expected 'OPTIMIST' | 'REALIST' | 'PESSIMIST'
brain.behavior.conviction: Required — expected 'CAUTIOUS' | 'MEASURED' | 'BOLD'
```

Thrown by `McpAgentAdapter.createAgent` → `CreateAgentCommand.execute`
(`tests/live/` reproduction was a one-off, deleted; the refusal text is the
platform's own zod report). The v14 record in
`docs/battlegrid-mcp-surface.json` carries both facts declaratively:
`create_intelligence_agent.input_constants['tradingConfig.atrTimeframe']`
went from a 13-value enum to absent, and the CUSTOM brain variant's
`required` now lists `behavior`.

## Notes

- The fix should **derive the write list from the record** rather than
  edit the hardcoded array — "a check that matches how something is spelled
  rather than what it reaches" is the recurring lesson, and this list is
  spelled twice now (catalog.ts and the create/edit forms' field sets).
- The behavior triple needs a product decision: expose three selects on the
  create form (the platform's enums, read from the record), or default and
  say so. The explorer already renders these values for public agents, so
  the vocabulary is not new to the product.
- `positionManagementForPreset` and the sizing assembly are unaffected —
  both compose fields v14 still accepts.
- The working v14 composition (for the eventual fix's reference) is in this
  session's journal entry: 18-field `tradingConfig`, `brain: {kind:
  'CUSTOM', modelId, behavior}`.
