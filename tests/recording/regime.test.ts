import { describe, expect, it } from 'vitest';
import type { RegimePoint } from '@/domain/recording/regime.js';
import { deriveRegimeComposition } from '@/domain/recording/regime.js';

/**
 * The composition's honesty rules, at the derivation: bounded to the window
 * it is asked about, labels verbatim, and coverage claimed only from the
 * points themselves.
 */

const hour = (n: number): Date => new Date(Date.UTC(2026, 7, 1, n));
const pt = (h: number, regime: string): RegimePoint => ({
  at: hour(h),
  regime,
  conviction: 'medium',
});

describe('the composition is bounded to the window', () => {
  it('counts only bars inside the window, inclusive at both ends', () => {
    const c = deriveRegimeComposition({
      points: [
        pt(0, 'bull_ranging'), // before
        pt(1, 'bear_ranging'), // at the first capture — context for it
        pt(2, 'bear_ranging'),
        pt(3, 'bear_expansion'), // at the last capture — still context
        pt(4, 'bull_ranging'), // after
      ],
      window: { from: hour(1), to: hour(3) },
    });
    expect(c.barsInWindow).toBe(3);
    expect(c.labels).toEqual([
      { regime: 'bear_ranging', barCount: 2 },
      { regime: 'bear_expansion', barCount: 1 },
    ]);
    expect(c.coveredFrom).toEqual(hour(1));
    expect(c.coveredTo).toEqual(hour(3));
  });

  it('orders labels by bar count, ties by first appearance', () => {
    const c = deriveRegimeComposition({
      points: [pt(1, 'bear_ranging'), pt(2, 'bull_ranging'), pt(3, 'bull_ranging'), pt(4, 'bear_ranging')],
      window: { from: hour(0), to: hour(9) },
    });
    // Both hold 2 bars; bear_ranging appeared first and stays first.
    expect(c.labels.map((l) => l.regime)).toEqual(['bear_ranging', 'bull_ranging']);
  });

  it('carries an unseen label verbatim', () => {
    // A label this product has never modelled — v19 coining vocabulary must
    // render the day it appears, not break a mapping.
    const c = deriveRegimeComposition({
      points: [pt(1, 'sideways_chop_v19')],
      window: { from: hour(0), to: hour(2) },
    });
    expect(c.labels).toEqual([{ regime: 'sideways_chop_v19', barCount: 1 }]);
  });
});

describe('coverage is claimed only from the points', () => {
  it('reaches the window start when the oldest point is at or before it', () => {
    const c = deriveRegimeComposition({
      points: [pt(0, 'bear_ranging'), pt(1, 'bear_ranging')],
      window: { from: hour(0), to: hour(1) },
    });
    expect(c.reachesWindowStart).toBe(true);
  });

  it('says so when the look-back begins after the record started', () => {
    const c = deriveRegimeComposition({
      points: [pt(5, 'bear_ranging'), pt(6, 'bear_ranging')],
      window: { from: hour(0), to: hour(6) },
    });
    expect(c.reachesWindowStart).toBe(false);
    // The span the composition actually covers — what the surface must state.
    expect(c.coveredFrom).toEqual(hour(5));
    expect(c.coveredTo).toEqual(hour(6));
    expect(c.barsInWindow).toBe(2);
  });

  it('claims nothing from zero points', () => {
    const c = deriveRegimeComposition({
      points: [],
      window: { from: hour(0), to: hour(2) },
    });
    expect(c.barsInWindow).toBe(0);
    expect(c.labels).toEqual([]);
    expect(c.coveredFrom).toBeNull();
    expect(c.coveredTo).toBeNull();
    expect(c.reachesWindowStart).toBe(false);
  });

  it('history entirely outside the window is depth without coverage', () => {
    // The platform reaches back far enough, but every bar predates the
    // window: nothing to count, and the reaches flag is honestly true.
    const c = deriveRegimeComposition({
      points: [pt(0, 'bull_ranging')],
      window: { from: hour(5), to: hour(6) },
    });
    expect(c.barsInWindow).toBe(0);
    expect(c.reachesWindowStart).toBe(true);
  });
});
