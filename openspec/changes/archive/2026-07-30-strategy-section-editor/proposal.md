# Proposal: Strategy Section Editor

## Why

The compile → review → apply pipeline is complete and proven live. The compose
form above it edits one field: the tagline. Report sections are what a strategy
mostly *is* — BattleGrid organises them into categories, each containing
vocabulary the platform publishes at runtime. Until sections can be composed,
the pipeline exercises a change nobody particularly wants to make.

## What Changes

- The strategy edit form shows a section checklist grouped by category, with
  the strategy's current sections pre-selected.
- Available sections are fetched from BattleGrid at edit time via
  `list_strategy_categories` → `list_strategy_vocabulary({category})`, not
  from a compiled-in list.
- The compile request carries the user's chosen sections alongside the tagline.
  No pipeline change — `compilePlan` already accepts an arbitrary request object.
- The edit page switches from roster-level data (`listStrategies`) to full
  detail (`readStrategy`) so the current sections are available for pre-selection.
- A new port method `listCategoryVocabulary` and use case
  `ReadSectionOptionsQuery` encapsulate the concurrent vocabulary fetch; the
  domain adds a `SectionTemplate` type.

## Capabilities

**Modified**: `strategy-authoring` — the edit form gains section composition;
the "Vocabulary Is Discovered" requirement gains a scenario confirming sections
come from the platform.

## Out of Scope

- **Editing within a section** — metric construction hints, column contracts,
  per-metric parameters. `get_metric_construction_hints` and
  `get_strategy_column_contract` are not wired. Filed as `strategy-metric-editor`
  in backlog.
- **Live draft preview** — `preview_strategy_report` renders a bounded live
  preview. Deferred; useful but not required to compose sections.
- **Rule derivation** — `derive_strategy_rule_view` suggests signal rules from
  draft sections. Deferred; the user can adjust rules separately via signal
  rule editing (also unbuilt).
- **Signal rule editing** — which signals fire and at what allocation. Separate
  surface, not in this change.
- **Threshold and timeframe editing** — `minAggregateScore`, `minRequiredCount`,
  `minAtrPct`, `timeframe`, `regimeAutoDerive`. Out of scope here.
- **`marketReadText` editing** — the strategy's reasoning text. Out of scope here.

## Impact

- `src/domain/strategy/strategy.ts` — new `SectionTemplate` type
- `src/ports/strategies.ts` — new `listCategoryVocabulary` method + result types
- `src/infrastructure/battlegrid/strategy-adapter.ts` — implements the new method
- `src/application/use-cases/read-section-options.query.ts` — new use case
- `src/composition.ts` — wires the new use case
- `app/(app)/strategies/[id]/edit/page.tsx` — extended compose form + compile trigger
- New tests: use case unit test, adapter mapping test
