import type { ForwardAggregate } from '@/domain/recording/forward.js';
import { aggregateForward, deriveSeriesForward } from '@/domain/recording/forward.js';
import type { SignalRecordStore } from '@/ports/signal-record.js';
import { HOW_RECORDING_STARTS } from './read-record-coverage.query.js';

/**
 * The record, asked its first analytical question: when a state held, what
 * did price do by the next capture?
 *
 * Derived from the rows at read time, like coverage — never a stored
 * summary. The four arms stay apart for the record's standing reason:
 * "not deep enough to pair" is a fact about depth, "never recorded" is a
 * fact about the recorder, and "unreadable" is a fact about the read, and
 * each sends the operator somewhere different.
 */
export type ReadForwardReturnsResult =
  | {
      readonly kind: 'analysis';
      readonly aggregate: ForwardAggregate;
      /** Depth the figures stand on — always rendered beside them. */
      readonly firstCapturedAt: Date;
      readonly lastCapturedAt: Date;
      readonly seriesCount: number;
      readonly pairCount: number;
      readonly excludedOverGaps: number;
      readonly excludedUnpriceable: number;
    }
  | {
      readonly kind: 'not-deep-enough';
      readonly captureCount: number;
      readonly seriesCount: number;
      readonly firstCapturedAt: Date | null;
      readonly lastCapturedAt: Date | null;
    }
  | { readonly kind: 'never-recorded'; readonly howToStart: string }
  | { readonly kind: 'unreadable'; readonly reason: string };

export class ReadForwardReturnsQuery {
  constructor(private readonly store: SignalRecordStore) {}

  async execute(req: { userId: string }): Promise<ReadForwardReturnsResult> {
    let recorded;
    try {
      recorded = await this.store.recordedSeries(req.userId);
    } catch (err) {
      return { kind: 'unreadable', reason: err instanceof Error ? err.message : String(err) };
    }

    if (recorded.series.length === 0 && recorded.coveredNothing.length === 0) {
      return { kind: 'never-recorded', howToStart: HOW_RECORDING_STARTS };
    }

    const captured = recorded.series.filter((s) => s.capturedAt.length > 0);
    const allPairs = [];
    let excludedOverGaps = 0;
    let excludedUnpriceable = 0;
    let captureCount = 0;
    let first: Date | null = null;
    let last: Date | null = null;

    for (const series of captured) {
      captureCount += series.capturedAt.length;
      for (const t of series.capturedAt) {
        if (first === null || t.getTime() < first.getTime()) first = t;
        if (last === null || t.getTime() > last.getTime()) last = t;
      }

      let record;
      try {
        record = await this.store.history({
          userId: req.userId,
          coinTicker: series.coinTicker,
          interval: series.interval,
          // The history read defaults to its newest 50 rows, which would
          // silently truncate the series this analysis is about. The exact
          // count came from recordedSeries a moment ago; the padding absorbs
          // captures that land between the two reads.
          limit: series.capturedAt.length + 8,
        });
      } catch (err) {
        return { kind: 'unreadable', reason: err instanceof Error ? err.message : String(err) };
      }

      // Failures carry no price and are not in `captures`; the interval
      // filter above scopes the rows to this series.
      const derived = deriveSeriesForward(
        record.captures.filter((c) => c.interval === series.interval),
      );
      allPairs.push(...derived.pairs);
      excludedOverGaps += derived.excludedOverGaps;
      excludedUnpriceable += derived.excludedUnpriceable;
    }

    const aggregate = aggregateForward(allPairs);
    if (aggregate === null || first === null || last === null) {
      return {
        kind: 'not-deep-enough',
        captureCount,
        seriesCount: captured.length,
        firstCapturedAt: first,
        lastCapturedAt: last,
      };
    }

    return {
      kind: 'analysis',
      aggregate,
      firstCapturedAt: first,
      lastCapturedAt: last,
      seriesCount: captured.length,
      pairCount: allPairs.length,
      excludedOverGaps,
      excludedUnpriceable,
    };
  }
}
