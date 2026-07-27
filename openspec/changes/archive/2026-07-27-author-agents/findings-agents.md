# Findings: what the live server says about agents

Tasks 0.1–0.3, run against `https://mcp.battlegrid.trade/mcp` on 2026-07-27 with
a real account. Three read-only calls: `list_approved_models`,
`get_trading_config_catalog`, `list_intelligence_agents`. **No mutating tool was
called.**

The point of running these before designing the form is that every one of them
changed something. A form built from the documentation would have been wrong in
four places.

---

## F-1 — The server tells you what is editable, per agent, and it is not the same as what is callable

Every agent in `list_intelligence_agents` carries:

```json
"capabilities": { "canEdit": true, "canDelete": true, "canArchive": true, "canEditOverlay": true }
```

This is better than inferring editability from `isSystemDefault`, and it is what
requirement *Agents The Platform Owns Are Not Presented As Editable* should be
driven by.

**But `canDelete: true` is a trap.** There is no delete tool in the MCP surface —
only `archive_intelligence_agent` and `activate_intelligence_agent`, and the
platform's own tool description says *"permanent delete is not available over
MCP"*. `capabilities` describes what BattleGrid's first-party app can do, not
what this client can.

**Consequence**: drive edit and archive affordances from `capabilities`; never
render a delete affordance, whatever the flag says. A client that mapped the flag
set to buttons would offer an action it cannot perform, and blame the user when
it failed.

## F-2 — Bounds are a real registry, and it does not cover every bounded field

`get_trading_config_catalog` returns `tradingDefaults.bounds` — sixteen genuine
limits, e.g. `maximumStopLossPct: 25`, `maximumMaxSlippageBps: 1000`,
`maximumMaxDailyTrades: 100`, `agentMinTradeConvictionFloor: 0.2`.

It does **not** carry bounds for everything the create schema constrains:
`positionSizePresets.{small,medium,large}Pct` are documented as 0.5–100 in the
tool schema and appear nowhere in the registry, `signalTimeoutMinutes` is an
enum of 5/10/15, and `positionSizePresets` additionally requires *monotonic
ordering* — small ≤ medium ≤ large — which is stated in prose and in no
machine-readable field at all.

**Consequence**: validation has two sources and neither is complete on its own.
The registry is authoritative where it speaks; the tool's own input schema
covers the rest. Requirement *Agent Fields Are Offered Only From Values The
Platform Confirms* is satisfied by reading both, and by treating a field that
appears in neither as unvalidatable rather than as unbounded.

## F-3 — There are five position-management presets, not four

Live: `COLT`, `WEBLEY`, `BERETTA`, `LUGER`, `WALTHER`. The create schema's enum
adds `CUSTOM`. `docs/BATTLEGRID_SURFACE_MAP.md:85` lists four — it predates
WEBLEY.

This is the staleness the server warns about, caught inside a week, on a
low-stakes field. It is the argument for requirement *Agent Fields Are Offered
Only From Values The Platform Confirms* stated as concretely as it could be: a
hard-coded preset list would already be wrong.

## F-4 — Capacity comes back with the roster

`list_intelligence_agents` returns `slotUsage` alongside `agents`:

```json
"slotUsage": { "level": 3, "rank": {"name": "RECRUIT", "tier": 3, "displayName": "Recruit III"},
               "limit": 3, "used": 2, "remaining": 1 }
```

**Consequence**: requirement *Capacity Limits Are Explained Before The Work* needs
no additional call and no local counting. The roster read already knows, and it
knows *why* — the limit is a function of rank and level, which is the part worth
telling the user. "No slots left" is unhelpful; "Recruit III allows 3" is
actionable.

## F-5 — `brain` is a discriminated union, and mixing the variants is invalid

Either a named preset (`MONTGOMERY`, `KESSELRING`, `CHUIKOV`, `EISENHOWER`,
`ZHUKOV`, `NIMITZ`, `BRADLEY`, `ROMMEL`, `PATTON`, `YAMAMOTO`) which carries its
own model *and* trader soul, or a custom `{modelId, behavior{risk, outlook,
conviction}}`. The schema says: **never both**.

**Consequence**: model this as a union in the domain, not as an object with
optional fields. An optional-fields shape makes the invalid state representable,
and the invalid state here is one the server will reject after the user has
filled in a form.

## F-6 — `tradingConfig` is all-or-nothing

Every field inside `tradingConfig` is marked required *when `tradingConfig` is
provided*. There is no partial trading-config update: supplying the object means
supplying all of it, including the entire nested `positionManagement` block.

**Consequence**: an "edit one limit" interaction has to read the agent's current
config, change the one field, and send the whole object back. That read is not a
convenience — it is a correctness requirement, and it must carry the revision.

## F-7 — The agent's shape confirms the ownership split

An agent carries `revision` (integer, `6` on a live agent), plus
`strategyId` / `strategyRevision` / `strategyName` / `bindingState: "BOUND"`.
Agent-owned: `displayName`, `brainPreset` / `modelId` / `behavior`,
`tradingConfig`, `arenaChallengeEnabled`, `overlayText`. Strategy-materialized:
`contextSources` (21 flags) and the prose.

**Consequence**: the ownership table in `field-ownership.ts` is not a guess — it
is transcribable from the live payload plus `update_intelligence_agent`'s
schema, and the boundary the product must not blur is the one the API already
draws.

---

## What was not established

- **Whether `create_intelligence_agent` validates monotonic ordering server-side
  or trusts the client.** Establishing it requires creating an agent, which is a
  mutation on a real account with 1 slot remaining. Not attempted. The client
  validates it regardless, which is correct either way.
- **What a rejected bound actually returns.** Same reason. Error-shape handling
  is written defensively against the general JSON-RPC error path rather than
  against a specific message.
