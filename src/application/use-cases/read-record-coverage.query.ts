import type { CaptureRun } from '@/domain/recording/capture.js';
import type { SeriesCoverage } from '@/domain/recording/coverage.js';
import { deriveSeriesCoverage } from '@/domain/recording/coverage.js';
import type { Clock } from '@/ports/clock.js';
import type { SignalRecordStore } from '@/ports/signal-record.js';

/**
 * What the record can say about its own continuity — derived from the rows
 * at read time, never a stored summary a migration could strand.
 *
 * Three shapes, kept apart because they send an operator to different
 * places: coverage (recording happens, here is how continuous it is),
 * never-recorded (recording has not started; here is how it starts), and
 * unreadable (the store did not answer — which says nothing about whether
 * recording happens).
 */

/** The one sentence that starts recording, stated where both surfaces read it. */
export const HOW_RECORDING_STARTS =
  'Run bin/grid-commander-record.ts on a schedule you own — cron is enough. ' +
  'Each run captures what every signal says for the account’s deployed coins ' +
  '(or coins you name), and each day without a run is signal history nobody can re-fetch.';

/** A series that has been attempted and has never once succeeded. */
export interface NeverCapturedSeries {
  readonly coinTicker: string;
  readonly interval: string;
  readonly failedAttemptCount: number;
}

export type ReadRecordCoverageResult =
  | {
      readonly kind: 'coverage';
      readonly series: readonly SeriesCoverage[];
      /**
       * Coins that were attempted and never captured. Kept apart from
       * `series` (there is no first/last capture to state) and never
       * dropped — a coin whose every read failed must not render as a coin
       * nobody tried.
       */
      readonly neverCaptured: readonly NeverCapturedSeries[];
      /** Runs that covered nothing — attempts the record keeps, with reasons. */
      readonly coveredNothing: readonly CaptureRun[];
    }
  | { readonly kind: 'never-recorded'; readonly howToStart: string }
  | { readonly kind: 'unreadable'; readonly reason: string };

export class ReadRecordCoverageQuery {
  constructor(
    private readonly store: SignalRecordStore,
    private readonly clock: Clock,
  ) {}

  async execute(req: { userId: string }): Promise<ReadRecordCoverageResult> {
    let recorded;
    try {
      recorded = await this.store.recordedSeries(req.userId);
    } catch (err) {
      // The record exists and did not answer — emphatically not "empty", and
      // not "never recorded": both of those are claims about the record this
      // read cannot back.
      return { kind: 'unreadable', reason: err instanceof Error ? err.message : String(err) };
    }

    if (recorded.series.length === 0 && recorded.coveredNothing.length === 0) {
      return { kind: 'never-recorded', howToStart: HOW_RECORDING_STARTS };
    }

    const now = this.clock.now();
    return {
      kind: 'coverage',
      series: recorded.series
        .filter((s) => s.capturedAt.length > 0)
        .map((s) =>
          deriveSeriesCoverage({
            coinTicker: s.coinTicker,
            interval: s.interval,
            capturedAt: s.capturedAt,
            failedAttemptCount: s.failedAttemptCount,
            now,
          }),
        )
        .sort((a, b) => b.lastCapturedAt.getTime() - a.lastCapturedAt.getTime()),
      neverCaptured: recorded.series
        .filter((s) => s.capturedAt.length === 0)
        .map((s) => ({
          coinTicker: s.coinTicker,
          interval: s.interval,
          failedAttemptCount: s.failedAttemptCount,
        })),
      coveredNothing: recorded.coveredNothing,
    };
  }
}
