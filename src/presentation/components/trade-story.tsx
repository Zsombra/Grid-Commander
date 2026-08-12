import type {
  AuditEvent,
  Candle,
  PositionAuditResult,
  TradeChart,
} from '@/ports/agents.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * One trade, told whole: the platform's frozen chart, then the audit trail
 * of what position management did while the trade was open.
 *
 * Every figure on this surface is the platform's — candle prices, level
 * prices, event prices, deltas, the `improved` judgement. The only thing
 * computed here is the SVG coordinate scale, which is layout, not a claim.
 *
 * The chart's levels are the levels **as placed**; the trail below is how
 * they moved. Both appear on one page, so both are labelled — the same
 * one-word-two-numbers discipline the pipeline and position surfaces hold
 * for the stop.
 */

const W = 760;
const H = 300;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;
const PAD_LEFT = 8;
/** Right gutter wide enough for a level's label and price. */
const PAD_RIGHT = 150;

interface Scale {
  readonly x: (timeSeconds: number) => number;
  readonly y: (price: number) => number;
  readonly bodyWidth: number;
}

/**
 * The one derivation on this surface: fitting the platform's numbers into
 * a viewBox. The domain spans everything drawable — candle wicks, level
 * prices, marker prices — so a stop far below the candles is drawn where
 * it is rather than clipped to where it would be convenient.
 */
function scaleFor(
  candles: readonly Candle[],
  levelPrices: readonly number[],
  markers: readonly { timeSeconds: number | null; price: number | null }[],
): Scale | null {
  const times = [
    ...candles.map((c) => c.timeSeconds),
    ...markers.map((m) => m.timeSeconds),
  ].filter((t): t is number => t !== null);
  const prices = [
    ...candles.flatMap((c) => [c.high, c.low]),
    ...levelPrices,
    ...markers.map((m) => m.price),
  ].filter((p): p is number => p !== null);
  if (times.length === 0 || prices.length === 0) return null;

  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const pMin = Math.min(...prices);
  const pMax = Math.max(...prices);

  const drawableCount = Math.max(candles.filter((c) => c.timeSeconds !== null).length, 1);
  const step = tMax > tMin ? (tMax - tMin) / Math.max(drawableCount - 1, 1) : 1;
  const tSpan = tMax - tMin + step;
  const pPad = (pMax - pMin || Math.abs(pMax) || 1) * 0.05;
  const pSpan = pMax - pMin + 2 * pPad;

  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  return {
    x: (t) => PAD_LEFT + ((t - tMin + step / 2) / tSpan) * plotW,
    y: (p) => PAD_TOP + ((pMax + pPad - p) / pSpan) * plotH,
    bodyWidth: Math.max(Math.min((step / tSpan) * plotW * 0.6, 14), 1.5),
  };
}

/**
 * Colors for the vocabulary that has been observed, a neutral for anything
 * else — the role is still drawn and named either way. Choosing a color is
 * presentation; refusing to draw an unknown role would be a judgement.
 */
const levelColor = (role: string): string =>
  role === 'STOP_LOSS'
    ? 'var(--gc-danger-default)'
    : role === 'TAKE_PROFIT'
      ? 'var(--gc-success-default)'
      : 'var(--gc-notice-default)';

const markerColor = (role: string): string =>
  role === 'ENTRY'
    ? 'var(--gc-accent-default)'
    : role === 'EXIT'
      ? 'var(--gc-warning-default)'
      : 'var(--gc-notice-default)';

export function TradeChartSvg({ chart }: { chart: TradeChart }) {
  const scale = scaleFor(
    chart.candles,
    chart.levels.map((l) => l.price).filter((p): p is number => p !== null),
    chart.markers,
  );
  if (scale === null) {
    // A READY answer with nothing drawable is a fact worth a sentence, not
    // an empty rectangle pretending to be a quiet market.
    return <p className="text-sm">The platform sent this chart with nothing drawable on it.</p>;
  }
  const { x, y, bodyWidth } = scale;

  const described = `${chart.coinTicker ?? 'This trade'}: ${String(chart.candles.length)} frozen candles with the levels as placed and the entry and exit markers`;

  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      role="img"
      aria-label={described}
      className="w-full rounded-gc-2 border border-border-default"
      style={{ background: 'var(--gc-bg-sunken)' }}
    >
      <title>{described}</title>
      {chart.candles.map((c, i) =>
        c.timeSeconds === null ? null : (
          <g key={c.timeSeconds ?? i}>
            {c.high !== null && c.low !== null ? (
              <line
                x1={x(c.timeSeconds)}
                x2={x(c.timeSeconds)}
                y1={y(c.high)}
                y2={y(c.low)}
                stroke="var(--gc-border-strong)"
                strokeWidth={1}
              />
            ) : null}
            {c.open !== null && c.close !== null ? (
              <rect
                x={x(c.timeSeconds) - bodyWidth / 2}
                y={y(Math.max(c.open, c.close))}
                width={bodyWidth}
                height={Math.max(Math.abs(y(c.open) - y(c.close)), 1)}
                fill={
                  c.close >= c.open ? 'var(--gc-success-default)' : 'var(--gc-danger-default)'
                }
              />
            ) : null}
          </g>
        ),
      )}
      {chart.levels.map((l, i) =>
        l.price === null ? null : (
          <g key={`${l.role}-${String(i)}`}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT + 6}
              y1={y(l.price)}
              y2={y(l.price)}
              stroke={levelColor(l.role)}
              strokeWidth={1}
              strokeDasharray="5 4"
            />
            <text
              x={W - PAD_RIGHT + 10}
              y={y(l.price) + 3.5}
              fontSize={11}
              fill={levelColor(l.role)}
            >
              {`${l.label ?? l.role} ${String(l.price)}`}
            </text>
          </g>
        ),
      )}
      {chart.markers.map((m, i) =>
        m.timeSeconds === null || m.price === null ? null : (
          <g key={`${m.role}-${String(i)}`}>
            <circle cx={x(m.timeSeconds)} cy={y(m.price)} r={4.5} fill={markerColor(m.role)} />
            <text
              x={x(m.timeSeconds)}
              y={y(m.price) - 8}
              fontSize={11}
              textAnchor="middle"
              fill={markerColor(m.role)}
            >
              {`${m.role} ${String(m.price)}`}
            </text>
          </g>
        ),
      )}
    </svg>
  );
}

