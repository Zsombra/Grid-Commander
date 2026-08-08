import type {
  AuditEvent,
  Candle,
  ChartLevel,
  ChartMarker,
  TradeChart,
  TradeChartResult,
} from '@/ports/agents.js';
import { malformed } from './unreadable.js';

/**
 * `get_trade_chart` and `get_position_audit_history`, read into the port's
 * shapes. Shaped from the live payloads of **2026-08-08** — six READY charts
 * and a ten-event audit trail on settled trades — recorded in
 * `trading-telemetry-is-unread`.
 *
 * Nothing here derives. The chart's prices arrive as numbers and stay
 * numbers; the audit trail's prices arrive as decimal strings and stay
 * strings; a role, kind or status this product does not recognise is
 * carried, not dropped — except the chart's own `status`, which this mapper
 * must branch on and therefore reports as unreadable when it cannot.
 */

const asRecord = (raw: unknown): Record<string, unknown> =>
  typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

const text = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const flag = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

function mapCandle(raw: unknown): Candle {
  const c = asRecord(raw);
  return {
    openTime: text(c['openTime']),
    timeSeconds: num(c['timeSeconds']),
    open: num(c['open']),
    high: num(c['high']),
    low: num(c['low']),
    close: num(c['close']),
    volume: num(c['volume']),
  };
}

function mapLevel(raw: unknown): ChartLevel {
  const l = asRecord(raw);
  return {
    // A level with no role is still a line at a price; '(unnamed)' keeps it
    // drawable without inventing a vocabulary entry the platform did not send.
    role: text(l['role']) ?? '(unnamed)',
    label: text(l['label']),
    price: num(l['price']),
  };
}

function mapMarker(raw: unknown): ChartMarker {
  const m = asRecord(raw);
  return {
    role: text(m['role']) ?? '(unnamed)',
    timeSeconds: num(m['timeSeconds']),
    price: num(m['price']),
  };
}

function mapChart(raw: Record<string, unknown>): TradeChart {
  const candles = Array.isArray(raw['candles']) ? raw['candles'].map(mapCandle) : [];
  const levels = Array.isArray(raw['levels']) ? raw['levels'].map(mapLevel) : [];
  const markers = Array.isArray(raw['markers']) ? raw['markers'].map(mapMarker) : [];
  return {
    signalLogId: text(raw['signalLogId']),
    positionId: text(raw['positionId']),
    coinTicker: text(raw['coinTicker']),
    timeframe: text(raw['timeframe']),
    source: text(raw['source']),
    windowStart: text(raw['windowStart']),
    windowEnd: text(raw['windowEnd']),
    candles,
    levels,
    markers,
    snapshotCapturedAt: text(raw['snapshotCapturedAt']),
  };
}

/**
 * The declared discrimination, kept whole: READY carries the chart,
 * UNAVAILABLE is an evaluation that never became a filled trade, NOT_FOUND
 * is an evaluation that is not this agent's. A status outside the declared
 * three cannot be branched on honestly, so it is reported as an answer
 * that was not an answer — naming the word the platform used.
 */
export function mapTradeChart(payload: Record<string, unknown>): TradeChartResult {
  const result = asRecord(payload['result']);
  const status = text(result['status']);
  if (status === 'READY') {
    const chart = result['chart'];
    if (typeof chart !== 'object' || chart === null) {
      return malformed('the chart was marked ready but no chart came with it');
    }
    return { kind: 'chart', chart: mapChart(chart as Record<string, unknown>) };
  }
  if (status === 'UNAVAILABLE') return { kind: 'no-trade' };
  if (status === 'NOT_FOUND') return { kind: 'not-found' };
  return malformed(
    status === null
      ? 'the chart answer carried no status'
      : `the chart answered with a status this product does not know: ${status}`,
  );
}

/**
 * One audit event. `price` vs `fromPrice`/`toPrice` is the platform's own
 * split — placements, fills and cancellations carry the first, reprices
 * carry the pair — and both sides are decimal strings as sent. An empty
 * string is not a price the platform has ever sent, so `text` is the right
 * reader even for money here.
 */
export function mapAuditEvent(raw: unknown): AuditEvent {
  const e = asRecord(raw);
  return {
    kind: text(e['kind']) ?? '(unnamed event)',
    leg: text(e['leg']),
    orderId: text(e['orderId']),
    at: text(e['createdAt']),
    heldMs: num(e['heldMs']),
    vsEntryPct: num(e['vsEntryPct']),
    price: text(e['price']),
    fromPrice: text(e['fromPrice']),
    toPrice: text(e['toPrice']),
    triggerDeltaPct: num(e['triggerDeltaPct']),
    improved: flag(e['improved']),
    repriceSource: text(e['repriceSource']),
    replacementOrderId: text(e['replacementOrderId']),
  };
}
