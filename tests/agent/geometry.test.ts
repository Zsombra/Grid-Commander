import { describe, expect, it } from 'vitest';
import {
  exitGeometry,
  median,
  MEDIAN_NEEDS,
  moveOf,
  shareOf,
} from '@/application/use-cases/read-trading-record.query.js';
import { aTradeOutcome } from '../support/agent-fakes.js';

/**
 * How far price actually moved, derived from the trades themselves.
 *
 * The point of the whole fold: a stop distance means nothing until it is set
 * against the size of the moves the agent actually sees. These tests hold the
 * two things most likely to be got wrong later — that a close reason is not an
 * outcome, and that an unmeasurable trade is excluded rather than counted as
 * zero.
 */

describe('moveOf — the realised move on one closed trade', () => {
  it('signs a long by where the exit landed', () => {
    const move = moveOf(
      aTradeOutcome({ direction: 'LONG', entryFillPrice: 100, exitFillPrice: 99 }),
    );
    expect(move).toBeCloseTo(-1, 10);
  });

  it('signs a short the other way, because a fall is favourable', () => {
    const move = moveOf(
      aTradeOutcome({ direction: 'SHORT', entryFillPrice: 100, exitFillPrice: 99 }),
    );
    expect(move).toBeCloseTo(1, 10);
  });

  it('refuses a side it cannot read rather than guessing the sign', () => {
    // The mapper writes 'UNKNOWN' where the platform sent no side. A guess here
    // would invert the sign of a number the operator is about to trust.
    for (const direction of ['UNKNOWN', 'NEUTRAL', 'NONE', '']) {
      expect(
        moveOf(aTradeOutcome({ direction, entryFillPrice: 100, exitFillPrice: 99 })),
        direction,
      ).toBeNull();
    }
  });

  it('is null, never zero, when a fill price is missing', () => {
    // A trade that closed flat and a trade nobody priced are different facts.
    expect(moveOf(aTradeOutcome({ entryFillPrice: null }))).toBeNull();
    expect(moveOf(aTradeOutcome({ exitFillPrice: null }))).toBeNull();
  });

  it('is null on a non-positive entry, which is not a price', () => {
    expect(moveOf(aTradeOutcome({ entryFillPrice: 0 }))).toBeNull();
    expect(moveOf(aTradeOutcome({ entryFillPrice: -5 }))).toBeNull();
  });

  it('reports a genuinely flat trade as zero', () => {
    expect(
      moveOf(aTradeOutcome({ direction: 'LONG', entryFillPrice: 100, exitFillPrice: 100 })),
    ).toBe(0);
  });
});

