# Proposal: Retire Dead Agent Fields

## Why

`arenaChallengeEnabled` and `overlayText` were dropped from BattleGrid's agent
surface between v9 and v11. No tool on the 114-tool surface accepts, returns,
or reads either field. Yet the product still models both: `Agent` carries them
as constants (false and null on every agent), `AGENT_OWNED_FIELDS` lists them
as proposable, the create port accepts `arenaChallengeEnabled`, and the
`propose_agent_change` MCP tool description names both as editable.

A model can propose a change to either field that no apply step could ever carry
to the platform. And the domain carries two fields whose values are the mapper's
default, not the platform's answer — the exact shape this codebase refuses
everywhere else.

## What

Remove both fields from:

1. `Agent` domain type (`src/domain/agent/agent.ts`)
2. `AGENT_OWNED_FIELDS` tuple (`src/domain/agent/field-ownership.ts`)
3. Agent mapper — raw shape and mapping (`src/infrastructure/battlegrid/agent-mapper.ts`)
4. Create port param and adapter (`src/ports/agents.ts`, `src/infrastructure/battlegrid/agent-adapter.ts`)
5. Create command DTO and forwarding (`src/application/use-cases/create-agent.command.ts`)
6. Describe-edit query's `overlayText` branch (`src/application/use-cases/describe-edit.query.ts`)
7. `propose_agent_change` MCP tool description (`src/mcp/tools.ts`)

## Capabilities touched

- **agent-authoring** — domain model and field-ownership table change
- **mcp-control** — proposable field vocabulary shrinks (derived from field-ownership)

## Out of scope

- Whether the platform's UI still shows arena participation somewhere — the
  MCP surface settled it: no tool reads or writes either field
- Test updates — tests that reference these fields will need updating but are
  mechanical follows from the source changes

## Why skip_specs

The specs already describe the correct behavior. "Agent Fields Are Offered Only
From Values The Platform Confirms" and "A Field Offered Reaches The Operation It
Configures" both require that fields come from the platform and reach operations
that accept them. Neither spec names these specific fields. Removing dead fields
aligns code with spec; no spec text changes.

## Backlog

Closes `two-agent-owned-fields-no-tool-can-write` (GitHub #113).
