import type {
  ReadRegimeContextResult,
  RegimeSeriesContext,
} from '@/application/use-cases/read-regime-context.query.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * The regime context, one block per recorded series — and the honesty rules
 * that make it worth rendering.
 *
 * Every composition states the bars it counts and the span those bars
 * actually cover; a look-back that cannot reach the record's start says so
 * instead of quietly narrowing. Regime labels are the platform's words,
 * rendered verbatim — an unseen label appears the day the platform coins it.
 * The platform-read failures wear the shared cause-accurate sentence; the
 * store failure carries the record's own survival sentence, because
 * BattleGrid is not the cause there (exempted with the stated reason in
 * failure-is-explained.test.ts).
 */

const when = (d: Date): string => d.toISOString().slice(0, 16).replace('T', ' ') + 'Z';

export function RegimeContextPanel({ result }: { result: ReadRegimeContextResult }) {
  if (result.kind === 'unreadable') {
    return (
      <div
        role="alert"
        className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary"
      >
        <p className="font-semibold">The record could not be read.</p>
        <p className="mt-1">{result.reason}</p>
        <p className="mt-1">
          This does not mean the record is empty — the read failed, which says nothing about
          what is recorded.
        </p>
      </div>
    );
  }

  if (result.kind === 'never-recorded') {
    return (
      <div className="space-y-2 text-sm">
        <p>Recording has not started, so there is no window to read the regime over.</p>
        <p className="text-text-secondary">{result.howToStart}</p>
      </div>
    );
  }

  if (result.series.length === 0) {
    return (
      <p className="text-sm">
        Recording has been attempted, but nothing has been captured yet — there is no window
        to read the regime over until a capture succeeds.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {result.series.map((s) => (
        <SeriesBlock key={`${s.coinTicker} ${s.interval}`} s={s} />
      ))}
    </div>
  );
}

function SeriesBlock({ s }: { s: RegimeSeriesContext }) {
  return (
    <section className="space-y-1">
      <h2 className="font-medium">
        {s.coinTicker} · {s.interval}
      </h2>
      <p className="text-sm text-text-secondary">
        {`Recorded window ${when(s.windowFrom)} to ${when(s.windowTo)} — ${s.captureCount} capture${s.captureCount === 1 ? '' : 's'}.`}
      </p>
      <HistoryLines s={s} />
      <NowLine s={s} />
    </section>
  );
}

function HistoryLines({ s }: { s: RegimeSeriesContext }) {
  const h = s.history;
  if (h.kind === 'unreadable') {
    return (
      <div role="alert" className="text-sm">
        <p>{`The regime history for ${s.coinTicker} could not be read: ${h.reason}`}</p>
        <WhyNotLoaded cause={h.cause} subject="this coin’s regime history is" />
      </div>
    );
  }

  if (h.kind === 'none') {
    return (
      <p className="text-sm">
        {`The platform holds no regime history for ${s.coinTicker} at ${s.interval} — in its own terms, a cold cache or an un-enriched timeframe. An empty answer, not a failure.`}
      </p>
    );
  }

  const c = h.composition;
  if (c.barsInWindow === 0) {
    return (
      <p className="text-sm">
        {`The platform holds regime history for ${s.coinTicker}, but none of its bars falls inside this record’s window.`}
      </p>
    );
  }

  return (
    <div className="space-y-1 text-sm">
      <p>
        {`Over ${c.barsInWindow} platform bar${c.barsInWindow === 1 ? '' : 's'} in the window: `}
        {c.labels.map((l, i) => (
          <span key={l.regime}>
            {i > 0 && ', '}
            <code>{l.regime}</code>
            {` — ${l.barCount} bar${l.barCount === 1 ? '' : 's'}`}
          </span>
        ))}
        .
      </p>
      {!c.reachesWindowStart && c.coveredFrom !== null && c.coveredTo !== null && (
        <p className="text-text-secondary">
          {`The platform’s look-back begins ${when(c.coveredFrom)}, after this record started — the composition covers ${when(c.coveredFrom)} to ${when(c.coveredTo)}, not the whole window.`}
        </p>
      )}
      {h.droppedPoints > 0 && (
        <p className="text-text-secondary">
          {`${h.droppedPoints} point${h.droppedPoints === 1 ? '' : 's'} could not be read and ${h.droppedPoints === 1 ? 'is' : 'are'} not counted.`}
        </p>
      )}
    </div>
  );
}

function NowLine({ s }: { s: RegimeSeriesContext }) {
  const snap = s.snapshot;
  if (snap.kind === 'unreadable') {
    return (
      <div role="alert" className="text-sm">
        <p>{`The current regime for ${s.coinTicker} could not be read: ${snap.reason}`}</p>
        <WhyNotLoaded cause={snap.cause} subject="this coin’s current regime is" />
      </div>
    );
  }

  if (snap.kind === 'unclassified') {
    return (
      <p className="text-sm">
        {`Now: the platform classifies no regime for ${s.coinTicker} at ${s.interval} — an answer, not a failure.`}
      </p>
    );
  }

  const v = snap.snapshot;
  return (
    <p className="text-sm">
      Now — not the window: <code>{v.regime}</code>
      {describeNow(v)}
    </p>
  );
}

/**
 * The snapshot's qualifiers as one sentence tail, so the rendered text has
 * no seams: conviction, run length, then every context axis the platform
 * stated, names and values verbatim.
 */
function describeNow(v: {
  readonly conviction: string | null;
  readonly runLengthBars: number | null;
  readonly axes: readonly { readonly axis: string; readonly value: string }[];
}): string {
  const conviction = v.conviction === null ? '' : ` (${v.conviction} conviction)`;
  const held =
    v.runLengthBars === null
      ? ''
      : `, held ${v.runLengthBars} bar${v.runLengthBars === 1 ? '' : 's'}`;
  const axes = v.axes.map((a) => `${a.axis} ${a.value}`).join(', ');
  return `${conviction}${held}${axes === '' ? '' : `; ${axes}`}.`;
}
