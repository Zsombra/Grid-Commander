# Design: Strategy Section Editor

## Technical Approach

The compose form gains a section checklist above the tagline. The checklist is
server-rendered: a new use case (`ReadSectionOptionsQuery`) fetches the strategy
detail and per-category vocabulary concurrently, returns grouped section
templates, and the page pre-checks those whose `sectionKey` matches the
strategy's current sections.

The form submits via GET. Checked sections appear as `sections=sectionKey`
params in the URL (one per selected section). Sections from the strategy whose
`sectionKey` does not appear in any vocabulary template are preserved as
`unknownSections=kind:sectionKey` hidden inputs so they survive the round trip.
When the page detects a `compile=1` param it compiles; otherwise it shows the
compose form.

No pipeline changes. `compilePlan` already accepts any `request` object. The
compile intent gains a `sections` field alongside `tagline`; both remain
optional in the request so either can be changed without the other.

## Decisions

### Decision: GET form with `compile=1` trigger
Chosen because it matches the existing server-component pattern (tagline used
the same idiom) and needs no client-side JavaScript. Rejected: `POST` form
action because it breaks back-navigation (a user who compiles, reviews, and
presses Back should land on their filled-in form, not on a stale POST result).

### Decision: `compile=1` instead of detecting non-empty `tagline`
The tagline is optional — a user may want to change only sections. Using tagline
presence as the compile trigger forces a tagline change every time. A dedicated
`compile` param decouples them. Rejected: treating any param presence as compile
trigger because it would fire on direct URL shares.

### Decision: Preserve unknown sections as hidden inputs
Sections from the strategy whose `sectionKey` is not in vocabulary are
preserved in the compiled request via hidden inputs. Rejected: dropping them
silently because that would cause a compile request that strips sections the
user never intended to remove, and the platform has the authoritative view of
what a section key means.

### Decision: `ReadSectionOptionsQuery` fetches vocabulary concurrently per category
After `list_strategy_categories` resolves, vocabulary for all categories is
fetched concurrently. A single failed category does not fail the whole query —
its templates are omitted and logged. Rejected: fetching sequentially because
with 8–10 categories the page load would be unacceptably slow.

### Decision: Edit page switches from `listStrategies` to `readStrategy`
`readStrategy` returns the full `StrategyDetail` including `sections[]`, which
is needed to pre-select the checklist. `listStrategies` returns only the roster
summary (`sectionCount: number`). The cost is one additional BattleGrid call,
acceptable for an edit page. Rejected: calling both and merging because that
adds complexity with no benefit.

### Decision: Domain boundary respected — `SectionTemplate` in domain, not adapter
The template type lives in `src/domain/strategy/strategy.ts` so use cases can
refer to it without importing from infrastructure. The adapter maps the raw
BattleGrid payload to `SectionTemplate`; the domain type is the stable surface.

## Data Flow

```
Edit page load (no compile param)
  │
  ├─► ReadSectionOptionsQuery.execute({ authority, strategyId })
  │     ├─[concurrent]─► readStrategy  → StrategyDetail (has sections[])
  │     └─[concurrent]─► readVocabulary → categories[]
  │           └─[concurrent, per category]─► listCategoryVocabulary
  │                       → { templates: SectionTemplate[] }
  │     └─► returns { kind: 'ready', detail, categories: CategoryOptions[] }
  │
  └─► Server renders:
        - section checklist (pre-checked = detail.sections ∩ vocabulary)
        - unknown sections as hidden inputs (detail.sections \ vocabulary)
        - tagline field (pre-filled from detail.summary.tagline)
        - compile=1 hidden input

Form submit (GET) → URL: ?compile=1&tagline=X&sections=k1&sections=k2&unknownSections=kind:k3
  │
  └─► Edit page (compile=1 detected)
        ├─► reconstruct sections: checked + unknown
        ├─► build intent: { operation:'UPDATE', strategyId, sections, tagline, ... }
        └─► compilePlan.execute → review panel (existing flow, unchanged)
```

## File Changes

- `src/domain/strategy/strategy.ts` (modified) — add `SectionTemplate` type
- `src/ports/strategies.ts` (modified) — add `listCategoryVocabulary` method +
  `CategoryVocabularyResult`, `SectionTemplate`, `CategoryOptions` types
- `src/infrastructure/battlegrid/strategy-adapter.ts` (modified) — implement
  `listCategoryVocabulary`; add `list_strategy_vocabulary` to `TOOLS`
- `src/application/use-cases/read-section-options.query.ts` (new) —
  `ReadSectionOptionsQuery`: concurrent fetch, returns `SectionOptionsResult`
- `src/composition.ts` (modified) — wire `ReadSectionOptionsQuery`
- `app/(app)/strategies/[id]/edit/page.tsx` (modified) — use `readSectionOptions`
  instead of `listStrategies`+`readVocabulary`; section checklist; compile trigger
- `tests/strategy/section-options.test.ts` (new) — unit tests for
  `ReadSectionOptionsQuery`
- `tests/strategy/strategy-adapter.section-vocab.test.ts` (new) — adapter
  mapping tests for `listCategoryVocabulary`
