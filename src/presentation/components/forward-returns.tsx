import type { ReadForwardReturnsResult } from '@/application/use-cases/read-forward-returns.query.js';
import type { ForwardStat } from '@/domain/recording/forward.js';

/**
 * The analysis, in its four states — and the honesty rules it exists to keep.
 *
 * Every figure renders with the pair count it stands on, and every table
 * arrives in the query's order (sample size descending), which the spec pins:
 * sorting by the return is how a two-sample fluke tops a table, the same
 * failure the trading record guards on win rates. The depth line renders
 * before any figure so the reader knows what the numbers stand on before
 * reading them.
 */

/** Signed percent at the precision hourly forward returns actually have. */
function pct(v: number): string {
  const rounded = Math.abs(v).toFixed(3);
  const sign = v < 0 ? '−' : v > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

const share = (v: number): string => `${String(Math.round(v * 100))}%`;

const when = (d: Date): string => d.toISOString().slice(0, 16).replace('T', ' ') + 'Z';

export function ForwardReturnsPanel({ result }: { result: ReadForwardReturnsResult }) {
  if (result.kind === 'unreadable') {
    return (
      <div role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">
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
        <p>Recording has not started, so there is nothing to analyze yet.</p>
        <p className="text-text-secondary">{result.howToStart}</p>
      </div>
    );
  }

  if (result.kind === 'not-deep-enough') {
    return (
      <p className="text-sm">
        The record holds {result.captureCount} capture{result.captureCount === 1 ? '' : 's'}{' '}
        across {result.seriesCount} series
        {result.firstCapturedAt && result.lastCapturedAt ? (
          <> ({when(result.firstCapturedAt)} to {when(result.lastCapturedAt)})</>
        ) : null}{' '}
        — not yet deep enough to pair a single forward return. That is a fact about depth, not
        a failure: the recorder keeps running, and this page starts answering at two captures
        of one series.
      </p>
    );
  }

  const a = result.aggregate;
  return (
    <div className="space-y-4">
      {/* The depth first, so every figure below is read against it. */}
      <p role="status" className="rounded-gc-2 border border-notice-border bg-notice-subtle p-3 text-sm text-text-primary">
        These figures stand on <strong>{result.pairCount} pairs</strong> from{' '}
        {result.seriesCount} series, {when(result.firstCapturedAt)} to{' '}
        {when(result.lastCapturedAt)}.{' '}
        {result.excludedOverGaps > 0 && (
          <>
            {result.excludedOverGaps} pair{result.excludedOverGaps === 1 ? '' : 's'} excluded
            over recording gaps — a return across a hole is not a return over one cadence
            step.{' '}
          </>
        )}
        {result.excludedUnpriceable > 0 && (
          <>{result.excludedUnpriceable} excluded for unusable prices. </>
        )}
        Small samples read as noise; the pair count beside each figure is the figure.
      </p>

      <section className="space-y-1">
        <h2 className="font-medium">Baseline — every pair, unconditioned</h2>
        <p className="text-sm">
          {a.baseline.n} pairs: mean {pct(a.baseline.meanPct)}, median{' '}
          {pct(a.baseline.medianPct)}, {share(a.baseline.sharePositive)} positive. The tables
          below are read against this, not against zero.
        </p>
      </section>

      <StatTable
        title="By triggered signal"
        keyHeader="Signal"
        note="A pair counts toward a signal when that signal was triggered at the earlier capture."
        rows={a.perSignal}
      />
      <StatTable title="By dominant bias" keyHeader="Bias" rows={a.perBias} />
      <StatTable title="By conflicting signals" keyHeader="State" rows={a.perConflict} />
    </div>
  );
}

function StatTable({
  title,
  keyHeader,
  rows,
  note,
}: {
  title: string;
  keyHeader: string;
  rows: readonly ForwardStat[];
  note?: string;
}) {
  return (
    <section className="space-y-1">
      <h2 className="font-medium">{title}</h2>
      {note && <p className="text-sm text-text-secondary">{note}</p>}
      {/* Ordered by sample size, never by return — the query's order is kept. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-text-secondary">
              <th className="py-1 pr-3 font-medium">{keyHeader}</th>
              <th className="py-1 pr-3 font-medium">Pairs</th>
              <th className="py-1 pr-3 font-medium">Mean</th>
              <th className="py-1 pr-3 font-medium">Median</th>
              <th className="py-1 font-medium">Positive</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border-subtle">
                <td className="py-1 pr-3">{row.key}</td>
                <td className="py-1 pr-3">{row.n}</td>
                <td className="py-1 pr-3">{pct(row.meanPct)}</td>
                <td className="py-1 pr-3">{pct(row.medianPct)}</td>
                <td className="py-1">{share(row.sharePositive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
