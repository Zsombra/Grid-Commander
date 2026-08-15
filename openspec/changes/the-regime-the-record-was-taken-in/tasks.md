# Tasks

## 1. Domain

- [x] 1.1 `src/domain/recording/regime.ts`: `RegimePoint`, `RegimeSnapshot`
      types (labels as opaque strings) and `deriveRegimeComposition(points,
      window)` — bounds to window, counts bars per label in first-seen
      order (count descending for render), reports covered span and
      dropped-malformed count. Pure; no port imports.
- [x] 1.2 Domain tests: window bounding (points before/after excluded),
      label verbatim (unseen label counted as given), covered-span
      truncation reported when oldest point is inside the window, empty
      points, malformed points dropped and counted.

## 2. Port and adapter

- [x] 2.1 `MarketPort.regimeHistory` / `regimeSnapshot` with kind-union
      results: history `'history' | 'none' | 'unreadable'`, snapshot
      `'snapshot' | 'unclassified' | 'unreadable'`; causes via the shared
      `unreadable`/`malformed` helpers.
- [x] 2.2 `McpMarketAdapter`: `TOOLS.regimeSnapshot = 'get_regime_snapshot'`,
      `TOOLS.regimeHistory = 'get_regime_history'`; mappers from the
      observed shapes (snapshot null → `'unclassified'`; `points: []` →
      `'none'`; malformed rows null-and-filtered, count carried).
- [x] 2.3 `regimeLookback` declared-max lookup from the discovered schema
      (`bars.maximum`), omitted from args when the declaration cannot
      answer.
- [x] 2.4 Adapter tests against the live-probed payloads (2026-08-15
      probes: BTC 1h full shape, SOL 4h, ZZZZ null snapshot), plus error →
      `unreadable` with cause.

## 3. Query

- [x] 3.1 `ReadRegimeContextQuery(store, market)`: arms `never-recorded`
      (shared `HOW_RECORDING_STARTS`), `unreadable` (store), `context` with
      per-series rows; per-series isolation (one failure costs that series
      only); series read in parallel.
- [x] 3.2 Query tests: never-recorded, store-unreadable, isolation (one of
      three fails, two render), snapshot/history arm combinations
      (unclassified, none), window passed from the series' own captures.

## 4. Presentation

- [x] 4.1 `regime-context.tsx`: per-series blocks — composition with bar
      counts, covered span (stated when narrower than the window),
      snapshot-now line, `'none'`/`'unclassified'` sentences in their own
      terms; BattleGrid failures render `<WhyNotLoaded>` with a
      sentence-completing subject; store failure carries the record's own
      survival sentence.
- [x] 4.2 `app/(app)/recorder/regime/page.tsx` behind `acting()` /
      `NotConnected`, framing sentence naming the platform as classifier;
      link back to `/recorder/analysis` and `/recorder`.
- [x] 4.3 One link on `/recorder/analysis` to `/recorder/regime`.
- [x] 4.4 `failure-is-explained.test.ts`: argued exemption entry for the
      store branch; cap `<8` → `<9`.

## 5. Wiring and record-keeping

- [x] 5.1 `composition.ts`: `readRegimeContext` wired with store + market.
- [ ] 5.2 Surface manifest `recorder-regime.json`; re-pin
      `recorder-analysis.json` (source file changed).
- [x] 5.3 Backlog: #116 → in-progress + change link + why-regime-first note
      keeping the other four reads; file
      `forward-returns-are-not-regime-conditioned` (+ GitHub mirror).

## 6. Verification

- [x] 6.1 Scenario "Composition is bounded to the record's window" → domain
      test 1.2.
- [x] 6.2 Scenario "A look-back that cannot reach the record's start is
      stated" → domain test + panel renders covered span.
- [x] 6.3 Scenario "An unseen regime label renders verbatim" → domain +
      adapter tests.
- [x] 6.4 Scenario "Now is not the window" → panel test/markup: snapshot
      line distinct from composition.
- [x] 6.5 Scenario "One coin fails, the rest render" → query isolation
      test.
- [x] 6.6 Scenarios "Unclassified/No points is an answer" → adapter + panel
      arms.
- [x] 6.7 Scenario "The store failing is not an empty record" → query test
      + exempted branch's own sentence.
- [x] 6.8 Gates: `npm run typecheck`, `npm run lint`, `npx vitest run`
      (`test:db` deliberately skipped — no schema change; operator's
      standing instruction).
