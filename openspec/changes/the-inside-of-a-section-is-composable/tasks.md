# Tasks

## 1. Settle what is actually on the wire

- [x] 1.1 Establish where a section template's columns come from. The recorded
      surface (`docs/battlegrid-mcp-surface.json`, server v11.0.0) shows
      `list_strategy_vocabulary` returning `templates[]` whose first entry is
      `{columns: [{metric, timeframe: {rel}, transformId}, …×12], kind,
      sectionKey, title}` — 25 templates. The columns are already read on every
      edit-page load and dropped by the mapper
- [x] 1.2 Establish that `get_strategy_section_template` is **not** the source.
      It is recorded `not_called_because: "no request available on this
      account"` — never observed — and `docs/REPORT_TABLE_GRAMMAR.md` records
      that for platform sections it answers only `{sectionKey, title}`. Nothing
      here models it
- [x] 1.3 Establish the column grammar as the platform closes it:
      `column` accepts exactly `bars, chainedTransformId, inputs, metric,
      offset, ordering, side, timeframe, transformId, window`, requires
      `metric, transformId, timeframe`, and `inputs[]` is an **object** with a
      `metric` key, not a bare string
- [x] 1.4 Establish which of those the declaration pins to an enumeration:
      `column.bars` `[closed, all]`, `column.ordering` `[hi, lo, far, near]`,
      `column.side` `[support, resistance]`, `column.timeframe.rel`
      `[anchor, lower, higher, regime]`, `column.timeframe.abs` (thirteen).
      `transformId` and `chainedTransformId` are free strings — the legal set is
      per-metric and comes from `get_metric_construction_hints`
- [x] 1.5 Establish why a composed column cannot be saved from here:
      `compile_strategy_plan`'s `request.sections[]` variant for
      `{kind: platform}` is `closed` and accepts only `[kind, sectionKey]`.
      Columns ride `{kind: custom}` sections only

## 2. Domain — the template carries what the platform sent

- [x] 2.1 `SectionTemplate` carries `columns`, opaque
      (`readonly Record<string, unknown>[]`), the way `StrategySection.columns`
      already does — the grammar belongs to the platform's column contract, not
      to this domain
- [x] 2.2 The domain neither validates a column nor completes one

## 3. Port — the declared controls

- [x] 3.1 `ColumnControls` in `src/ports/strategies.ts`: the declared values for
      relative timeframes, absolute timeframes, `bars`, `ordering` and `side`.
      Empty means *not declared*, never *there are none*
- [x] 3.2 `columnControls(params)` on `StrategiesPort`. Additive, next to
      `columnContract`, so a concurrent edit to this file merges

## 4. Adapter

- [x] 4.1 `mapSectionTemplate` carries `columns` through and takes the label from
      `label` or, failing that, `title` — the v11 record's template entries carry
      `title` and no `label`, so the checklist has been rendering blank names
- [x] 4.2 `columnControls` reads `get_strategy_column_contract`'s own discovered
      schema through `declaredValues`, at `column.timeframe.rel`,
      `column.timeframe.abs`, `column.bars`, `column.ordering`, `column.side`.
      A discovery that failed returns empty lists, not a guess
- [x] 4.3 No enum value is written into source, in this file or any other

## 5. Use cases

- [x] 5.1 `ReadSectionLibraryQuery` — every advertised template, grouped by the
      platform's own category where it publishes one, ungrouped where it does
      not. Unreadable is unreadable, never an empty library
- [x] 5.2 `ComposeColumnQuery` — one template, its columns read into proposals,
      the declared controls, the metric's construction hints, and the platform's
      verdict on a composed column
- [x] 5.3 Membership before the metric is sent anywhere — one `listMetrics` read
      shared by the hints call and the contract call, rather than the two the
      existing pair of queries would make
- [x] 5.4 A column entry missing a required part yields no proposal and names
      what is missing; a key the product does not carry is named as not carried
- [x] 5.5 The contract check is only ever sent for a metric the platform lists

## 6. Presentation

- [x] 6.1 `src/presentation/column-form.ts` reads a column off the query string.
      The timeframe travels as `rel:<v>` / `abs:<v>` so no list is needed to tell
      the two apart — which is what the metric page's hard-coded
      `REL_TIMEFRAMES` exists to do
- [x] 6.2 Values that cannot become a column are reported as this product's own
      problem, with nothing sent

## 7. Surfaces

- [x] 7.1 `/strategies/sections` — the library, linking each template to its page
- [x] 7.2 `/strategies/sections/[sectionKey]` — the template's columns, the
      metric card for the column being edited, the editor, and the verdict
- [x] 7.3 Every enumerated control renders from `ColumnControls`; a control the
      declaration could not answer for is withheld and said to be withheld
- [x] 7.4 The page states that nothing is saved, and states that a platform
      section's contents are the platform's
- [x] 7.5 Reachable: `/strategies` links the library, the edit page's section
      fieldset links it, the library links each section
- [x] 7.6 Every failure branch renders `WhyNotLoaded`, except the contract check
      itself — exempted with the same argument the metric page's is

## 8. Verification

- [x] 8.1 **Test**: the adapter carries a template's columns through and falls
      back to `title` for a label (traces to: a section template shows the
      columns it renders)
- [x] 8.2 **Test**: `columnControls` returns exactly the declared enums for a
      recorded schema, including through a `$ref`, and empty lists when
      discovery throws (traces to: read from the declaration or withheld)
- [x] 8.3 **Test**: a template the vocabulary does not advertise →
      `no-such-section`; an unreadable vocabulary → `unreadable` (traces to: a
      section key the platform does not advertise / the vocabulary cannot be
      read)
- [x] 8.4 **Test**: a column entry carrying an unknown key still yields a
      proposal and names the key; one missing `metric` yields none and says so
      (traces to: a column key the product does not carry)
- [x] 8.5 **Test**: an unlisted metric is never sent to `columnContract`
      (traces to: a metric the platform does not list)
- [x] 8.6 **Test**: the composed column reaches the contract check carrying
      `bars` and `ordering` (traces to: the check covers every declared control)
- [x] 8.7 **Test** (rendering): the library, the template page, a seeded column,
      a compiled contract, a refusal rendered as teaching, a withheld control,
      and the not-saved statement
- [x] 8.8 **Test**: the adapter puts `bars` and `ordering` on the wire, and
      omits both when unset — the last hop, which nothing held while no surface
      could set them
- [x] 8.9 Mutate: stop reading `bars` off the query → 8.6 and the round-trip
      test both fail. Mutate: drop `bars` from the adapter's payload → 8.8 fails.
      Mutate: hard-code the relative timeframes and `ordering` instead of
      reading them → 8.2's "follows the platform when it moves" fails. All three
      run and restored
- [x] 8.10 `npx tsc --noEmit`, `npx vitest run tests/strategy tests/rendering
      tests/architecture`, `npx eslint` over the changed files

## 9. Backlog

- [x] 9.1 `strategy-metric-editor` → `status: done`, `change:` this change
- [x] 9.2 `v5-surface-additions-unconsumed` stays open; its "Two new column
      controls" section records that it landed and where
