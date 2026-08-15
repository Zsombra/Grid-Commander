import { describe, expect, it } from 'vitest';
import type { PairableCapture } from '@/domain/recording/forward.js';
import { aggregateForward, deriveSeriesForward } from '@/domain/recording/forward.js';

/**
 * The forward derivation's two load-bearing disciplines, pinned: a pair that
 * spans a coverage gap is not a forward return, and attribution is to the
 * earlier capture. Plus the ordering rule the spec makes non-negotiable:
 * stats sort by sample size, never by the return.
 */

const hour = (n: number): Date => new Date(Date.UTC(2026, 7, 1, n));

function cap(
  atHour: number,
  price: number,
  triggered: readonly string[] = [],
  overrides: Partial<PairableCapture> = {},
): PairableCapture {
  return {
    capturedAt: hour(atHour),
    currentPrice: price,
    dominantBias: 'NEUTRAL',
    hasConflictingSignals: false,
    readings: [
      ...triggered.map((signalId) => ({ signalId, triggered: true })),
      { signalId: 'quiet_signal', triggered: false },
    ],
    ...overrides,
  };
}

describe('pairing', () => {
  it('attributes the return to the earlier capture only', () => {
    const { pairs } = deriveSeriesForward([
      cap(0, 100, ['rsi_oversold']),
      cap(1, 102, ['volume_surge']),
      cap(2, 101, []),
    ]);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]?.triggeredSignalIds).toEqual(['rsi_oversold']);
    expect(pairs[0]?.forwardPct).toBeCloseTo(2, 10);
    // volume_surge triggered at hour 1 gets the 1→2 move, not the 0→1 move.
    expect(pairs[1]?.triggeredSignalIds).toEqual(['volume_surge']);
    expect(pairs[1]?.forwardPct).toBeCloseTo(((101 - 102) / 102) * 100, 10);
  });

  it('does not pair across a coverage gap, and counts the exclusion', () => {
    // Hourly cadence, then a four-hour hole: median spacing 1h, bound 2h.
    const derived = deriveSeriesForward([
      cap(0, 100),
      cap(1, 101),
      cap(2, 102),
      cap(6, 103),
      cap(7, 104),
    ]);
    expect(derived.excludedOverGaps).toBe(1);
    expect(derived.pairs).toHaveLength(3);
    // No pair carries the 2→6 move.
    for (const pair of derived.pairs) {
      expect(Math.abs(pair.forwardPct)).toBeLessThan(1.5);
    }
  });

  it('pairs nothing from a single capture', () => {
    const derived = deriveSeriesForward([cap(0, 100, ['rsi_oversold'])]);
    expect(derived.pairs).toHaveLength(0);
    expect(derived.excludedOverGaps).toBe(0);
  });

  it('refuses an unusable price rather than dividing by it', () => {
    const derived = deriveSeriesForward([cap(0, 0), cap(1, 101), cap(2, 102)]);
    expect(derived.excludedUnpriceable).toBe(1);
    expect(derived.pairs).toHaveLength(1);
  });

  it('sorts unordered input by time before pairing', () => {
    const { pairs } = deriveSeriesForward([cap(2, 102), cap(0, 100), cap(1, 101)]);
    expect(pairs.map((p) => p.forwardPct.toFixed(4))).toEqual([
      (1).toFixed(4),
      (((102 - 101) / 101) * 100).toFixed(4),
    ]);
  });
});

describe('aggregation', () => {
  it('returns null with nothing to pair', () => {
    expect(aggregateForward([])).toBeNull();
  });

  it('computes the baseline the tables are read against', () => {
    const derived = deriveSeriesForward([cap(0, 100), cap(1, 110), cap(2, 99)]);
    const a = aggregateForward(derived.pairs);
    expect(a?.baseline.n).toBe(2);
    expect(a?.baseline.meanPct).toBeCloseTo((10 + -10) / 2, 10);
    expect(a?.baseline.sharePositive).toBe(0.5);
  });

  it('orders by sample size then key — never by the return', () => {
    // 'small_winner' has the spectacular return and the smallest sample;
    // it must not lead the table.
    const derived = deriveSeriesForward([
      cap(0, 100, ['steady_a', 'steady_b']),
      cap(1, 101, ['steady_a', 'steady_b']),
      cap(2, 102, ['steady_a', 'small_winner']),
      cap(3, 150, ['steady_a']),
      cap(4, 151, []),
    ]);
    const a = aggregateForward(derived.pairs);
    expect(a?.perSignal.map((s) => s.key)).toEqual(['steady_a', 'steady_b', 'small_winner']);
    const winner = a?.perSignal.find((s) => s.key === 'small_winner');
    expect(winner?.n).toBe(1);
    expect(winner?.meanPct).toBeGreaterThan(40);
  });

  it('groups bias and conflict at the capture level', () => {
    const derived = deriveSeriesForward([
      cap(0, 100, [], { dominantBias: 'UP', hasConflictingSignals: true }),
      cap(1, 101, [], { dominantBias: 'DOWN', hasConflictingSignals: false }),
      cap(2, 102, [], { dominantBias: 'DOWN' }),
    ]);
    const a = aggregateForward(derived.pairs);
    expect(a?.perBias.map((s) => `${s.key}:${String(s.n)}`)).toEqual(['DOWN:1', 'UP:1']);
    expect(a?.perConflict.map((s) => `${s.key}:${String(s.n)}`)).toEqual([
      'conflicting:1',
      'not conflicting:1',
    ]);
  });
});
