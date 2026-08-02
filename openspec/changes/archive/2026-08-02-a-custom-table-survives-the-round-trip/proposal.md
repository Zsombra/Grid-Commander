# Proposal: A Custom Table Survives The Round Trip

## Why

The table-authoring campaign (operator-requested, 2026-08-01) found a bug in
`the-draft-is-previewable`, shipped hours earlier: **the preview surface
refuses any strategy that holds a custom table.**

The platform returns a saved custom section whole — `title`, `timeframe`
and `columns` — but the domain's `StrategySection` carried only `kind` and
`sectionKey`, so the preview adapter sent a key alone.
`preview_strategy_report` rejects that with a schema error: for
`kind: 'custom'` it requires the self-contained definition. A platform
section is fully named by its key; a custom one is not.

Found by creating a real custom table on a real strategy and previewing it.

## What Changes

- `StrategySection` carries an optional `title`, `timeframe` and `columns`
  — the custom table's own definition, columns opaque (their grammar
  belongs to the platform's column contract, not this domain).
- The section mapper reads them when present.
- `previewReport` sends them back whole for custom sections.

## Capabilities

**Modified**: `strategy-authoring` — one ADDED requirement.
