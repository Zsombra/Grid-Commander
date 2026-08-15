import type { RegimeComposition } from '@/domain/recording/regime.js';
import { deriveRegimeComposition } from '@/domain/recording/regime.js';
import type { FailureCause } from '@/ports/failure.js';
import type { MarketPort, RegimeSnapshotResult } from '@/ports/market.js';
import type { SignalRecordStore } from '@/ports/signal-record.js';
import { HOW_RECORDING_STARTS } from './read-record-coverage.query.js';

/**
 * The regime the record was taken in — the platform's own classification,
 * read live and bounded to each recorded series' window.
 *
 * The subjects come from the record (which coins, at which interval, over
 * which span); the answers come from BattleGrid. That join is the whole
 * point: the forward returns state their window, and this states what kind
 * of market that window was. It joins nothing per-pair — context beside the
 * figures, not a condition on them (`forward-returns-are-not-regime-
 * conditioned` holds the cut).
 *
 * Per-series isolation is the recorder's own lesson: one coin's failed
 * regime read costs that coin's context, never the nineteen behind it.
 */

export interface RegimeSeriesContext {
  readonly coinTicker: string;
  readonly interval: string;
  /** The recorded window the composition is bounded to. */
  readonly windowFrom: Date;
  readonly windowTo: Date;
  readonly captureCount: number;
  readonly history:
    | {
        readonly kind: 'composition';
        readonly composition: RegimeComposition;
        readonly droppedPoints: number;
      }
    /** The platform holds no regime points at this timeframe — an answer. */
    | { readonly kind: 'none' }
    | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };
  readonly snapshot: RegimeSnapshotResult;
}

export type ReadRegimeContextResult =
  | { readonly kind: 'context'; readonly series: readonly RegimeSeriesContext[] }
  | { readonly kind: 'never-recorded'; readonly howToStart: string }
  | { readonly kind: 'unreadable'; readonly reason: string };

export class ReadRegimeContextQuery {
  constructor(
    private readonly store: SignalRecordStore,
    private readonly market: MarketPort,
  ) {}

  async execute(req: { userId: string; accessToken: string }): Promise<ReadRegimeContextResult> {
    let recorded;
    try {
      recorded = await this.store.recordedSeries(req.userId);
    } catch (err) {
      // The record exists and did not answer — not "empty", not "never
      // recorded": both are claims about the record this read cannot back.
      return { kind: 'unreadable', reason: err instanceof Error ? err.message : String(err) };
    }

    if (recorded.series.length === 0 && recorded.coveredNothing.length === 0) {
      return { kind: 'never-recorded', howToStart: HOW_RECORDING_STARTS };
    }

    const captured = recorded.series.filter((s) => s.capturedAt.length > 0);
    const series = await Promise.all(
      captured.map((s) => this.seriesContext(req, s)),
    );

    return {
      kind: 'context',
      // Alphabetical, then by interval: the composition ranks nothing, so
      // the order should not look like it does.
      series: [...series].sort(
        (a, b) =>
          a.coinTicker.localeCompare(b.coinTicker) || a.interval.localeCompare(b.interval),
      ),
    };
  }

  private async seriesContext(
    req: { userId: string; accessToken: string },
    s: { coinTicker: string; interval: string; capturedAt: readonly Date[] },
  ): Promise<RegimeSeriesContext> {
    // Min and max read explicitly rather than trusting the store's order —
    // the same discipline the forward derivation applies to the same rows.
    let from: Date = s.capturedAt[0] as Date;
    let to: Date = s.capturedAt[0] as Date;
    for (const t of s.capturedAt) {
      if (t.getTime() < from.getTime()) from = t;
      if (t.getTime() > to.getTime()) to = t;
    }

    const ask = { userId: req.userId, accessToken: req.accessToken };
    // The port contract is unreadable-not-thrown; the catches are the belt
    // over that suspender (the recorder's DL-006), because a throw here must
    // cost this series' context, not the whole page.
    const [history, snapshot] = await Promise.all([
      this.market
        .regimeHistory({ ...ask, symbol: s.coinTicker, timeframe: s.interval })
        .catch((err: unknown) => unreadableFrom(err)),
      this.market
        .regimeSnapshot({ ...ask, symbol: s.coinTicker, timeframe: s.interval })
        .catch((err: unknown) => unreadableFrom(err)),
    ]);

    return {
      coinTicker: s.coinTicker,
      interval: s.interval,
      windowFrom: from,
      windowTo: to,
      captureCount: s.capturedAt.length,
      history:
        history.kind === 'history'
          ? {
              kind: 'composition',
              composition: deriveRegimeComposition({
                points: history.points,
                window: { from, to },
              }),
              droppedPoints: history.droppedPoints,
            }
          : history,
      snapshot,
    };
  }
}

function unreadableFrom(err: unknown): {
  readonly kind: 'unreadable';
  readonly reason: string;
  readonly cause: FailureCause;
} {
  return {
    kind: 'unreadable',
    reason: err instanceof Error ? err.message : String(err),
    cause: 'unreachable',
  };
}
