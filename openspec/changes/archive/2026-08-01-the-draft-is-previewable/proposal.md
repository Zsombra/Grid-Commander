# Proposal: The Draft Is Previewable

## Why

Phase 1's closing change. The signal library explains signals, the metric
workbench explains columns, the retune ceremony changes weights — and none
of them answers the question everything else serves: **what does the agent
actually read?** The platform answers it without saving anything:

- **`preview_strategy_report`** renders the draft's sections as the literal
  prompt text an agent would receive, over a bounded live coin selection,
  with an estimated token count (model named) and budget usage against the
  platform's caps. Observed live 2026-08-01 on Dunkirk's own composition:
  five rendered sections, 1393 tokens (`o200k_base`), four budget gauges.
- **`derive_strategy_rule_view`** derives report membership for every
  signal against the draft: which signals this composition can feed
  (`inReport`/`status`), the canonical default allocation, and default
  params. This is the missing bridge between the section checklist and the
  scorecard — it says which weights would actually do something.

Both read-only, both persisted-state-free. This is also the assistant's
future dry-run loop: propose sections → preview text and budget → check
membership → only then compile.

## What Changes

- **Port reads**: `previewReport` (timeframe, regime flags, sections, coin
  selection → rendered sections, token estimate + model, budget gauges) and
  `deriveRuleView` (sections → per-signal membership rows).
- **`/strategies/[id]/preview`** — previews the strategy's current
  composition, read fresh: a small coin-selection form (ranked top-N or
  explicit tickers), then the agent's-eye report per section, the token
  estimate, the budget gauges as used/cap, and the membership summary —
  which signals this composition feeds (with their platform defaults) and
  how many it does not. Linked from the strategy page.
- Rendering tests per branch, mapper tests over the live shapes, key-gated
  live probe.

## Out of Scope

- Previewing *edited* (not-yet-applied) section drafts — the edit page's
  form state does not round-trip through a link yet; this surface previews
  what the strategy holds. The draft-composer preview joins when the
  section editor learns to carry a draft in the URL.
- Custom-section drafts beyond what the detail read carries (`kind`,
  `sectionKey`): if the platform demands a fuller self-contained definition
  for a custom section, its refusal surfaces honestly on the page.
- `conditionOutcomes` — empty on every observation; carried opaque, not
  rendered.

## Capabilities

**Modified**: `strategy-authoring` — one ADDED requirement.
