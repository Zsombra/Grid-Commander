# Proposal: The Signal Vocabulary Is Readable

## Why

Phase 1, change 1 of the assistant roadmap (`an-assistant-over-the-use-cases`):
the strategy maker is the operator's named biggest gap between users and the
application, and its floor is vocabulary. A strategy's signal rules reference
signals by id (`rsi_oversold`, `macd_bull_cross`, …) that the product can
display but not explain — a user reading their strategy's rules today sees
identifiers, not meaning, and a user composing one has no way to learn what any
signal detects, when it fires, or what its parameters do.

BattleGrid publishes exactly this: `list_strategy_signals` (82 signals across
18 modules, compact summaries with direction and display copy) and
`get_strategy_signal_definition` (the full authoring card: what it detects, when
it fires, worked examples, best-for / watch-out guidance, a parameter schema
with defaults, and the indicators it reads). Both read-only, both observed live
2026-08-01 with the shapes recorded in the delta spec's scenarios.

## What Changes

- **`SignalsPort` reads on the strategies boundary**: `listSignals` (optionally
  narrowed by module) and `signalDefinition(signalId)` — mapped with the same
  refuse-whole-read rule every other mapper follows; an unreadable list is
  unreadable, never empty.
- **`/strategies/signals`** — the signal library, grouped by module: each
  signal's display name, direction (LONG/SHORT), and description, linked from
  the strategies section.
- **`/strategies/signals/[id]`** — one signal's authoring card: module,
  detects/fires, worked examples, best-for and watch-out guidance, parameters
  (name, bounds, default, description), indicators read.
- Rendering tests per branch, mapper tests over the live shapes, composition
  wiring.

## Out of Scope

- **`get_strategy_section_template`** — observed live 2026-08-01: the platform
  kind answers only `{sectionKey, title}`, nothing `list_strategy_vocabulary`
  does not already provide. Custom-template detail belongs to
  `strategy-metric-editor`.
- **Any write.** `update_strategy_signal_rule` (mutating, destructive-flagged)
  is the next change, full track.
- Per-timeframe availability assessment (the optional `timeframe` argument) —
  worth adding when the editor needs it; the reference surface does not.

## Capabilities

**Modified**: `strategy-authoring` — one ADDED requirement (the vocabulary is
readable). No existing requirement changes.
