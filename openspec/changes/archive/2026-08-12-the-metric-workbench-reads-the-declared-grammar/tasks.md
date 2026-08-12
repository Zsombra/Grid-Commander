# Tasks

## 1. The query carries the declaration

- [x] 1.1 `ReadMetricQuery`'s `metric` outcome gains
      `controls: ColumnControls`, read via `strategies.columnControls` in
      parallel with `metricHints` (after membership, as `ComposeColumnQuery`
      orders it); an unreadable vocabulary path is unchanged.
- [x] 1.2 `tests/strategy/column-grammar.test.ts`: the existing
      `ReadMetricQuery` cases assert the controls ride the `metric` outcome,
      and the `no-such-metric` path spends no controls read.

## 2. One `Declared` control, one source

- [x] 2.1 Extract `Declared` and `timeframeOptions` from
      `app/(app)/strategies/sections/[sectionKey]/page.tsx` into
      `src/presentation/components/declared.tsx`, byte-identical behavior;
      the section page imports them.

## 3. The metric workbench

- [x] 3.1 Delete `REL_TIMEFRAMES` and `proposalFrom`; the page reads the form
      through `columnFromQuery` with the route's metric injected, so the
      timeframe travels tagged and nothing classifies a bare value.
- [x] 3.2 The check form offers `Declared` selects for timeframe (required,
      from `timeframeOptions(controls)`), `bars`, `ordering` and `side`;
      seeded from the parsed column, `timeframeParam` writing the tag back.
- [x] 3.3 A form that does not describe a column renders the composer's
      problems in its own words and states nothing was sent — the section
      editor's treatment, same wording discipline.
- [x] 3.4 The check runs only when `columnFromQuery` yields a column;
      the existing membership guard and check rendering are unchanged.

## 4. Verification

- [x] 4.1 `REL_TIMEFRAMES` appears nowhere under `app/` or `src/` — the
      spec's "no timeframe list in source" scenario, checked by grep.
- [x] 4.2 A test covers the untagged-timeframe degradation: `tf=anchor`
      yields the stated problem and no platform call (scenario: A timeframe
      arrives untagged).
- [x] 4.3 Quality gates: typecheck, lint, vitest, build; drizzle unchanged.
