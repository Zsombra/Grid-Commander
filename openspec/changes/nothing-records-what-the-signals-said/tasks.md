# Tasks

## 1. Domain and ports

- [x] 1.1 Domain types in `src/domain/recording/capture.ts`: SignalCapture
      (time, platform version, coin, interval, price, aggregate, bias,
      conflict flag, provenance, outcome), SignalReading (verdict, bias,
      direction, scores, allocation, flags, raw indicator values, the
      platform's sentence), CaptureCoverage (first, latest, count, gaps),
      and the failed-capture shape with reason
      → "A Capture Records What Every Signal Said", "A Failed Read Is A
      Recorded Gap, Not Silence"
- [x] 1.2 `coinSignalPreview` on the market port (DL-002 placement), typed to
      the observed v11.0.0 shape → "A Capture Records What Every Signal Said"
- [x] 1.3 `SignalRecordStore` port in `src/ports/signal-record.ts`: append
      capture (readings + raw answer, atomically per coin), append failed
      capture, read history by coin, read one signal across captures, read
      coverage, read a capture's raw answer — all account-scoped
      → "The Record Belongs To The Account That Captured It"

## 2. Persistence

- [x] 2.1 Drizzle tables `signal_captures` (with raw payload column and
      platform version) and `signal_readings`; indexes on (userId, ticker,
      capturedAt); migration generated, `npm run db:generate` gate clean
      → infrastructure for "The Platform's Answer Is Kept Whole"
- [x] 2.2 `drizzle-signal-record-store.ts` implementing the store port
      (renamed from the proposal's `signal-record-repo.ts` to match the
      `drizzle-proposal-store.ts` convention — decision log DL-002)
- [x] 2.3 DB tests (`tests/db/signal-record.test.ts`): round-trip a capture
      whole; raw answer retrievable byte-faithful; two users' rows never
      cross; coverage derived from rows (no stored flag)
      → scenarios "The whole answer is retrievable", "Another account's
      record is not shown"

## 3. The platform read

- [x] 3.1 `signal-preview-mapper.ts` from the observed shape — keep every
      field the payload carries; per the standing lesson, the live probe
      prints the raw payload's key count beside the mapper's
      → "A Capture Records What Every Signal Said"
- [x] 3.2 Adapter method on the BattleGrid MCP adapter; envelope unwrapped;
      a refusal maps to unreadable-with-reason, never a throw that aborts
      sibling coins → "A Failed Read Is A Recorded Gap, Not Silence"
- [x] 3.3 Conformance fixture from `docs/battlegrid-mcp-surface.json`'s
      observed shape so the payload-conformance suite covers the new read

## 4. The capture command

- [x] 4.1 `capture-signals.command.ts`: coin-set resolution (named coins +
      named interval | deployments → (coin, timeframe) pairs), provenance
      recorded, nothing-to-cover refusal with reason
      → "The Coins Captured And Why Are Recorded"
- [x] 4.2 Per-coin capture loop: one coin's failure recorded as a gap with
      the platform's reason, siblings continue; platform-wide failure
      recorded as a failed capture → "A Failed Read Is A Recorded Gap"
- [x] 4.3 Stamp capture time (injected clock, not a DB default) and the
      platform server version on every capture
      → "A Capture Records What Every Signal Said"
- [x] 4.4 Unit tests over fakes: full capture, partial failure, total
      failure, empty coin set, provenance both ways

## 5. Unattended entry

- [x] 5.1 `bin/grid-commander-record.ts` on the `grid-commander-mcp.ts`
      pattern: composition root, stub cookies, refuse without authority
      naming what is missing, exit nonzero
      → "A Capture Runs Unattended And Refuses Without Authority"
- [x] 5.2 Exit semantics: zero only when at least one coin recorded; summary
      to stdout names recorded and failed coins; nothing-covered exits
      nonzero → scenarios "A scheduler can tell success from failure",
      "Nothing to cover"
- [x] 5.3 No mutating tool named, no `*Command` against BattleGrid — the
      live-writes architecture gate stays green by construction

## 6. Read surfaces (web)

- [x] 6.1 Coverage page: recording started / last capture / count / gaps per
      coin+interval; never-recorded state says how recording starts;
      store-unreadable distinct from empty
      → "The Record States Its Own Coverage"
- [x] 6.2 Per-coin timeline: captures in time order with aggregate, bias,
      conflict, price; every reading carries its capture time
      → "Recorded History Is Readable By Coin And By Signal"
- [x] 6.3 Per-signal history view for one coin → same requirement
- [x] 6.4 Provenance rendered with history (named vs deployments-at-the-time)
      → "The Coins Captured And Why Are Recorded"
- [x] 6.5 Rendering tests: gap visible, never-recorded vs unreadable,
      capture-time on every reading, cross-account isolation via fakes

## 7. The MCP boundary

- [x] 7.1 Two read tools in `src/mcp/tools.ts` calling the same queries:
      signal history (with capture times, platform versions, gaps in the
      window) and record coverage; descriptions name what the set contains
      and state no count → mcp-control "The Recorded Signal History Is
      Readable By A Model"; existing "A description SHALL NOT state a count"
- [x] 7.2 Read-only reachability guard: the tools reach no BattleGrid write
      and no capture-performing use-case (capture stays operator-invoked)
- [x] 7.3 MCP tests: gap crosses as a gap; never-recorded says where
      recording starts; unreadable store crosses as data naming itself

## 8. Live proof

- [x] 8.1 Key-gated `tests/live/recorder-probe.test.ts`: one real
      `get_coin_signal_preview` through the adapter and mapper against a
      deployed coin; asserts the ~84-signal population, raw-vs-mapped key
      counts printed; store side over a fake (persistence is proven in the
      db suite); no `BATTLEGRID_LIVE_WRITES` needed — reads only
- [ ] 8.2 Run the full capture once against the real platform and a local
      database; record the row counts and the stamped platform version in
      the change's findings
      **OPEN — needs the operator's key.** This environment holds no
      BATTLEGRID_API_KEY by design; the probe (8.1) is written, key-gated,
      and runs with the rest of tests/live/ on the first keyed run. See
      verification.md and DL-010.

## 9. Documentation

- [x] 9.1 `docs/BATTLEGRID_SURFACE_MAP.md`: `get_coin_signal_preview` moves
      to the consumed table (52 → 53)
- [x] 9.2 `docs/MCP_SERVER.md`: the two tools, and that the record is this
      product's own store
- [x] 9.3 Operator note (FIRST_SESSION or README pointer): starting the
      recorder — the one-line cron and why gaps are permanent

## 10. Verification

- [x] 10.1 `./scripts/ci.sh` green keyless (typecheck, lint, tests, build,
      db:generate diff clean, harness)
- [x] 10.2 Scenario walk: every scenario in both delta specs traced to a
      passing test or a recorded live observation, listed in the change
      folder
- [x] 10.3 `python3 .claude/tools/openspec.py validate
      nothing-records-what-the-signals-said` clean before handoff to verify
