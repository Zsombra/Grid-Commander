# The edit path cannot succeed either

## Why

`update_intelligence_agent` cannot change an agent's trading configuration. Not
for some agents — for every agent on the account, every time.

Established against the live server:

```
get_intelligence_agent  → tradingConfig with 23 keys, on all four agents
update_intelligence_agent.tradingConfig
    additionalProperties: false
    accepts strategyTimeframe:  false
    accepts regimeAutoDerive:   false
    accepts regimeTimeframe:    false
```

The product reads the config, merges the operator's change into it, and sends
the result back:

```ts
const merged = applyEdit(current, req.tradingConfigChanges);
changes = { ...changes, tradingConfig: merged.fields };
```

`applyEdit` is `{ ...current.fields, ...changes }`. `current.fields` is whatever
the read returned — 23 keys. So the write carries three the schema rejects, and
`additionalProperties: false` refuses the whole object.

**This is the create defect's sibling, one path over.** Same week, same shape:
a call that has never succeeded and could not have, because nothing compared
what the product sends against what the platform accepts.

## The part worth dwelling on

The mismatch was already known. `trading-config-read-shape-is-not-write-shape`
was filed on 2026-07-28 and names all three fields correctly. It says:

> **`agent-edit-form` is specified as a read-modify-write** … The obvious
> implementation reads the current config, merges the user's change, and sends
> the result back. That implementation fails.

It reads as a warning about a form nobody has built yet. Nobody checked whether
the product *already contained* the implementation being warned about. It did —
`update-agent.command.ts` has shipped that exact read-modify-write since it was
written.

So this is the second time in two days that the fact was in the repository and
the defect survived anyway. The first was `enum(MANUAL|VOLATILITY_AUTO)` sitting
in `BATTLEGRID_MCP_REFERENCE.md` while the product sent `FIXED`. A backlog item
describing a defect is not a guard against it, and neither is a reference
document.

## What Changes

- `applyEdit` projects onto the fields the write schema accepts, rather than
  passing through whatever the read produced. `TRADING_CONFIG_FIELDS` is already
  that list — the twenty names create has always been assembled from.
- The projection is not silent. `applyEdit` returns what it dropped, so a caller
  can say so rather than discovering it in a refusal.
- The edit path gains the completeness check the create path has always had. A
  merged config missing a required field is refused before it is sent, because
  a partial `tradingConfig` does not error — it **resets** the fields it omits.
- A conformance guard checks every payload the product builds against
  `additionalProperties: false`, so sending an unaccepted key fails a test rather
  than a live call. The probe records the accepted property set to check against.
- The live write probe covers the edit path end to end, on a probe agent with
  `tradingMode: OFF`.

## Capabilities

- `agent-authoring` — one requirement added, one modified.

## Out of Scope

- **Building `agent-edit-form`.** This makes the existing update path work; it
  does not add a surface. The form remains backlogged.
- **The three read-only fields as *readable* values.** `strategyTimeframe`,
  `regimeAutoDerive` and `regimeTimeframe` stay on the domain object and stay
  displayable. They are real facts about an agent; they are simply not writable,
  and this change is about the write.
- **The other 161-param sweep.** Investigating this found that
  `apply_strategy_plan` (64 of its 68 required paths live inside the server's own
  `approvedPlan`, handed straight back), `compile_strategy_plan` (the UPDATE
  branch needs six, and all six are sent) and `update_intelligence_agent`'s
  top-level requirements are all correct. The raw count overstated the risk.
  The general sweep is still worth building — see backlog.
