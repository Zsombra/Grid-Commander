import { deriveSeriesCoverage } from './coverage.js';

/**
 * Forward returns, derived from the record at read time.
 *
 * The question this answers is the recorder's whole purpose (#94): when a
 * signal triggered, what did price do by the next capture? A pair of
 * consecutive recorded captures yields one forward return, attributed to the
 * states at the EARLIER capture — the signal fired, then price moved; the
 * later capture's states saw nothing yet.
 *
 * Two disciplines are load-bearing and spec-pinned:
 *
 * - **A pair that spans a coverage gap is not a forward return.** "By the
 *   next capture" means one cadence step; across a hole it means "by
 *   whenever the recorder came back", which is a different and unlabelled
 *   question. What counts as a gap is decided in exactly one place —
 *   `deriveSeriesCoverage` — and reused here, never restated.
 *
 * - **Every figure carries its sample size, and nothing sorts by return.**
 *   At any depth, and especially at days rather than weeks, sorting by the
 *   interesting column is how a two-sample fluke tops the table — the same
 *   failure the trading record guards against on win rates. Stats sort by
 *   `n` descending, key ascending, and the renderer keeps that order.
 */

/** The slice of a capture this derivation reads. Structural on purpose. */
export interface PairableCapture {
  readonly capturedAt: Date;
  readonly currentPrice: number;
  readonly dominantBias: string;
  readonly hasConflictingSignals: boolean;
  readonly readings: readonly { readonly signalId: string; readonly triggered: boolean }[];
}

/** One valid pair's facts, attributed to the earlier capture. */
export interface ForwardPair {
  readonly forwardPct: number;
  readonly triggeredSignalIds: readonly string[];
  readonly dominantBias: string;
  readonly hasConflictingSignals: boolean;
}

export interface SeriesForward {
  readonly pairs: readonly ForwardPair[];
  /** Consecutive captures not paired because their spacing is a gap. */
  readonly excludedOverGaps: number;
  /** Pairs refused because a price was not a positive finite number. */
  readonly excludedUnpriceable: number;
}

/**
 * Pair one series' recorded captures.
 *
 * Coverage is derived with `now` pinned to the last capture, deliberately:
 * the trailing open interval (last capture → wall clock) exists so a dead
 * recorder shows up on the coverage surface, but there is no pair beyond the
 * last capture, so it can play no part here — and letting the wall clock in
 * would make the same series pair differently at different times of day.
 */
export function deriveSeriesForward(captures: readonly PairableCapture[]): SeriesForward {
  const ordered = [...captures].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  if (ordered.length < 2) return { pairs: [], excludedOverGaps: 0, excludedUnpriceable: 0 };

  const last = ordered[ordered.length - 1] as PairableCapture;
  const coverage = deriveSeriesCoverage({
    coinTicker: '',
    interval: '',
    capturedAt: ordered.map((c) => c.capturedAt),
    failedAttemptCount: 0,
    now: last.capturedAt,
  });
  const gapStarts = new Set(
    coverage.gaps
      .filter((g) => g.toCapturedAt !== null)
      .map((g) => g.fromCapturedAt.getTime()),
  );

  const pairs: ForwardPair[] = [];
  let excludedOverGaps = 0;
  let excludedUnpriceable = 0;

  for (let i = 1; i < ordered.length; i++) {
    const prior = ordered[i - 1] as PairableCapture;
    const next = ordered[i] as PairableCapture;
    if (gapStarts.has(prior.capturedAt.getTime())) {
      excludedOverGaps++;
      continue;
    }
    // A recorded capture carries a price by the append contract, but a
    // division is a claim about arithmetic, not about contracts.
    if (!priceable(prior.currentPrice) || !priceable(next.currentPrice)) {
      excludedUnpriceable++;
      continue;
    }
    pairs.push({
      forwardPct: ((next.currentPrice - prior.currentPrice) / prior.currentPrice) * 100,
      triggeredSignalIds: prior.readings.filter((r) => r.triggered).map((r) => r.signalId),
      dominantBias: prior.dominantBias,
      hasConflictingSignals: prior.hasConflictingSignals,
    });
  }

  return { pairs, excludedOverGaps, excludedUnpriceable };
}

const priceable = (v: number): boolean => Number.isFinite(v) && v > 0;

/** One grouped figure. `key` is the signal id, bias value, or conflict arm. */
export interface ForwardStat {
  readonly key: string;
  readonly n: number;
  readonly meanPct: number;
  readonly medianPct: number;
  /** Share of pairs whose forward return was strictly positive. */
  readonly sharePositive: number;
}

export interface ForwardAggregate {
  /** Every valid pair, unconditioned — the anchor the groups compare against. */
  readonly baseline: ForwardStat;
  readonly perSignal: readonly ForwardStat[];
  readonly perBias: readonly ForwardStat[];
  readonly perConflict: readonly ForwardStat[];
}

/** Aggregate pairs from every series. Null when there is nothing to pair. */
export function aggregateForward(pairs: readonly ForwardPair[]): ForwardAggregate | null {
  if (pairs.length === 0) return null;

  const bySignal = new Map<string, number[]>();
  const byBias = new Map<string, number[]>();
  const byConflict = new Map<string, number[]>();
  for (const pair of pairs) {
    for (const signalId of pair.triggeredSignalIds) {
      push(bySignal, signalId, pair.forwardPct);
    }
    push(byBias, pair.dominantBias, pair.forwardPct);
    push(byConflict, pair.hasConflictingSignals ? 'conflicting' : 'not conflicting', pair.forwardPct);
  }

  return {
    baseline: stat('all pairs', pairs.map((p) => p.forwardPct)),
    perSignal: stats(bySignal),
    perBias: stats(byBias),
    perConflict: stats(byConflict),
  };
}

function push(map: Map<string, number[]>, key: string, value: number): void {
  const bucket = map.get(key);
  if (bucket === undefined) map.set(key, [value]);
  else bucket.push(value);
}

/**
 * Sorted by sample size then key — never by the return. The order is the
 * honesty mechanism: whatever the figures say, the best-attested rows lead.
 */
function stats(groups: ReadonlyMap<string, readonly number[]>): ForwardStat[] {
  return [...groups.entries()]
    .map(([key, values]) => stat(key, values))
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
}

function stat(key: string, values: readonly number[]): ForwardStat {
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  return {
    key,
    n,
    meanPct: mean,
    medianPct: median(values),
    sharePositive: values.filter((v) => v > 0).length / n,
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}
