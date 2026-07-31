# Proposal: A Position Preset Can Be Chosen, Carrying The Platform's Own Values

## Why

`get_trading_config_catalog` ships, for each of the five position-management
presets, the complete fourteen-field configuration that preset stands for —
and `mapPositionPresets` discards it at the boundary. Downstream, the create
form deliberately removed its preset select (offering a control the action
discarded was worse than not offering it), and every agent is created
`CUSTOM` with values nobody picked deliberately. An operator cannot say
"manage positions like a COLT". Verified live 2026-07-31: the catalog's
`config` blocks are present and complete, and the schema's
`positionManagement` object is closed to exactly those fourteen fields plus
the preset label — a preset's own values are a complete payload by
construction. Backlog: `preset-configs-are-discarded` (P2 feature).

## What Changes

- `mapPositionPresets` carries `config` (and `tagline`, `cardSummary`)
  through to the domain; a preset whose config the platform did not supply
  carries `config: null` — never an invented one.
- The create form regains a position-management select: the five catalog
  presets (label + description, offered only when their config arrived) plus
  `CUSTOM`, defaulting to `CUSTOM` (today's behavior, now named as a choice).
- Choosing a preset sends the platform's own fourteen values with the
  preset's label — no product-chosen value mixed in. `CUSTOM` keeps the
  assembled path, `OURS` booleans included; a chosen preset answers those
  three questions itself, so `OURS` applies to the CUSTOM path only.
- An unknown preset name, or one whose config is missing, is refused at
  validation — the same shape as an unknown brain preset.

## Capabilities

**New**: none
**Modified**: `agent-authoring` — one ADDED requirement: a position preset is
offered from the platform's catalog and sends the platform's own values.

## Out of Scope

- **The edit surface** (`agent-edit-form` / the fourteen-field editor with
  drift display) — the question item `a-preset-does-not-constrain-its-config`
  keeps that; this change is the create path only.
- **Removing the `OURS` booleans** — still needed for `CUSTOM`, which remains
  offerable. Recorded in the backlog item's closing note instead.

## Impact

`src/domain/agent/catalog.ts` (type), `src/infrastructure/battlegrid/agent-mapper.ts`,
`src/domain/agent/trading-config.ts` (preset builder),
`src/application/use-cases/create-agent.command.ts`,
`src/presentation/components/agent-form.tsx`, `app/(app)/agents/new/page.tsx`,
tests (mapper, command, wire conformance, fakes). No schema/DB impact.
