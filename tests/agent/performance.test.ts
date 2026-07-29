import { describe, expect, it } from 'vitest';
import { mapAgent, mapPerformance } from '@/infrastructure/battlegrid/agent-mapper.js';
import {
  asPercent,
  hasPlayed,
  hasTraded,
  isUnproven,
  settledTrades,
} from '@/domain/agent/performance.js';
import {
  EMPTY_PERFORMANCE_TOOL_RESPONSE,
  GAMES_ONLY_PERFORMANCE,
  OBSERVED_PERFORMANCE_KEYS,
  UNPROVEN_PERFORMANCE,
  VETERAN_PERFORMANCE,
} from '../support/performance-payloads.js';

/**
 * The record, from the block the roster payload already carried.
 *
 * There was nothing to test before, because the mapper dropped it and a guard
 * asserted that it did. What this file protects is the reversal: the figures
 * arrive on every roster read and the product must not throw them away again.
 */
describe('an agent record is read from the payload the product already fetches', () => {
  it('reads the games a veteran has played', () => {
    const p = mapPerformance(VETERAN_PERFORMANCE)!;
    expect(p.games.played).toBe(97);
    expect(p.games.earningsUsd).toBe(73.87);
    expect(hasPlayed(p)).toBe(true);
  });

  it('reads the trades alongside, without merging them', () => {
    const p = mapPerformance(VETERAN_PERFORMANCE)!;
    expect(p.trades.trades).toBe(18);
    expect(p.trades.wins).toBe(5);
    expect(p.trades.losses).toBe(13);
    expect(settledTrades(p.trades)).toBe(18);
    // Two records in different units. Nothing here totals a score with a dollar.
    expect(p.games.played).not.toBe(p.trades.trades);
  });

  /**
   * The lossy second copy, dropped.
   *
   * `winRate: 0.3917525773195876` and `winRatePercent: 39` are one fact twice,
   * and the rounded one cannot be recovered from. Keeping both would put two
   * versions of a number on one screen, which is how they eventually disagree.
   */
  it('keeps the fraction and discards the platform’s pre-rounded percent', () => {
    const p = mapPerformance(VETERAN_PERFORMANCE)!;
    expect(p.games.winRate).toBe(0.3917525773195876);
    expect(JSON.stringify(p)).not.toContain('winRatePercent');
    expect(JSON.stringify(p)).not.toContain('avgAccuracyPercent');
    // And the one rounding rule reproduces the platform's own answer.
    expect(asPercent(p.games.winRate)).toBe(39);
    expect(asPercent(p.games.avgAccuracy)).toBe(50);
  });

  it('carries a curve without charting or re-totalling it', () => {
    const p = mapPerformance(VETERAN_PERFORMANCE)!;
    expect(p.games.earningsCurve).toHaveLength(3);
    expect(p.games.earningsCurve[0]?.at.toISOString()).toBe('2026-06-08T13:51:04.610Z');
    // The total is the platform's, not the curve's last point.
    expect(p.games.earningsUsd).toBe(73.87);
  });

  it('keeps a null average rather than calling it zero', () => {
    const p = mapPerformance(GAMES_ONLY_PERFORMANCE)!;
    expect(hasPlayed(p)).toBe(true);
    expect(hasTraded(p)).toBe(false);
    // The platform's own null. Rendering it as $0.00 would show an agent that
    // has never traded as one that broke even.
    expect(p.trades.avgPnlUsd).toBeNull();
  });

  /**
   * The distinction the whole file exists for, and the one six of nine agents
   * were in: a full block of zeroes is a real record of nothing, not an absent
   * record. Same shape as a gauge with no ceiling reporting `remaining: 0`.
   */
  it('tells an agent that has done nothing from one whose record is missing', () => {
    const nothing = mapPerformance(UNPROVEN_PERFORMANCE)!;
    expect(nothing).not.toBeNull();
    expect(isUnproven(nothing)).toBe(true);
    expect(nothing.games.played).toBe(0);

    // Absent is null, and null is not a Performance full of zeroes.
    expect(mapPerformance(undefined)).toBeNull();
    expect(mapPerformance(null)).toBeNull();
    expect(mapPerformance('nonsense')).toBeNull();
  });

  it('survives a block with the sub-objects missing', () => {
    const p = mapPerformance({})!;
    expect(p.games.played).toBe(0);
    // A rate nobody established is null, never a rate of zero.
    expect(p.games.winRate).toBeNull();
    expect(isUnproven(p)).toBe(true);
  });

  it('reaches the domain through mapAgent, on both agent reads', () => {
    const agent = mapAgent({
      id: 'a1',
      revision: 1,
      displayName: 'Fade Master II',
      performance: VETERAN_PERFORMANCE,
    });
    expect(agent.performance?.games.played).toBe(97);
  });

  it('is null on an agent payload that carries no block', () => {
    const agent = mapAgent({ id: 'a1', revision: 1, displayName: 'x' });
    expect(agent.performance).toBeNull();
  });
});

/**
 * The fixture is the observed shape, and a later edit must not "fix" it.
 *
 * The fixture this replaced was `{ winRate: 0.5 }` — invented, and wrong: the
 * rate is nested under `gameStats`, never at the top. It sat in the suite
 * asserting the block was *dropped*, so nothing ever exercised its shape.
 */
describe('the recorded performance block is what the platform sends', () => {
  it('carries the two keys the live payload returned, and no others', () => {
    for (const block of [VETERAN_PERFORMANCE, GAMES_ONLY_PERFORMANCE, UNPROVEN_PERFORMANCE]) {
      expect(Object.keys(block).sort()).toEqual([...OBSERVED_PERFORMANCE_KEYS]);
    }
  });

  it('nests the rate under gameStats, where the platform puts it', () => {
    expect(VETERAN_PERFORMANCE.gameStats.winRate).toBeTypeOf('number');
    expect(VETERAN_PERFORMANCE).not.toHaveProperty('winRate');
  });

  /**
   * The finding, asserted so it cannot quietly stop being true: the tool named
   * for performance carries none of it. If a future account ever populates it,
   * this fails and the backlog item gets its answer.
   */
  it('records that get_agent_performance answered with nothing', () => {
    const { performance } = EMPTY_PERFORMANCE_TOOL_RESPONSE;
    expect(performance.pnlCurveUsd).toEqual([]);
    expect(performance.realizedPnlUsd).toBe(0);
    // The one non-zero was the configured cap echoed back, not a result.
    expect(performance.maxCumulativeDrawdownUsd).toBe(100);
  });
});
