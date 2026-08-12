# Proposal: The metric workbench reads the declared grammar

## Why

`/strategies/metrics/[metric]` is the one surface left that spells platform
vocabulary into source: its `REL_TIMEFRAMES` constant classifies a bare `tf`
value as relative-or-absolute against a list fixed at build time — exactly what
the spec's *An Enumerated Column Control Is Read From The Declaration Or
Withheld* requirement forbids, written after this page was. It also offers no
control for `bars`, `ordering` or `side`, though it parses all three off the
URL and `StrategiesPort.columnControls` has carried their declared values since
`the-inside-of-a-section-is-composable`. `column-form.ts` names this page as
"the one piece of platform vocabulary this product still spells out"; backlog
item `v5-surface-additions-unconsumed` (#115) recorded it as one small edit
deferred only to bound that change's blast radius.

## What Changes

- `ReadMetricQuery` additionally reads `StrategiesPort.columnControls` (in
  parallel with the hints) and returns it on the `metric` outcome, so the
  workbench can offer declared values without a second membership check.
- The metric page drops its private `proposalFrom` reader and `REL_TIMEFRAMES`
  and reads the form through the shared `columnFromQuery` (with the route's
  metric injected), so the timeframe travels tagged (`rel:anchor` / `abs:1h`)
  and no build-time list classifies it.
- The timeframe control becomes a select over the declaration's own values;
  `bars`, `ordering` and `side` gain the same declared-or-withheld controls the
  section editor offers. The `Declared` select and `timeframeOptions` move from
  the section page into one shared presentation module both pages import.
- A form that does not describe a column renders the composer's own problems
  and states nothing was sent — same treatment as the section editor.
- **Noted, deliberate**: a previously shared metric-page URL carrying a bare
  `tf=anchor` no longer checks; it degrades to the stated
  "Choose a timeframe" problem, never to a silent misread. The old grammar
  sorted unknown values into `abs` by fixed-list elimination, which misfiles
  any relative timeframe the platform adds — the degradation is the fix.

## Capabilities

**New**: none
**Modified**: `strategy-authoring` — the enumerated-control requirement's reach
is stated as every surface that composes or checks a column, with a scenario
for the metric workbench; the fixed-list classification defect class is named.

## Out of Scope

- The section editor itself — already conformant; it only donates `Declared`
  and `timeframeOptions` to a shared module, byte-identical behavior.
- Any change to `check_column` / `compose_column` use-case semantics, the
  adapter, or the port — `columnControls` exists and is tested.
- The metric *index* page and its grouping — untouched.
- A pending/loading state on the check submit — that is #153, behavior.
- Restyling this surface — it has no manifest; the design lane owns that
  (backlog `the-button-primitive-has-no-tokens`, gap 2).

## Impact

- `src/application/use-cases/read-metric.query.ts` — result gains `controls`.
- `app/(app)/strategies/metrics/[metric]/page.tsx` — reader swap, three new
  controls, problems block; `REL_TIMEFRAMES` deleted.
- `app/(app)/strategies/sections/[sectionKey]/page.tsx` — imports the shared
  `Declared`/`timeframeOptions` instead of defining them.
- `src/presentation/components/declared.tsx` — new, extracted verbatim.
- `tests/strategy/column-grammar.test.ts` — ReadMetricQuery cases learn the
  controls field; new cases for the declared-or-withheld behavior on this
  surface.
- No database, no migrations, no MCP calls beyond the one extra
  `columnControls` read per metric-page render (a schema read the section page
  already pays).
