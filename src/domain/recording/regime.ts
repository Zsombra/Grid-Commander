/**
 * The platform's regime classification, bounded to the record's own window.
 *
 * Everything here is counting, deliberately: the regime labels are the
 * platform's vocabulary and are carried verbatim — `bull_ranging` today,
 * whatever v19 says tomorrow — because an enum written into source is a list
 * that goes stale without anything failing. The one judgement this module
 * makes is what falls inside the window; it never invents a label, a share
 * without its count, or coverage the points do not back.
 */

/** One platform bar's regime classification, labels as the platform stated them. */
export interface RegimePoint {
  readonly at: Date;
  readonly regime: string;
  readonly conviction: string | null;
}

/** The platform's current classified state for one coin at one timeframe. */
export interface RegimeSnapshot {
  readonly regime: string;
  readonly conviction: string | null;
  /** How many bars the current regime has held, when the platform says. */
  readonly runLengthBars: number | null;
  /**
   * The classified context, verbatim: every scalar axis the platform states
   * (`trend ranging`, `volatility normal`, …), names and values both the
   * platform's words. A list rather than named fields so an axis the
   * platform adds tomorrow renders the day it appears — and so no platform
   * vocabulary is written into source, the rule `structure.test.ts` holds.
   */
  readonly axes: readonly { readonly axis: string; readonly value: string }[];
}

/** How many platform bars each regime label held inside the record's window. */
export interface RegimeComposition {
  /** Count descending, ties by first appearance — never a share without its count. */
  readonly labels: readonly { readonly regime: string; readonly barCount: number }[];
  readonly barsInWindow: number;
  /** Span of the counted bars; null when nothing fell inside the window. */
  readonly coveredFrom: Date | null;
  readonly coveredTo: Date | null;
  /**
   * Whether the platform's answer reaches back to the window's start.
   * Derived from the points themselves: true when the oldest returned point
   * is at or before the window's first capture. When false, the composition
   * covers `coveredFrom → coveredTo`, not the whole window — and the surface
   * must say so, because a composition quietly narrower than the record's
   * window is the lie this derivation exists to prevent.
   */
  readonly reachesWindowStart: boolean;
}

/**
 * Count the platform's bars per regime label inside `window`, inclusive at
 * both ends — a bar stamped exactly at the first or last capture is context
 * for it, not outside it.
 *
 * With zero points at all, the look-back trivially does not reach the
 * window's start: there is nothing to claim coverage with.
 */
export function deriveRegimeComposition(params: {
  readonly points: readonly RegimePoint[];
  readonly window: { readonly from: Date; readonly to: Date };
}): RegimeComposition {
  const { points, window } = params;

  let oldest: Date | null = null;
  for (const p of points) {
    if (oldest === null || p.at.getTime() < oldest.getTime()) oldest = p.at;
  }

  const counted = points.filter(
    (p) => p.at.getTime() >= window.from.getTime() && p.at.getTime() <= window.to.getTime(),
  );

  const counts = new Map<string, number>();
  let coveredFrom: Date | null = null;
  let coveredTo: Date | null = null;
  for (const p of counted) {
    counts.set(p.regime, (counts.get(p.regime) ?? 0) + 1);
    if (coveredFrom === null || p.at.getTime() < coveredFrom.getTime()) coveredFrom = p.at;
    if (coveredTo === null || p.at.getTime() > coveredTo.getTime()) coveredTo = p.at;
  }

  // Insertion order is first-appearance order; the sort is stable, so ties
  // keep it. Count descending mirrors the record's sample-size-first rule.
  const labels = [...counts.entries()]
    .map(([regime, barCount]) => ({ regime, barCount }))
    .sort((a, b) => b.barCount - a.barCount);

  return {
    labels,
    barsInWindow: counted.length,
    coveredFrom,
    coveredTo,
    reachesWindowStart: oldest !== null && oldest.getTime() <= window.from.getTime(),
  };
}
