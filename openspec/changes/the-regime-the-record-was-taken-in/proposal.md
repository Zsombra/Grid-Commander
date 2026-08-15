# Proposal: The regime the record was taken in

## Why

The forward-returns analysis (`/recorder/analysis`) states every figure's
sample size and window — and nothing about what kind of market that window
was. #282 already hit the consequence: claims derived from 2.6 days of record
cannot say whether they were earned in one regime or many, so they cannot
travel. The platform publishes its own per-bar regime classification
(`get_regime_history`) and a current classified snapshot
(`get_regime_snapshot`); both sit unused (backlog #116, six unused
market-context reads). This change consumes exactly these two — the pair an
existing surface already begs for — and leaves the other four in the item.

## What Changes

- `MarketPort` gains two read methods: the platform's per-bar regime series
  and its current regime snapshot for one coin at one timeframe, implemented
  in `McpMarketAdapter` over `get_regime_snapshot` / `get_regime_history`
  (both classified `read` by the server, verified in
  `docs/battlegrid-mcp-surface.json` at v18.2.0 and live-probed 2026-08-15).
- A new read-only surface `/recorder/regime`: for each recorded series
  (coin + interval), the composition of the platform's regime classification
  over the record's own window, beside the platform's current snapshot.
  Linked from `/recorder/analysis` (whose figures it contextualizes) and
  back.
- Regime look-back depth is read from the tool's declared schema at runtime
  (the `rankingVocabulary` pattern); regime and conviction vocabulary is
  carried verbatim, never enumerated in source.
- `tests/architecture/failure-is-explained.test.ts` gains the surface's
  store-failure branch as an argued exemption (the shared sentence names
  BattleGrid; this branch's cause is the product's own store), which takes
  the exemption list from 7 to 8 and the list cap from `<8` to `<9`.
  Deliberate, visible, and argued in the entry itself.

## Capabilities

**New**: none
**Modified**: `signal-recording` — ADDED requirements only (the regime
context surface beside the record; no existing requirement changes)

## Out of Scope

- The other four unused market-context reads (`get_coin_candles`,
  `get_coin_metadata`, `get_macd_heatmap`, `get_coin_performance_history`) —
  they stay in backlog #116 with a note on why the regime pair went first.
- Conditioning the forward-return figures themselves on regime (a
  per-pair join producing regime-segmented return tables). Deliberately not
  built: at current depth it would slice ~1,100 pairs into cells the
  sample-size rule would mostly suppress, and the join deserves its own
  design once depth allows. Filed as
  `forward-returns-are-not-regime-conditioned`.
- Recording regime into the product's store. The recorder records what the
  signal layer said; the regime series is the platform's own persisted
  projection, re-readable at any depth up to its look-back — nothing is lost
  by not copying it today.
- MCP exposure of this surface (the analysis surface's own MCP absence is
  already tracked in `the-analysis-is-not-on-the-models-surface`).

## Impact

- `src/ports/market.ts` — two new methods + result types.
- `src/infrastructure/battlegrid/market-adapter.ts` — two tool call sites
  (both `read`), mapper.
- `src/domain/recording/regime.ts` (new) — pure window-bounding and
  composition derivation.
- `src/application/use-cases/read-regime-context.query.ts` (new).
- `src/composition.ts` — wire the query.
- `app/(app)/recorder/regime/page.tsx` (new),
  `src/presentation/components/regime-context.tsx` (new),
  `app/(app)/recorder/analysis/page.tsx` (one link).
- `openspec/design/surfaces/recorder-regime.json` (new) and
  `recorder-analysis.json` re-pinned (its source file changes).
- `tests/architecture/failure-is-explained.test.ts` — exemption entry + cap,
  as above. No other guard changes.
- No schema/database change. No new writes anywhere; both tools are
  server-classified reads, so `mcp-read-only`'s derived chain is unaffected.