describe('median', () => {
  it('is the middle of an odd count', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('is the mean of the two middle values of an even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('is null on nothing', () => {
    expect(median([])).toBeNull();
  });

  it('does not mutate what it was given', () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('exitGeometry — folding an agent’s closed trades', () => {
  const stopped = (id: string, exit: number) =>
    aTradeOutcome({
      id,
      closeReason: 'STOP_LOSS',
      direction: 'LONG',
      entryFillPrice: 100,
      exitFillPrice: exit,
      netPnl: exit < 100 ? -1 : 1,
    });

  it('groups by the platform’s own close reason', () => {
    const g = exitGeometry([
      stopped('a', 99),
      stopped('b', 99),
      aTradeOutcome({ id: 'c', closeReason: 'TAKE_PROFIT' }),
    ]);
    expect(g.endings.map((e) => e.reason)).toEqual(['STOP_LOSS', 'TAKE_PROFIT']);
    expect(g.endings[0]?.count).toBe(2);
  });

  it('orders endings by how often they happened — the one that repeats is the finding', () => {
    const g = exitGeometry([
      aTradeOutcome({ id: 'a', closeReason: 'TAKE_PROFIT' }),
      stopped('b', 99),
      stopped('c', 99),
      stopped('d', 99),
    ]);
    expect(g.endings[0]?.reason).toBe('STOP_LOSS');
  });

  it('folds a trade the platform did not explain as unstated rather than dropping it', () => {
    const g = exitGeometry([aTradeOutcome({ closeReason: null })]);
    expect(g.endings[0]?.reason).toBe('unstated');
    expect(g.measured).toBe(1);
  });

  it('states a median once the group is large enough', () => {
    const g = exitGeometry([stopped('a', 99), stopped('b', 99.5), stopped('c', 98)]);
    // −1, −0.5, −2 → median −1
    expect(g.endings[0]?.medianMovePct).toBeCloseTo(-1, 10);
  });

  it('withholds a median below the threshold rather than implying a statistic', () => {
    const g = exitGeometry([stopped('a', 99), stopped('b', 98)]);
    expect(MEDIAN_NEEDS).toBe(3);
    expect(g.endings[0]?.medianMovePct).toBeNull();
    expect(g.endings[0]?.count).toBe(2);
  });

  it('excludes an unmeasurable trade from the median and says how many', () => {
    const g = exitGeometry([
      stopped('a', 99),
      stopped('b', 99),
      stopped('c', 99),
      aTradeOutcome({ id: 'd', closeReason: 'STOP_LOSS', entryFillPrice: null }),
    ]);
    expect(g.endings[0]?.count).toBe(4);
    expect(g.endings[0]?.unmeasurable).toBe(1);
    expect(g.endings[0]?.medianMovePct).toBeCloseTo(-1, 10);
    expect(g.unmeasurable).toBe(1);
  });

  /**
   * The expensive lesson, held as a property.
   *
   * `HYPE` closed at +$0.0731 with `closeReason: STOP_LOSS` because position
   * management had trailed the stop into profit. Counting a stop-out as a loss
   * reports a protected winner as a failure, on the screen built to explain
   * losses.
   */
  it('does not read a stop-out as a loss — the ending and the result are separate facts', () => {
    const g = exitGeometry([
      aTradeOutcome({ id: 'hype', closeReason: 'STOP_LOSS', netPnl: 0.0731 }),
      aTradeOutcome({ id: 'other', closeReason: 'STOP_LOSS', netPnl: -0.5 }),
    ]);
    const stop = g.endings[0];
    expect(stop?.reason).toBe('STOP_LOSS');
    expect(stop?.count).toBe(2);
    expect(stop?.wins).toBe(1);
    expect(stop?.losses).toBe(1);
  });

  it('counts an unstated net as neither a win nor a loss', () => {
    const g = exitGeometry([aTradeOutcome({ netPnl: null })]);
    expect(g.endings[0]?.wins).toBe(0);
    expect(g.endings[0]?.losses).toBe(0);
  });

  it('states the window it folded, so a page is not read as a whole history', () => {
    const g = exitGeometry([
      aTradeOutcome({ id: 'a', closedAt: '2026-08-02T00:00:00.000Z' }),
      aTradeOutcome({ id: 'b', closedAt: '2026-08-09T00:00:00.000Z' }),
      aTradeOutcome({ id: 'c', closedAt: '2026-08-05T00:00:00.000Z' }),
    ]);
    expect(g.from?.toISOString()).toBe('2026-08-02T00:00:00.000Z');
    expect(g.to?.toISOString()).toBe('2026-08-09T00:00:00.000Z');
    expect(g.measured).toBe(3);
  });

  it('carries no window where the platform stated no close times', () => {
    const g = exitGeometry([aTradeOutcome({ closedAt: null })]);
    expect(g.from).toBeNull();
    expect(g.to).toBeNull();
  });

  it('ignores a close time the platform sent unparseably', () => {
    const g = exitGeometry([aTradeOutcome({ closedAt: 'not a date' })]);
    expect(g.from).toBeNull();
  });

  it('reports a median position life once there are enough durations', () => {
    const g = exitGeometry([
      aTradeOutcome({ id: 'a', durationSeconds: 60 }),
      aTradeOutcome({ id: 'b', durationSeconds: 120 }),
      aTradeOutcome({ id: 'c', durationSeconds: 600 }),
    ]);
    expect(g.medianDurationSeconds).toBe(120);
  });

  it('withholds a median life below the threshold', () => {
    const g = exitGeometry([aTradeOutcome({ durationSeconds: 60 })]);
    expect(g.medianDurationSeconds).toBeNull();
  });

  it('folds nothing into nothing', () => {
    const g = exitGeometry([]);
    expect(g.endings).toEqual([]);
    expect(g.measured).toBe(0);
    expect(g.medianDurationSeconds).toBeNull();
  });
});

describe('shareOf', () => {
  it('is the share of what was folded, not of some other base', () => {
    const g = exitGeometry([
      aTradeOutcome({ id: 'a', closeReason: 'STOP_LOSS' }),
      aTradeOutcome({ id: 'b', closeReason: 'STOP_LOSS' }),
      aTradeOutcome({ id: 'c', closeReason: 'STOP_LOSS' }),
      aTradeOutcome({ id: 'd', closeReason: 'TAKE_PROFIT' }),
    ]);
    const stop = g.endings.find((e) => e.reason === 'STOP_LOSS');
    expect(shareOf(stop!, g)).toBe(75);
  });

  it('is null against an empty fold rather than dividing by zero', () => {
    const g = exitGeometry([]);
    expect(shareOf({ reason: 'x', count: 0, medianMovePct: null, unmeasurable: 0, wins: 0, losses: 0 }, g)).toBeNull();
  });
});
