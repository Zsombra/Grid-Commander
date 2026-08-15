# Design: The regime the record was taken in

## Technical Approach

A new page `/recorder/regime` reads the record's subjects (coin + interval +
window) from `SignalRecordStore.recordedSeries`, then asks the platform —
per series, in parallel, isolated — for its regime history and current
snapshot via two new `MarketPort` methods. A pure derivation in
`src/domain/recording/regime.ts` bounds the history points to the series'
recorded window and composes bars-per-regime-label. The panel renders one
block per series: composition, covered span, snapshot-now; plus the four
distinct empty/failure arms the spec names.

## Decisions

### Decision: history depth is requested from the declared schema, not computed from the interval

The record never parses interval strings (`coverage.ts` derives cadence from
the data); a `'1h' → 3_600_000` table would be compiled-in platform
vocabulary — the defect class the surface record documents. Instead the
adapter reads `bars`' declared `maximum` from the discovered tool schema
(the `rankingVocabulary` pattern) and requests that; omitted when the
declaration cannot answer, letting the platform default. Whether the answer
reaches the window's start is then derived from the returned points
themselves and stated when it does not. Rejected: computing exact bars from
window ÷ interval — needs the ms table; the platform's cap applies anyway.

### Decision: regime labels are opaque strings

Observed vocabulary today: `bull_ranging`, `bear_ranging`, `bear_expansion`;
conviction `medium`. Enumerated nowhere — carried verbatim through port,
domain and panel, so v19 renaming the vocabulary renders rather than
breaks. Same rule the strategy verdict vocabulary follows.

### Decision: the snapshot's context travels as `{axis, value}` pairs, not named fields

Made mid-round, forced by a guard and better for it: the first draft gave
`RegimeSnapshot` three fields (`trend`, `volatility`, `momentum`) and
`structure.test.ts` refused `momentum` as platform vocabulary written into
source. The cure is a list of scalar axes read verbatim from the payload's
`context` block — names and values both the platform's words, mapped inside
the adapter boundary where wire vocabulary is allowed. An axis the platform
adds tomorrow renders the day it appears, the same guarantee the labels
already carry. Rejected: renaming the fields to dodge the guard — same
vocabulary, different spelling.

### Decision: the store-failure branch takes the guard's 8th exemption

The page joins two sources. BattleGrid failures wear `<WhyNotLoaded>` (the
cause is genuinely BattleGrid's, per-series). The store failure cannot —
the shared sentence would name a false cause — which is the exact ground of
existing exemptions 3–5. The exemption list sits at 7 with cap `<8`; this
change adds the argued 8th entry and moves the cap to `<9`. Rejected:
naming the arm something other than `'unreadable'` to dodge the matcher —
that is gaming a guard by spelling, the repo's documented defect class.
Rejected: routing subjects through `radar.listDeployments` to avoid a store
read — it loses the record's window, which is the surface's whole point.

### Decision: context beside, not condition on

The regime is rendered as context beside the forward returns, not joined
into per-pair attribution. A regime-conditioned return table at today's
depth would shred the sample; filed separately as
`forward-returns-are-not-regime-conditioned`.

## Data Flow

1. Page → `ReadRegimeContextQuery.execute({ userId })`.
2. Query → `store.recordedSeries` → subjects + per-series window
   (throw → `unreadable` arm; empty → `never-recorded` arm).
3. Per captured series, in parallel, each isolated:
   `market.regimeHistory({ symbol, timeframe: interval, bars: declaredMax })`
   and `market.regimeSnapshot({ symbol, timeframe: interval })`.
4. `deriveRegimeComposition(points, window)` (pure) → bars per label,
   covered span, points dropped as malformed.
5. Panel renders per-series blocks; arms per spec.

## File Changes

- `src/domain/recording/regime.ts` (new) — types + pure derivation
- `src/ports/market.ts` (modified) — `regimeHistory`, `regimeSnapshot`,
  result types
- `src/infrastructure/battlegrid/market-adapter.ts` (modified) — call sites,
  mapper, declared-max lookup
- `src/application/use-cases/read-regime-context.query.ts` (new)
- `src/composition.ts` (modified) — wiring
- `src/presentation/components/regime-context.tsx` (new)
- `app/(app)/recorder/regime/page.tsx` (new)
- `app/(app)/recorder/analysis/page.tsx` (modified) — one link out
- `tests/architecture/failure-is-explained.test.ts` (modified) — exemption
  8 + cap `<9`
- `openspec/design/surfaces/recorder-regime.json` (new),
  `recorder-analysis.json` (re-pinned)
- tests: `tests/domain/regime.test.ts`, adapter mapper tests, query tests
  (fake store + fake market)
