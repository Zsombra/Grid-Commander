import type { CaptureProvenance, SignalReading } from '@/domain/recording/capture.js';
import type { SignalRecordStore } from '@/ports/signal-record.js';

/**
 * One coin's recorded history — the timeline of captures and failures in
 * time order, and, when a signal is named, what that one signal said across
 * captures.
 *
 * Every entry carries its capture time and the run facts (provenance,
 * platform generation) because a reading without them is not evidence: what
 * a verdict means depends on who chose the coin, and whether two readings
 * are comparable depends on which platform generation produced them.
 */

export interface TimelineCapture {
  readonly kind: 'recorded';
  readonly captureId: string;
  readonly capturedAt: Date;
  readonly interval: string;
  readonly currentPrice: number;
  readonly priceChangePercent: number;
  readonly dominantBias: string;
  readonly aggregateScorePercent: number;
  readonly hasConflictingSignals: boolean;
  readonly readingCount: number;
  readonly triggeredCount: number;
  readonly platformVersion: string | null;
  readonly provenance: CaptureProvenance;
}

export interface TimelineFailure {
  readonly kind: 'failed';
  readonly attemptedAt: Date;
  readonly interval: string;
  readonly reason: string;
  readonly platformVersion: string | null;
  readonly provenance: CaptureProvenance;
}

export type TimelineEntry = TimelineCapture | TimelineFailure;

/** One signal's reading at one capture, with the price it was read beside. */
export interface SignalHistoryPoint {
  readonly capturedAt: Date;
  readonly interval: string;
  readonly currentPrice: number;
  readonly reading: SignalReading;
}

export type ReadSignalHistoryResult =
  | {
      readonly kind: 'history';
      readonly coinTicker: string;
      /** Newest first. Failures interleaved as themselves, never hidden. */
      readonly entries: readonly TimelineEntry[];
      /**
       * Present when a signal was asked about. Empty readings mean the
       * signal never appeared in this coin's captures — which is a fact
       * about the record, stated as one.
       */
      readonly signal: {
        readonly signalId: string;
        readonly points: readonly SignalHistoryPoint[];
      } | null;
    }
  /** Nothing recorded for this coin. Distinct from a store that failed. */
  | { readonly kind: 'empty'; readonly coinTicker: string }
  | { readonly kind: 'unreadable'; readonly reason: string };

export interface ReadSignalHistoryRequest {
  readonly userId: string;
  readonly coinTicker: string;
  readonly interval?: string | undefined;
  readonly signalId?: string | undefined;
  readonly limit?: number | undefined;
}

export class ReadSignalHistoryQuery {
  constructor(private readonly store: SignalRecordStore) {}

  async execute(req: ReadSignalHistoryRequest): Promise<ReadSignalHistoryResult> {
    const coinTicker = req.coinTicker.trim().toUpperCase();
    let record;
    try {
      record = await this.store.history({
        userId: req.userId,
        coinTicker,
        interval: req.interval,
        limit: req.limit,
      });
    } catch (err) {
      return { kind: 'unreadable', reason: err instanceof Error ? err.message : String(err) };
    }

    if (record.captures.length === 0 && record.failures.length === 0) {
      return { kind: 'empty', coinTicker };
    }

    const entries: TimelineEntry[] = [
      ...record.captures.map(
        (c): TimelineCapture => ({
          kind: 'recorded',
          captureId: c.id,
          capturedAt: c.capturedAt,
          interval: c.interval,
          currentPrice: c.currentPrice,
          priceChangePercent: c.priceChangePercent,
          dominantBias: c.dominantBias,
          aggregateScorePercent: c.aggregateScorePercent,
          hasConflictingSignals: c.hasConflictingSignals,
          readingCount: c.readings.length,
          triggeredCount: c.readings.filter((r) => r.triggered).length,
          platformVersion: c.run.platformVersion,
          provenance: c.run.provenance,
        }),
      ),
      ...record.failures.map(
        (f): TimelineFailure => ({
          kind: 'failed',
          attemptedAt: f.attemptedAt,
          interval: f.interval,
          reason: f.reason,
          platformVersion: f.run.platformVersion,
          provenance: f.run.provenance,
        }),
      ),
    ].sort((a, b) => timeOf(b).getTime() - timeOf(a).getTime());

    const signal =
      req.signalId === undefined
        ? null
        : {
            signalId: req.signalId,
            points: record.captures
              .flatMap((c) => {
                const reading = c.readings.find((r) => r.signalId === req.signalId);
                return reading === undefined
                  ? []
                  : [
                      {
                        capturedAt: c.capturedAt,
                        interval: c.interval,
                        currentPrice: c.currentPrice,
                        reading,
                      },
                    ];
              })
              .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime()),
          };

    return { kind: 'history', coinTicker, entries, signal };
  }
}

function timeOf(entry: TimelineEntry): Date {
  return entry.kind === 'recorded' ? entry.capturedAt : entry.attemptedAt;
}
