# Proposal: The preview matches the live contract

## Why

The v19.1.0 re-probe (#287's refresh, this session) surfaced that
`preview_strategy_report` no longer accepts `regimeAutoDerive` and
`regimeTimeframe` — v18 declared the first *required*, v19 removed both
from a schema that keeps `additionalProperties: false`. The product's
`previewReport` composer still sends them, so every preview the product
composes — the report preview page and the try-a-condition path — would
be refused whole by input validation. This is #285's defect class
(`the-plan-matches-the-live-contract`) on the sibling read path, caught
this time by the conformance guard against the fresh record rather than
by a live refusal.

## What Changes

- `previewReport` stops carrying the two regime keys: the port signature,
  the adapter payload, and the two use-case call sites
  (`preview-composition.query`, `try-condition.query`).
- The strategy *read* side is untouched — the platform still reports
  `regimeAutoDerive`/`regimeTimeframe` on `get_strategy`, and the detail
  page still renders them.
- Test mirrors and fakes follow: `payload-conformance`'s `previewPayload`
  mirror, the preview unit tests, the fake port, and the live
  custom-table probe's preview call.

## Capabilities

**New**: none. **Modified**: none — `skip_specs: true`: this restores the
behavior the strategy-authoring spec already promises (a draft the
operator composes can be previewed); no spec text names the preview
argument list.

## Out of Scope

- v19's two new optional preview inputs (`marketReadLensTicker`,
  `marketReadText`) — unmodelled, filed at handoff.
- Everything else v19 moved (34 output schemas, vocabulary timeframe
  cuts) — recorded by #287's refresh, consumed by nothing yet.

## Impact

`src/ports/strategies.ts`, `src/infrastructure/battlegrid/strategy-adapter.ts`,
`src/application/use-cases/preview-composition.query.ts`,
`src/application/use-cases/try-condition.query.ts`, plus the test mirrors
named above. Live proof: the preview probe in the keyed run of this
session, against battlegrid v19.1.0.
