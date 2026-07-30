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

### Decision: One `list_strategy_vocabulary` call for all templates
Live probing confirms `list_strategy_vocabulary` returns the same 24 templates
regardless of which category key is passed — the platform does not partition
templates by category. A single call (with any category key) returns the full
template list. `ReadSectionOptionsQuery` calls it once and associates every
template with the category that best describes it via the `category` field in
the response rather than inferring it from which category was requested.
Rejected: concurrent per-category fetch (original design) because it issues N
redundant HTTP round-trips and makes the code appear to assume templates differ
per category when they do not.

### Decision: Edit page switches from `listStrategies` to `readStrategy`
`readStrategy` returns the full `StrategyDetail` including `sections[]`, which
is needed to pre-select the checklist. `listStrategies` returns only the roster
summary (`sectionCount: number`). The cost is one additional BattleGrid call,
acceptable for an edit page. Rejected: calling both and merging because that
adds complexity with no benefit.

### Decision: `SectionTemplate` is a discriminated union on `kind`
Live probing found two template variants in the vocabulary: 22 platform
sections with a `sectionKey` field (e.g. `includeRsi`) and 2 custom templates
with a `templateKey` field (e.g. `momentum-composite`). The domain type is a
discriminated union: `{ kind: 'platform'; sectionKey: string; label: string } |
{ kind: 'custom'; templateKey: string; label: string }`. The adapter sets `kind`
from whichever key is present. Rejected: a flat type with both fields optional
because it loses the discriminant at the call site and requires null-checks
at every use.

### Decision: Domain boundary respected — `SectionTemplate` in domain, not adapter
The template type lives in `src/domain/strategy/strategy.ts` so use cases can
refer to it without importing from infrastructure. The adapter maps the raw
BattleGrid payload to `SectionTemplate`; the domain type is the stable surface.

### Decision: `mapCategory` surfaces guidance fields
Live `list_strategy_categories` returns `whenToUse`, `bestPractices`,
`commonMisuses`, and `examples` on each category object. `mapCategory` maps
these to optional string fields on `StrategyCategory` so the edit page can show
a tooltip or guidance copy. Previously mapped only `category`, `label`,
`purpose`, and `metricCount`.

## Data Flow

```
Edit page load (no compile param)
  │
  ├─► ReadSectionOptionsQuery.execute({ authority, strategyId })
  │     ├─[concurrent]─► readStrategy       → StrategyDetail (has sections[])
  │     └─[concurrent]─► readVocabulary     → categories[]
  │     └─[concurrent]─► listVocabularyTemplates (single call, any category key)
  │                         → SectionTemplate[] (24 templates, same for all cats)
  │     └─► returns { kind: 'ready', detail, categories: CategoryOptions[] }
  │           (CategoryOptions groups templates by category field on each template)
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
- `src/ports/strategies.ts` (modified) — add `listVocabularyTemplates` method +
  `VocabularyTemplatesResult`, `SectionTemplate` (discriminated union), `CategoryOptions` types
- `src/infrastructure/battlegrid/strategy-adapter.ts` (modified) — implement
  `listVocabularyTemplates` (single call); add `list_strategy_vocabulary` to `TOOLS`;
  update `mapCategory` to surface guidance fields
- `src/application/use-cases/read-section-options.query.ts` (new) —
  `ReadSectionOptionsQuery`: concurrent fetch, returns `SectionOptionsResult`
- `src/composition.ts` (modified) — wire `ReadSectionOptionsQuery`
- `app/(app)/strategies/[id]/edit/page.tsx` (modified) — use `readSectionOptions`
  instead of `listStrategies`+`readVocabulary`; section checklist; compile trigger
- `tests/strategy/section-options.test.ts` (new) — unit tests for
  `ReadSectionOptionsQuery`
- `tests/strategy/strategy-adapter.section-vocab.test.ts` (new) — adapter
  mapping tests for `listCategoryVocabulary`
