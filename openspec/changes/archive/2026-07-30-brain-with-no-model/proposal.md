# Proposal: Brain With No Model Reported As Unknown

## Why

When BattleGrid returns an agent whose payload carries neither `brainPreset`
nor `modelId`, `mapBrain` falls through to the `custom` arm and fabricates
`{ kind: 'custom', modelId: '' }`. An empty-string model ID is not a custom
brain — it is a brain nobody described. The product presents it as one anyway,
and every surface that renders a brain either shows a blank where a model name
should be, or defaults silently to some fallback the operator never chose.

## What Changes

- `Brain` gains a third discriminant: `{ readonly kind: 'unknown' }`.
- `mapBrain` returns `{ kind: 'unknown' }` when neither `brainPreset` nor
  `modelId` is present in the payload.
- `brainToArgument` is not extended — an `unknown` brain must never reach a
  write; the form guards it by not offering the brain as a writable field when
  it cannot be described.
- Surfaces that render a `Brain` handle the `unknown` case explicitly, naming
  it as undescribed rather than blank.

## Capabilities

**Modified**: `agent-authoring` — adds a scenario covering how a brain the
platform did not describe is shown.

## Out of Scope

- Deciding why BattleGrid returned an agent with no brain fields — that is a
  platform question.
- Allowing an operator to repair an unknown brain through Grid-Commander —
  the agent detail screen shows it; editing is out of scope until we know what
  repair looks like.
- Any change to the write path (`brainToArgument`, create/edit operations).

## Impact

- `src/domain/agent/brain.ts` — `Brain` type and `brainToArgument`
- `src/infrastructure/battlegrid/agent-mapper.ts` — `mapBrain`
- Any UI component that renders or switches on `Brain['kind']`
