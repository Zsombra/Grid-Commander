# Tasks

## 1. Domain — SectionTemplate type
- [ ] 1.1 Add `SectionTemplate` discriminated union to `src/domain/strategy/strategy.ts`:
      `{ kind: 'platform'; sectionKey: string; label: string } |
       { kind: 'custom'; templateKey: string; label: string }`
      — live data shows 22 platform (`sectionKey`) and 2 custom (`templateKey`) variants

## 2. Port — listVocabularyTemplates
- [ ] 2.1 Add `VocabularyTemplatesResult` union type to `src/ports/strategies.ts`:
      `'templates'` (carries `templates: SectionTemplate[]`) | `'unreadable'`
- [ ] 2.2 Add `CategoryOptions` type: `{ category: string; label: string; templates: SectionTemplate[] }`
- [ ] 2.3 Add `SectionOptionsResult` union: `'ready'` (detail + categories) |
      `'strategy-unreadable'` | `'strategy-missing'` | `'vocabulary-unreadable'`
- [ ] 2.4 Add `listVocabularyTemplates(params: { authority }):
      Promise<VocabularyTemplatesResult>` to `StrategiesPort` interface
      — single call, no `category` param needed (live platform returns full list regardless)

## 3. Adapter — list_strategy_vocabulary
- [ ] 3.1 Add `vocabulary` key to `TOOLS` constant in `strategy-adapter.ts`
      mapping to `'list_strategy_vocabulary'`
- [ ] 3.2 Implement `listVocabularyTemplates` in `McpStrategyAdapter`: call the
      tool once (pass first available category key as required param), map response
      `templates` array to `SectionTemplate[]`; return `'unreadable'` on
      `ToolRefusedError`
- [ ] 3.3 Map defensively to discriminated union: if entry has `sectionKey` →
      `{ kind: 'platform', sectionKey, label }`; if entry has `templateKey` →
      `{ kind: 'custom', templateKey, label }`; skip entries with neither
- [ ] 3.4 Update `mapCategory` in the adapter to carry optional guidance fields:
      `whenToUse`, `bestPractices`, `commonMisuses`, `examples` — add these to
      `StrategyCategory` in `src/domain/strategy/strategy.ts`

## 4. Use case — ReadSectionOptionsQuery
- [ ] 4.1 Create `src/application/use-cases/read-section-options.query.ts`
- [ ] 4.2 Constructor receives `StrategiesPort`
- [ ] 4.3 `execute({ authority, strategyId })`:
      1. Concurrently: `readStrategy` + `readVocabulary` + `listVocabularyTemplates`
         (all three in one `Promise.all`)
      2. Return `'strategy-missing'` / `'strategy-unreadable'` / `'vocabulary-unreadable'`
         as appropriate
      3. Group templates into `CategoryOptions[]` by `category` from `readVocabulary`
         categories list — match templates to categories by their `category` field
      4. Return `{ kind: 'ready', detail, categories: CategoryOptions[] }`

## 5. Composition root
- [ ] 5.1 In `src/composition.ts`, instantiate `ReadSectionOptionsQuery` and
      expose it on the `app` object as `readSectionOptions`

## 6. Edit page — section checklist and compile trigger
- [ ] 6.1 Replace `listStrategies`+`readVocabulary` calls with `readSectionOptions`
- [ ] 6.2 Handle `'strategy-missing'`, `'strategy-unreadable'`, and
      `'vocabulary-unreadable'` result kinds with appropriate error states
- [ ] 6.3 When `result.kind === 'ready'` and no `compile` param: render the
      compose form with:
      - Section checklist grouped by category; current strategy sections pre-checked
      - Sections in the strategy not found in vocabulary as hidden
        `unknownSections=kind:sectionKey` inputs
      - Tagline field pre-filled from `detail.summary.tagline`
      - Hidden `<input name="compile" value="1" />`
- [ ] 6.4 When `compile=1` param present: reconstruct sections from `sections[]`
      and `unknownSections[]` searchParams; build intent including `sections` +
      `tagline`; pass to `compilePlan.execute` (existing review flow unchanged)
- [ ] 6.5 `intentSummary` and `assumptions` reflect what actually changed
      (tagline only / sections only / both)
- [ ] 6.6 Ensure the "back to strategy" link is present on every state this
      page can render (existing requirement — verify it holds with new states)

## 7. Verification — Requirement: Report Sections Can Be Composed When Editing

- [ ] 7.1 **Test**: `ReadSectionOptionsQuery` with a strategy that has sections
      A and B; vocabulary returns A, B, C — result includes all three, A and B
      marked as in the strategy (traces to: current sections pre-selected)
- [ ] 7.2 **Test**: `ReadSectionOptionsQuery` when `readVocabulary` returns
      `'unreadable'` → result is `'vocabulary-unreadable'` (traces to:
      vocabulary unavailable blocks section editing)
- [ ] 7.3 **Test**: `ReadSectionOptionsQuery` when `readStrategy` returns
      `'missing'` → result is `'strategy-missing'` (traces to: compose form
      guarded by strategy reachability)
- [ ] 7.4 **Test**: adapter `listVocabularyTemplates` maps platform templates
      (`sectionKey` present) to `kind: 'platform'` and custom templates
      (`templateKey` present) to `kind: 'custom'`; `ToolRefusedError` →
      `'unreadable'` (traces to: sections from platform vocabulary, not invented)
- [ ] 7.5 **Test**: adapter `listVocabularyTemplates` skips entries missing both
      `sectionKey` and `templateKey` rather than throwing (traces to: defensive
      mapping)
- [ ] 7.6 **Test**: compile intent from edit page carries `sections` array
      matching what the form submitted — a section not in `sections` params is
      not in the intent (traces to: section selection is compiled as composed)
- [ ] 7.7 Mutate: remove section from compile intent → test 7.6 fails
- [ ] 7.8 Mutate: inject a hard-coded section key instead of reading from
      vocabulary → test 7.4 fails (traces to: sections not invented)
- [ ] 7.9 Run `scripts/check.sh` — all gates green

## 8. Out-of-scope backlog items
- [ ] 8.1 File `strategy-metric-editor` backlog item for metric construction
      hints and column contracts (get_metric_construction_hints,
      get_strategy_column_contract)
- [ ] 8.2 File `strategy-draft-preview` backlog item for preview_strategy_report
- [ ] 8.3 Update `strategy-section-editor` backlog item:
      `status: in-progress`, `change: strategy-section-editor`
