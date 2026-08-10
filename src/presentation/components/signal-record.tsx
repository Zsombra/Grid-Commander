import type {
  NeverCapturedSeries,
  ReadRecordCoverageResult,
} from '@/application/use-cases/read-record-coverage.query.js';
import type {
  SignalHistoryPoint,
  TimelineEntry,
} from '@/application/use-cases/read-signal-history.query.js';
import type { CaptureProvenance, CaptureRun } from '@/domain/recording/capture.js';
import type { CoverageGap, SeriesCoverage } from '@/domain/recording/coverage.js';

/**
 * The signal record, rendered as what it is: a record.
 *
 * Two rules shape every element here. A reading is never passed off as now —
 * each one carries the time it was captured, machine-readable. And an absence
 * is never quiet: a gap is stated with its span, a failed attempt with its
 * reason, and a store that did not answer as exactly that.
 */

/** The platform's own stamp, unrounded and unlocalised. */
const stamp = (d: Date): string => d.toISOString();

const price = (v: number): string => `$${v}`;

/** A span in seconds, worded at the coarsest honest unit. */
const span = (seconds: number): string => {
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days === 1 ? '' : 's'}`;
};

function CapturedAt({ at }: { at: Date }) {
  return (
    <time dateTime={stamp(at)} className="text-text-secondary">
      captured {stamp(at)}
    </time>
  );
}

/** Where a run's coins came from — part of what every reading means. */
export function ProvenanceLine({ provenance }: { provenance: CaptureProvenance }) {
  if (provenance.kind === 'named') {
    return (
      <span className="text-text-secondary">
        coins named by the operator ({provenance.coins.join(', ')} at {provenance.interval})
      </span>
    );
  }
  if (provenance.kind === 'deployments') {
    return (
      <span className="text-text-secondary">
        coins from the account’s deployments as they were at capture time (
        {provenance.pairs.map((p) => `${p.coinTicker}@${p.timeframe}`).join(', ')})
      </span>
    );
  }
  return <span className="text-text-secondary">covered nothing — {provenance.reason}</span>;
}

function Gaps({ gaps }: { gaps: readonly CoverageGap[] }) {
  if (gaps.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {gaps.map((g) => (
        <li key={stamp(g.fromCapturedAt)}>
          <span className="font-medium">Gap in recording</span> — {span(g.spanSeconds)} with no
          capture,{' '}
          {g.toCapturedAt === null ? (
            <>
              since <time dateTime={stamp(g.fromCapturedAt)}>{stamp(g.fromCapturedAt)}</time>, still
              open
            </>
          ) : (
            <>
              from <time dateTime={stamp(g.fromCapturedAt)}>{stamp(g.fromCapturedAt)}</time> to{' '}
              <time dateTime={stamp(g.toCapturedAt)}>{stamp(g.toCapturedAt)}</time>
            </>
          )}
          . The signals said things in this span; nothing recorded them.
        </li>
      ))}
    </ul>
  );
}

function SeriesRow({ series }: { series: SeriesCoverage }) {
  return (
    <li className="space-y-1 rounded border p-3 text-sm">
      <p className="text-base font-medium">
        <a href={`/recorder/${series.coinTicker}`}>{series.coinTicker}</a>{' '}
        <span className="text-text-secondary">at {series.interval}</span>
      </p>
      <p>
        {`${series.captureCount} capture${series.captureCount === 1 ? '' : 's'}, first `}
        <time dateTime={stamp(series.firstCapturedAt)}>{stamp(series.firstCapturedAt)}</time>
        {', latest '}
        <time dateTime={stamp(series.lastCapturedAt)}>{stamp(series.lastCapturedAt)}</time>
        {series.failedAttemptCount > 0 &&
          ` · ${series.failedAttemptCount} failed attempt${series.failedAttemptCount === 1 ? '' : 's'}`}
      </p>
      <Gaps gaps={series.gaps} />
    </li>
  );
}

function NeverCapturedRow({ series }: { series: NeverCapturedSeries }) {
  return (
    <li className="space-y-1 rounded border p-3 text-sm">
      <p className="text-base font-medium">
        {series.coinTicker} <span className="text-text-secondary">at {series.interval}</span>
      </p>
      <p>
        {`Attempted and never captured — ${series.failedAttemptCount} failed attempt${
          series.failedAttemptCount === 1 ? '' : 's'
        }, no readings recorded. See `}
        <a href={`/recorder/${series.coinTicker}`}>the attempts</a> for the reasons.
      </p>
    </li>
  );
}

function CoveredNothing({ runs }: { runs: readonly CaptureRun[] }) {
  if (runs.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Runs that covered nothing</h3>
      <ul className="space-y-1 text-sm">
        {runs.map((r) => (
          <li key={r.id}>
            <time dateTime={stamp(r.startedAt)}>{stamp(r.startedAt)}</time> —{' '}
            {r.provenance.kind === 'nothing' ? r.provenance.reason : 'covered nothing'}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The record's own account of itself. The three states are three different
 * facts, and none may borrow another's rendering: recording happening (with
 * its gaps), recording never started (with how to start), and the record not
 * answering (with why that is not "empty").
 */
export function RecordCoverage({ result }: { result: ReadRecordCoverageResult }) {
  if (result.kind === 'unreadable') {
    return (
      <section className="space-y-2">
        <p className="font-medium">The record could not be read.</p>
        <p className="text-sm text-text-secondary">{result.reason}</p>
        <p className="text-sm">
          This does not mean nothing is recorded — the store did not answer, which says nothing
          about what it holds.
        </p>
      </section>
    );
  }
  if (result.kind === 'never-recorded') {
    return (
      <section className="space-y-2">
        <p className="font-medium">Recording has not started.</p>
        <p className="text-sm">{result.howToStart}</p>
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <ul className="space-y-2">
        {result.series.map((s) => (
          <SeriesRow key={`${s.coinTicker} ${s.interval}`} series={s} />
        ))}
        {result.neverCaptured.map((s) => (
          <NeverCapturedRow key={`${s.coinTicker} ${s.interval}`} series={s} />
        ))}
      </ul>
      <CoveredNothing runs={result.coveredNothing} />
    </section>
  );
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === 'failed') {
    return (
      <li className="space-y-1 rounded border p-3 text-sm">
        <p className="font-medium">Could not be read</p>
        <p>
          <time dateTime={stamp(entry.attemptedAt)} className="text-text-secondary">
            attempted {stamp(entry.attemptedAt)}
          </time>{' '}
          at {entry.interval} — {entry.reason}
        </p>
        <p className="text-text-secondary">
          A failed read, recorded. Not a quiet market: the signals said things here and this
          product could not hear them.
        </p>
      </li>
    );
  }
  return (
    <li className="space-y-1 rounded border p-3 text-sm">
      <p>
        <CapturedAt at={entry.capturedAt} /> {`at ${entry.interval}`}
        <span className="text-text-secondary">
          {entry.platformVersion !== null
            ? ` · platform ${entry.platformVersion}`
            : ' · platform generation unknown'}
        </span>
      </p>
      <p>
        {`Price ${price(entry.currentPrice)} (${entry.priceChangePercent}%) · aggregate ${entry.aggregateScorePercent}% · bias ${entry.dominantBias}`}
        {entry.hasConflictingSignals && ' · signals conflicted'}
      </p>
      <p className="text-text-secondary">
        {`${entry.triggeredCount} of ${entry.readingCount} signals triggered · `}
        <ProvenanceLine provenance={entry.provenance} />
      </p>
    </li>
  );
}

/** One coin's captures and failed attempts, newest first, none passed off as now. */
export function CoinTimeline({ entries }: { entries: readonly TimelineEntry[] }) {
  return (
    <ul className="space-y-2">
      {entries.map((entry, i) => (
        <TimelineRow key={i} entry={entry} />
      ))}
    </ul>
  );
}

/**
 * What one signal said across captures. The price at each capture renders
 * beside the reading — consecutive rows are how a reader asks "and what did
 * the market do next" without this product claiming any statistics about it.
 */
export function SignalHistoryView({
  signalId,
  points,
}: {
  signalId: string;
  points: readonly SignalHistoryPoint[];
}) {
  if (points.length === 0) {
    return (
      <p className="text-sm">
        <span className="font-medium">{signalId}</span> has no readings in this coin’s captures —
        the platform did not evaluate it here, or the id is not one it uses.
      </p>
    );
  }
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{signalId} across captures</h3>
      <ul className="space-y-2">
        {points.map((p) => (
          <li key={stamp(p.capturedAt)} className="space-y-1 rounded border p-3 text-sm">
            <p>
              <CapturedAt at={p.capturedAt} /> at {p.interval} · price {price(p.currentPrice)}
            </p>
            <p>
              {p.reading.triggered ? 'Triggered' : 'Not triggered'}
              {p.reading.bias !== null && <> · bias {p.reading.bias}</>}
              {p.reading.direction !== null && <> · direction {p.reading.direction}</>}
              {p.reading.scorePercent !== null && <> · score {p.reading.scorePercent}%</>}
              {p.reading.effectiveAllocation !== null && (
                <> · allocation {p.reading.effectiveAllocation}</>
              )}
            </p>
            {p.reading.details !== null && (
              <p className="text-text-secondary">{p.reading.details}</p>
            )}
            {Object.keys(p.reading.indicatorValues).length > 0 && (
              <p className="text-text-secondary">
                {Object.entries(p.reading.indicatorValues)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(' · ')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
