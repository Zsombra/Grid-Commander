# Tasks — a-closed-trade-has-no-story

## 1. Port and mapper

- [x] 1.1 `src/ports/agents.ts`: `TradeChart`, `Candle`, `ChartLevel`,
      `ChartMarker`, `AuditEvent` types; `TradeChartResult`
      (`chart` / `no-trade` / `not-found` / `unreadable`) and
      `PositionAuditResult` (`events` / `none` / `unreadable`);
      `readTradeChart` and `readPositionAudit` on `AgentsPort`.
      Audit prices as decimal strings; chart prices as numbers.
- [x] 1.2 `src/infrastructure/battlegrid/trade-story-mapper.ts`:
      `mapTradeChart` (status discrimination), `mapAuditEvent`
      (base + reprice fields, null where absent, kind passed through).
- [x] 1.3 `agent-adapter.ts`: two tool entries (`get_trade_chart`,
      `get_position_audit_history`), two methods through the guarded path.
- [x] 1.4 Mapper tests from the observed 2026-08-08 payloads: READY chart
      maps whole; UNAVAILABLE → `no-trade`; NOT_FOUND → `not-found`;
      reprice event carries from/to/delta/source/improved; entry event's
      null `vsEntryPct` survives; unknown kind passes through.

## 2. The query

- [x] 2.1 `read-trade-story.query.ts`: `ReadTradeStoryQuery` — chart first,
      audit through `chart.positionId`; audit half fails independently;
      `positionId` absent → audit `null` (no address), distinct from `none`.
- [x] 2.2 Query tests: story with both halves; `no-trade` and `not-found`
      pass through; chart unreadable → story unreadable; audit unreadable →
      story carries chart + unreadable trail; no positionId → trail-less
      story.

## 3. The page

- [x] 3.1 `src/presentation/components/trade-story.tsx`: server-rendered SVG
      candle chart (scale spans candles, levels and markers; levels as
      labelled lines using platform labels; markers as labelled points;
      unknown roles drawn and named). Audit timeline: platform order,
      platform vocabulary, reprices as from → to with delta/source/improved,
      `<time dateTime>` on stamps. Placed-levels labelling.
- [x] 3.2 `app/(app)/agents/[id]/trades/[logId]/page.tsx`: all states —
      story, no-trade, not-found, unreadable (with `WhyNotLoaded`).
- [x] 3.3 `trades/page.tsx`: per-row link through `signalLogId` when present.
- [x] 3.4 Rendering tests: every page state; SVG present with level labels;
      reprice row shows both prices as sent (string equality); no-address
      trail wording distinct from empty trail.

## 4. MCP tool

- [x] 4.1 `src/mcp/tools.ts`: `read_trade_story` (agentId, logId) →
      `ReadTradeStoryQuery`; description names the states, no platform
      vocabulary, no counts.
- [x] 4.2 MCP tool tests: tool listed; states distinguishable in answers.

## 5. Wiring and guards

- [x] 5.1 `src/composition.ts`: wire the query.
- [x] 5.2 Architecture guards green — no list needed editing: the two-param
      route derives as *scoped to* `/agents/[id]` and its way-back link
      satisfies the scoped check; write-reachability derives the new reads
      as non-mutating; failure-is-explained satisfied.

## 6. Proof and docs

- [x] 6.1 `tests/live/trade-story-probe.test.ts` (key-gated, reads only):
      product-path story of a settled trade — chart candles present, levels
      and markers labelled, audit events in order when the platform serves
      them.
- [x] 6.2 Full suite + `npm run test:live` (serial) green.
- [x] 6.3 Docs: `BATTLEGRID_SURFACE_MAP.md` 53 → 56 consumed (the two new
      reads, plus `get_agent_coin_qualification`, consumed since #60 but
      never moved out of the unused list — corrected with a note);
      `docs/MCP_SERVER.md` 24 → 25 tools; `HANDOFF.md` counts;
      `trading-telemetry-is-unread` updated (chart + audit slice taken).
- [x] 6.4 Journal entry; archive.
