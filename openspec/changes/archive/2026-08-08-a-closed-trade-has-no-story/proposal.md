# A closed trade has no story

## Why

`/agents/[id]/trades` shows the ledger row: net, fees, both sides' slippage,
close reason. What it cannot show is the trade as an event — the price path it
lived through, where protection sat, and what position management did to that
protection while the trade was open.

The platform publishes both halves, and a keyed discovery read on 2026-08-08
observed them whole (evidence in `trading-telemetry-is-unread`):

- **`get_trade_chart`** answered READY on 6 of 6 settled evaluations: a frozen
  candle series (83 × 5m on the probed trade) with the stop, target, entry and
  exit placed on it — `levels[]` carrying the platform's own display labels,
  `markers[]` carrying entry and exit points, `snapshotCapturedAt` dating the
  freeze.
- **`get_position_audit_history`** answered 10 events on the probed position:
  TP placed, SL placed, entry filled, then the stop **replaced five times** —
  break-even first, then trailing, every move flagged `improved: true` — SL
  cancelled, TP filled at +2.29%.

That second list is the thing this product has never been able to show.
`position-management-editing` shipped the *configuration* — an operator can
set trailing type and break-even trigger — and
`the-stop-that-moved-is-shown-as-moved` shows the *current* effective stop on
an open position. But the record of the feature *acting* — five reprices
walking a stop from −0.73% to +1.19% on a real winner — exists on the
platform and nowhere in this product. An operator tuning position management
still cannot see a single completed example of it working.

One more fact the discovery read settled: the chart's stop line is the stop
**as placed** (0.1368296 on the probed WIF trade — the audit trail's
`SL_PLACED` price), not the stop that ended the trade (0.13947 after five
moves). The two surfaces disagree by design, and a page carrying both must
say which is which — the same decided-versus-effective discipline
`/pipeline` and the position surface already hold.

`positionId` is carried by the chart and by nothing else on a closed trade
(the 26-key outcome row has no position key — checked raw), so the chart
read is also the only address for the audit read. The join is forced, which
makes the two reads one product question: *how did this trade unfold?*

## What Changes

- **`AgentsPort` grows two reads**: `readTradeChart({agentId, logId})` —
  discriminated `chart` / `no-trade` / `not-found` / `unreadable`, mirroring
  the platform's READY / UNAVAILABLE / NOT_FOUND — and
  `readPositionAudit({agentId, positionId})` — `events` / `none` /
  `unreadable`. Audit prices stay **decimal strings** as the platform sends
  them; chart prices stay numbers for the same reason.
- **`ReadTradeStoryQuery`** joins them: chart first, audit through the
  chart's `positionId`. The audit half fails independently — a story with an
  unreadable audit trail still shows the chart, and a chart that names no
  position says so rather than pretending the trail is empty.
- **`/agents/[id]/trades/[logId]`** renders the story: a server-rendered SVG
  candle chart with the platform's levels and markers drawn on it and
  labelled as *placed* levels, then the audit trail as a timeline — every
  event kind shown in the platform's vocabulary, reprices with from → to,
  the platform's own delta, and whether it improved protection. Each trade
  row on `/agents/[id]/trades` links here through its `signalLogId`.
- **`read_trade_story`** joins the MCP surface (24 → 25 tools): same query,
  same states, for an operator's agent asking over MCP.
- Docs: two more tools consumed (53 → 55), surface map and handoff counts,
  MCP server doc.

## What Does Not Change

- No new platform aggregate is trusted: every figure rendered is the
  platform's own (candles, levels, event prices, deltas). Nothing here is
  derived except the SVG's coordinate scale.
- `get_open_orders` / `get_order_status` stay unconsumed — the order-row
  shape has still never been observed (empty again on 2026-08-08, no open
  position at probe time). Recorded on `trading-telemetry-is-unread`; the
  item stays open for that and the market-context reads.
- The trades list page keeps its shape; it gains only the per-row link.

## Capabilities touched

- `agent-understanding` — MODIFIED (two port reads, one query, one page,
  one link from the trades list)
- `mcp-control` — MODIFIED (one new read tool on the product's MCP surface)

## Impact

- `src/ports/agents.ts` — two methods, five read-shape types
- `src/infrastructure/battlegrid/agent-adapter.ts` + new
  `trade-story-mapper.ts` — two tool calls, mapping from observed shapes
- `src/application/use-cases/read-trade-story.query.ts` — the join
- `app/(app)/agents/[id]/trades/[logId]/page.tsx` — the page;
  `trades/page.tsx` — the link
- `src/presentation/components/trade-story.tsx` — chart SVG + audit timeline
- `src/mcp/tools.ts` — `read_trade_story`
- `src/composition.ts` — wire the query
- Tests: mapper (observed payloads), query (join + independent failure),
  rendering (all states + SVG), MCP tool states, key-gated live probe
- Docs: `BATTLEGRID_SURFACE_MAP.md`, `MCP_SERVER.md`, `HANDOFF.md`
