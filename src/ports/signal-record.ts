import type {
  CaptureProvenance,
  CaptureRun,
  FailedCapture,
  SignalCapture,
  SignalReading,
} from '@/domain/recording/capture.js';

/**
 * Where the signal record lives.
 *
 * A port rather than a repository import, for the same reason the proposal
 * store is one: the domain and the use-cases never see Drizzle, and the thing
 * that records history is provably separate from anything that reaches
 * BattleGrid. Every method is scoped to one account — ownership goes in the
 * WHERE, never checked after the rows are in hand.
 *
 * `appendCapture` takes the platform's whole answer beside the mapped
 * readings. All nine data bugs in this product's history were mapper drops;
 * on a recorder a mapper drop is not a bug fix away — it is history
 * permanently lost. The raw answer makes every future mapper improvement
 * retroactive over data already recorded.
 */
export interface SignalRecordStore {
  /** Record one run's header. Returns the run id every capture hangs off. */
  recordRun(run: {
    userId: string;
    startedAt: Date;
    platformVersion: string | null;
    provenance: CaptureProvenance;
  }): Promise<string>;

  /**
   * One coin's successful capture — header, every reading, and the raw
   * platform answer, in one transaction. Returns the capture id.
   */
  appendCapture(capture: {
    runId: string;
    userId: string;
    coinTicker: string;
    interval: string;
    capturedAt: Date;
    currentPrice: number;
    priceChangePercent: number;
    dominantBias: string;
    aggregateScorePercent: number;
    hasConflictingSignals: boolean;
    readings: readonly SignalReading[];
    /** The platform's answer as received, post-envelope, pre-mapper. */
    raw: Readonly<Record<string, unknown>>;
  }): Promise<string>;

  /**
   * One coin's read that failed, kept as a fact with its reason. Where an
   * answer arrived but could not be read, it rides along raw — "kept whole"
   * covers the answers the product could not use, or a malformed answer
   * would be the one kind of history the record quietly loses.
   */
  appendFailure(failure: {
    runId: string;
    userId: string;
    coinTicker: string;
    interval: string;
    attemptedAt: Date;
    reason: string;
    raw?: Readonly<Record<string, unknown>> | undefined;
  }): Promise<string>;

  /**
   * One coin's rows, newest first — recorded captures (readings included)
   * and failed attempts, each carrying the run it belonged to, so history
   * can state provenance and platform version beside every reading.
   */
  history(params: {
    userId: string;
    coinTicker: string;
    /** Narrow to one interval; omitted means every interval recorded. */
    interval?: string | undefined;
    limit?: number | undefined;
  }): Promise<CoinRecord>;

  /**
   * Everything recorded for this account, grouped per coin+interval:
   * capture times, failed-attempt counts, and the runs that covered
   * nothing — the inputs coverage is derived from, never a stored summary.
   */
  recordedSeries(userId: string): Promise<RecordedSeries>;

  /**
   * One capture's raw platform answer, byte-faithful. Null when the capture
   * does not exist for this user — including when the id belongs to someone
   * else, which is indistinguishable on purpose.
   */
  rawAnswer(params: { userId: string; captureId: string }): Promise<Readonly<
    Record<string, unknown>
  > | null>;
}

/** One coin's recorded rows, with the runs they belong to. */
export interface CoinRecord {
  readonly captures: readonly (SignalCapture & { readonly run: CaptureRun })[];
  readonly failures: readonly (FailedCapture & { readonly run: CaptureRun })[];
}

export interface RecordedSeries {
  readonly series: readonly {
    readonly coinTicker: string;
    readonly interval: string;
    readonly capturedAt: readonly Date[];
    readonly failedAttemptCount: number;
  }[];
  /** Runs that covered nothing, newest first — attempts the record keeps. */
  readonly coveredNothing: readonly CaptureRun[];
}