/** Milliseconds as a human span. Formatting, not measurement. */
function held(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${String(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${String(m)}m ${String(s % 60)}s`;
  return `${String(Math.floor(m / 60))}h ${String(m % 60)}m`;
}

/** The signed distance from entry, with the platform's sign kept visible. */
const vsEntry = (pct: number): string => `${pct > 0 ? '+' : ''}${String(pct)}% vs entry`;

function AuditEventRow({ event }: { event: AuditEvent }) {
  const isReprice = event.fromPrice !== null || event.toPrice !== null;
  const facts: string[] = [];
  if (isReprice) {
    // Both prices exactly as sent — decimal strings the platform chose.
    facts.push(`${event.fromPrice ?? '—'} → ${event.toPrice ?? '—'}`);
    if (event.triggerDeltaPct !== null) facts.push(`a ${String(event.triggerDeltaPct)}% move`);
    if (event.repriceSource !== null) facts.push(`source ${event.repriceSource}`);
    if (event.improved !== null) {
      facts.push(event.improved ? 'the platform judged it improved protection' : 'the platform judged it did not improve protection');
    }
  } else if (event.price !== null) {
    facts.push(`at ${event.price}`);
  }
  if (event.vsEntryPct !== null) facts.push(vsEntry(event.vsEntryPct));
  if (event.heldMs !== null) facts.push(`after ${held(event.heldMs)}`);

  return (
    <li className="text-sm space-y-0.5">
      <p className="font-medium">{`${event.kind}${event.leg !== null ? ` · ${event.leg} leg` : ''}`}</p>
      {facts.length > 0 ? <p>{facts.join(' · ')}</p> : null}
      {event.at !== null ? (
        <p className="text-text-secondary">
          <time dateTime={event.at}>{event.at}</time>
        </p>
      ) : null}
    </li>
  );
}

/**
 * The trail, in the platform's order, or the exact reason there is none to
 * show. Three absent states, three sentences: no address is not an empty
 * trail, and an unreadable trail is neither.
 */
export function AuditTrail({ audit }: { audit: PositionAuditResult | null }) {
  if (audit === null) {
    return (
      <p className="text-sm">
        The platform named no position for this trade, so there is no audit trail to ask about.
      </p>
    );
  }
  if (audit.kind === 'unreadable') {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-sm">
          {`The audit trail could not be read: ${audit.reason}`}
        </p>
        <WhyNotLoaded cause={audit.cause} subject="the trail is" />
      </div>
    );
  }
  if (audit.kind === 'none') {
    return (
      <p className="text-sm">The platform has no lifecycle events for this position.</p>
    );
  }
  return (
    <ol className="space-y-3 border-l border-border-default pl-4">
      {audit.events.map((e, i) => (
        <AuditEventRow key={`${e.orderId ?? ''}-${e.kind}-${String(i)}`} event={e} />
      ))}
    </ol>
  );
}

export function TradeStoryView({
  chart,
  audit,
}: {
  chart: TradeChart;
  audit: PositionAuditResult | null;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-base font-medium">
          {`The chart the platform froze${chart.timeframe !== null ? ` — ${chart.timeframe} candles` : ''}`}
        </h2>
        <TradeChartSvg chart={chart} />
        <p className="text-sm text-text-secondary">
          {`The stop and target lines are the levels as placed when the trade opened. The trail below is how they moved.`}
        </p>
        <p className="text-sm text-text-secondary">
          {chart.windowStart !== null && chart.windowEnd !== null
            ? `Window ${chart.windowStart} to ${chart.windowEnd}. `
            : ''}
          {chart.snapshotCapturedAt !== null ? (
            <>
              {'Frozen by the platform at '}
              <time dateTime={chart.snapshotCapturedAt}>{chart.snapshotCapturedAt}</time>
              {chart.source !== null ? ` from ${chart.source}.` : '.'}
            </>
          ) : null}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">What position management did</h2>
        <AuditTrail audit={audit} />
      </section>
    </div>
  );
}
