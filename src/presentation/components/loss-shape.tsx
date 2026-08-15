import type { ReadLossShapeResult } from '@/application/use-cases/read-loss-shape.query.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * How it got here: the realized P&L behind the drawdown gauge, and the curve
 * it moved along.
 *
 * The gauges above answer "how close is it to being stopped"; this answers
 * how the distance arrived — 1.90 of 6 in one settlement and 1.90 of 6
 * across forty-one are different agents. The reading is BattleGrid's own,
 * measured since the budget baseline, and is deliberately not the trading
 * record: the caption names the span so the two accounts of the money are
 * never read as one.
 *
 * The product's second chart, inheriting `TradeChartSvg`'s decisions:
 * hand-scaled inline SVG, no charting dependency, and a sentence rather than
 * an empty rectangle when there is nothing drawable. An empty curve is a
 * legitimate state — the platform says it means no settlements yet, not
 * missing data — so it renders as that sentence, never as an error.
 */

const W = 240;
const H = 48;
const PAD = 4;

/**
 * Rounded to the platform's own precision (four decimals — see the spend
 * figure on this page), with a real minus sign, which is how every negative
 * figure on these surfaces renders.
 */
function money(v: number): string {
  const rounded = Math.round(Math.abs(v) * 10000) / 10000;
  const sign = v < 0 ? '−' : v > 0 ? '+' : '';
  return `${sign}$${String(rounded)}`;
}

/**
 * The curve scaled into the frame, with zero always inside the range.
 *
 * Zero is kept in range because the shape's meaning is relative to breaking
 * even: a curve that never crosses zero should visibly sit on one side of
 * the baseline, not fill the frame as if the baseline were wherever it
 * started.
 */
function scaled(curve: readonly number[]): { points: string; zeroY: number } {
  const lo = Math.min(0, ...curve);
  const hi = Math.max(0, ...curve);
  const span = hi - lo || 1;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const x = (i: number): number =>
    curve.length === 1 ? PAD + innerW / 2 : PAD + (i / (curve.length - 1)) * innerW;
  const y = (v: number): number => PAD + ((hi - v) / span) * innerH;
  return {
    points: curve.map((v, i) => `${String(x(i))},${String(y(v))}`).join(' '),
    zeroY: y(0),
  };
}

export function LossShapePanel({ shape }: { shape: ReadLossShapeResult }) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium">How it got here</h2>

      {shape.kind === 'unreadable' ? (
        <>
          <p role="status" className="text-sm">
            How this agent&rsquo;s realized P&amp;L arrived could not be read: {shape.reason}
          </p>
          <WhyNotLoaded subject="how its realized P&L arrived is" cause={shape.cause} />
        </>
      ) : shape.settlements === 0 ? (
        <p className="text-sm">
          Nothing has settled since the budget baseline yet. BattleGrid measures this
          reading from that baseline and its curve gains a point per settlement — an
          empty curve means no settlements, not missing data.
        </p>
      ) : (
        <>
          <p className="text-sm">
            {shape.realizedPnlUsd === null ? (
              <>BattleGrid reported the curve below without a realized total.</>
            ) : (
              <>
                <strong>{money(shape.realizedPnlUsd)}</strong> realized
              </>
            )}{' '}
            across {shape.settlements}{' '}
            {shape.settlements === 1 ? 'settlement' : 'settlements'} since the budget
            baseline, as BattleGrid measures it.
          </p>
          <LossShapeSvg curve={shape.curve} realized={shape.realizedPnlUsd} />
          <p className="text-sm text-text-secondary">
            This is not the trading record: the record counts every closed trade over the
            agent&rsquo;s lifetime, while this reading starts at the budget baseline.
          </p>
        </>
      )}
    </section>
  );
}

function LossShapeSvg({ curve, realized }: { curve: readonly number[]; realized: number | null }) {
  const { points, zeroY } = scaled(curve);
  const described = `Cumulative realized P&L since the budget baseline: ${String(curve.length)} settlement${curve.length === 1 ? '' : 's'}, ending at ${money(curve[curve.length - 1] ?? realized ?? 0)}`;

  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      role="img"
      aria-label={described}
      className="w-full max-w-sm rounded-gc-2 border border-border-default"
      style={{ background: 'var(--gc-bg-sunken)' }}
    >
      <title>{described}</title>
      <line
        x1={PAD}
        x2={W - PAD}
        y1={zeroY}
        y2={zeroY}
        stroke="var(--gc-border-strong)"
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      {curve.length === 1 ? (
        /* One settlement has no line to draw; a point is the honest shape. */
        <circle
          cx={W / 2}
          cy={Number(points.split(',')[1])}
          r={3}
          fill="var(--gc-accent-default)"
        />
      ) : (
        <polyline
          points={points}
          fill="none"
          stroke="var(--gc-accent-default)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
