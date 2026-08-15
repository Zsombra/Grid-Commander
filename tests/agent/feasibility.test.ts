import { describe, expect, it } from 'vitest';
import {
  candidateCeilings,
  constructibleUnder,
  curveIsFaithful,
  opportunity,
  saysNothing,
  type AdvisoryCoin,
  type FeasibilityAdvisory,
} from '@/domain/agent/feasibility.js';
import { mapFeasibilityAdvisory } from '@/infrastructure/battlegrid/agent-mapper.js';

/**
 * The advisory `update_intelligence_agent` returns, and what an operator reads
 * off it.
 *
 * The shapes below are the **declared** v19.1.0 output schema
 * (`docs/battlegrid-mcp-capabilities.json`), not an observed response — the
 * tool is classified destructive, so the surface record carries
 * `"observed": null` and nothing in this repository has ever seen one on the
 * wire. That is stated rather than hidden: these tests prove the product reads
 * what the platform *says* it sends, which is the strongest claim available
 * until a keyed live write runs (#306).
 */

function priced(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    coinTicker: 'SOL',
    status: 'FEASIBLE',
    atrPct: 1.4,
    reachableMinPct: 0.76,
    reachableMaxPct: 2.27,
    requestedMinAtrMultiple: 0.55,
    requestedMinPct: 0.76,
    requestedMaxPct: 2.27,
    responsibleBound: null,
    shortfallPct: null,
    ...over,
  };
}

function payload(coins: unknown[], over: Partial<Record<string, unknown>> = {}): unknown {
  return {
    minStopLossAtrMultiple: 0.55,
    maxStopLossPct: 2.27,
    minRiskRewardRatio: 1.5,
    counts: {
      total: coins.length,
      evaluated: coins.length,
      buildable: coins.length,
      volatilityUnavailable: 0,
    },
    coins,
    ...over,
  };
}

describe('the advisory is read off the declared shape', () => {
  it('reads the whole declared payload', () => {
    const mapped = mapFeasibilityAdvisory(payload([priced()]));
    expect(mapped).not.toBeNull();
    expect(mapped?.dials).toEqual({
      minStopLossAtrMultiple: 0.55,
      maxStopLossPct: 2.27,
      minRiskRewardRatio: 1.5,
    });
    expect(mapped?.counts.buildable).toBe(1);
    expect(mapped?.coins[0]).toMatchObject({ kind: 'priced', ticker: 'SOL', status: 'feasible' });
  });

  it('translates the platform’s bound names to the dial an operator can point at', () => {
    const floor = mapFeasibilityAdvisory(
      payload([priced({ status: 'STRUCTURAL_ONLY', responsibleBound: 'MIN_STOP_LOSS_PCT' })]),
    );
    const ceiling = mapFeasibilityAdvisory(
      payload([priced({ status: 'STRUCTURAL_ONLY', responsibleBound: 'MAX_STOP_LOSS_PCT' })]),
    );
    expect(floor?.coins[0]).toMatchObject({ blockedBy: 'floor' });
    expect(ceiling?.coins[0]).toMatchObject({ blockedBy: 'ceiling' });
  });

  it('reads the unpriced arm as carrying no numbers', () => {
    const mapped = mapFeasibilityAdvisory(
      payload([{ coinTicker: 'PEPE', status: 'ATR_UNAVAILABLE' }], {
        counts: { total: 1, evaluated: 0, buildable: 0, volatilityUnavailable: 1 },
      }),
    );
    expect(mapped?.coins[0]).toEqual({ kind: 'unpriced', ticker: 'PEPE' });
  });

  it('keeps a null shortfall as null rather than reporting no shortfall', () => {
    // `?? 0` here would state that a coin fell short by nothing, which is the
    // opposite of the platform declining to quantify it.
    const mapped = mapFeasibilityAdvisory(
      payload([priced({ status: 'STRUCTURAL_ONLY', shortfallPct: null })]),
    );
    expect((mapped?.coins[0] as { shortfallPct: number | null }).shortfallPct).toBeNull();
  });

  it('keeps an unnamed responsible bound as null rather than guessing a dial', () => {
    const mapped = mapFeasibilityAdvisory(
      payload([priced({ status: 'STRUCTURAL_ONLY', responsibleBound: 'SOMETHING_NEW' })]),
    );
    expect((mapped?.coins[0] as { blockedBy: string | null }).blockedBy).toBeNull();
  });
});

describe('absent is not zero', () => {
  // The core of D-1. Every one of these must be indistinguishable from "the
  // platform did not answer", and none of them may become "no coin can build".
  it.each([
    ['absent', undefined],
    ['null', null],
    ['a string', 'FEASIBLE'],
    ['an empty object', {}],
  ])('maps %s to null', (_name, raw) => {
    expect(mapFeasibilityAdvisory(raw)).toBeNull();
  });

  it.each(['counts', 'coins', 'maxStopLossPct'])('refuses a payload missing %s', (field) => {
    const rest = { ...(payload([priced()]) as Record<string, unknown>) };
    delete rest[field];
    expect(mapFeasibilityAdvisory(rest)).toBeNull();
  });

  it('refuses the whole advisory when one coin matches neither arm', () => {
    /**
     * The alternative — skipping the bad member — reports a fleet of two as a
     * fleet of one, and a false denominator is the single thing this panel must
     * never render. Unreadable beats short.
     */
    const mapped = mapFeasibilityAdvisory(
      payload([priced(), { coinTicker: 'BTC', status: 'SOMETHING_NEW' }]),
    );
    expect(mapped).toBeNull();
  });

  it('reads an advisory over zero coins as a real answer, not as absence', () => {
    const mapped = mapFeasibilityAdvisory(
      payload([], { counts: { total: 0, evaluated: 0, buildable: 0, volatilityUnavailable: 0 } }),
    );
    expect(mapped).not.toBeNull();
    expect(saysNothing(mapped as FeasibilityAdvisory)).toBe(true);
  });
});

function advisory(coins: readonly AdvisoryCoin[], maxStopLossPct = 2.5): FeasibilityAdvisory {
  const unpriced = coins.filter((c) => c.kind === 'unpriced').length;
  return {
    dials: { minStopLossAtrMultiple: 0.55, maxStopLossPct, minRiskRewardRatio: 1.5 },
    counts: {
      total: coins.length,
      evaluated: coins.length - unpriced,
      buildable: coins.filter((c) => c.kind === 'priced' && c.status === 'feasible').length,
      volatilityUnavailable: unpriced,
    },
    coins,
  };
}

function coin(ticker: string, status: 'feasible' | 'structural-only', min: number): AdvisoryCoin {
  return {
    kind: 'priced',
    ticker,
    status,
    atrPct: 1,
    reachableMinPct: min,
    reachableMaxPct: 2.5,
    requestedMinAtrMultiple: 0.55,
    requestedMinPct: min,
    requestedMaxPct: 2.5,
    blockedBy: status === 'structural-only' ? 'ceiling' : null,
    shortfallPct: status === 'structural-only' ? 0.2 : null,
  };
}

describe('band language becomes opportunity language', () => {
  it('never counts an unpriced coin among those that cannot build', () => {
    /**
     * D-3, and the sharpest failure this module can have. A coin the platform
     * could not price is a gap in the reading; reporting it as blocked would
     * tell an operator their dials are costing them a coin that no dial
     * touched.
     */
    const read = opportunity(
      advisory([coin('SOL', 'feasible', 0.8), { kind: 'unpriced', ticker: 'PEPE' }]),
    );
    expect(read.blocked).toEqual([]);
    expect(read.unpriced).toEqual(['PEPE']);
  });

  it('takes its headline from the platform’s counts, not from the coins it can see', () => {
    // The counts are BattleGrid's claim. Recomputing them from `coins[]` would
    // silently substitute this product's arithmetic for the platform's answer.
    const base = advisory([coin('SOL', 'feasible', 0.8)]);
    const disagreeing: FeasibilityAdvisory = {
      ...base,
      counts: { ...base.counts, buildable: 9, total: 12 },
    };
    const read = opportunity(disagreeing);
    expect(read.buildable).toBe(9);
    expect(read.armed).toBe(12);
  });

  it('says when the platform’s unpriced count disagrees with the coins it listed', () => {
    const base = advisory([{ kind: 'unpriced', ticker: 'PEPE' }]);
    const skewed: FeasibilityAdvisory = {
      ...base,
      counts: { ...base.counts, volatilityUnavailable: 3 },
    };
    expect(opportunity(skewed).countsAgree).toBe(false);
    expect(opportunity(base).countsAgree).toBe(true);
  });

  it('says when the platform’s buildable count disagrees with the coins it listed', () => {
    /**
     * The disagreement that would otherwise print two individually-correct
     * figures that cannot both be true: "9 of 12 can construct" above "2 coins
     * cannot", where 9 + 2 is not 12. The headline is the platform's count and
     * the blocked sentence is counted off `coins[]`, so nothing but this check
     * connects them.
     */
    const base = advisory([coin('SOL', 'feasible', 0.8), coin('BTC', 'structural-only', 0.9)]);
    const skewed: FeasibilityAdvisory = {
      ...base,
      counts: { total: 12, evaluated: 12, buildable: 9, volatilityUnavailable: 0 },
    };
    expect(opportunity(skewed).countsAgree).toBe(false);
    expect(opportunity(base).countsAgree).toBe(true);
  });

  it('names the dial responsible for each blocked coin', () => {
    const read = opportunity(advisory([coin('BTC', 'structural-only', 0.9)]));
    expect(read.blocked).toEqual([
      {
        ticker: 'BTC',
        blockedBy: 'ceiling',
        shortfallPct: 0.2,
        reachableMinPct: 0.9,
        reachableMaxPct: 2.5,
      },
    ]);
  });
});

describe('the ceiling curve', () => {
  const fleet = advisory([
    coin('SOL', 'feasible', 0.8),
    coin('BTC', 'feasible', 1.2),
    coin('ETH', 'feasible', 2.0),
    coin('DOGE', 'structural-only', 0.5),
    { kind: 'unpriced', ticker: 'PEPE' },
  ]);

  it('counts the coins that still construct under a candidate ceiling', () => {
    expect(constructibleUnder(fleet, 2.5)).toBe(3);
    expect(constructibleUnder(fleet, 1.2)).toBe(2);
    expect(constructibleUnder(fleet, 0.8)).toBe(1);
    expect(constructibleUnder(fleet, 0.1)).toBe(0);
  });

  it('never counts a coin that cannot construct now', () => {
    // DOGE's reachable minimum (0.5) is under every ceiling tested, and it is
    // still not constructible — lowering a ceiling cannot unblock anything.
    expect(constructibleUnder(fleet, 0.5)).toBe(0);
  });

  it('never counts an unpriced coin at any ceiling', () => {
    const onlyUnpriced = advisory([{ kind: 'unpriced', ticker: 'PEPE' }]);
    expect(constructibleUnder(onlyUnpriced, 99)).toBe(0);
  });

  it('rises with the ceiling and never falls', () => {
    // Monotonicity is the property that makes the sentence safe to read. If it
    // ever inverted, "lowering the ceiling costs you coins" would be a lie the
    // panel states in plain English.
    let previous = 0;
    for (const c of [0, 0.5, 0.8, 1.0, 1.2, 2.0, 2.5, 5]) {
      const now = constructibleUnder(fleet, c);
      expect(now).toBeGreaterThanOrEqual(previous);
      previous = now;
    }
  });

  it('offers only ceilings below the current dial, highest first', () => {
    const ceilings = candidateCeilings(fleet);
    expect(ceilings).toEqual([2.0, 1.2, 0.8]);
    expect(ceilings.every((c) => c < fleet.dials.maxStopLossPct)).toBe(true);
  });

  it('is drawn only where the derivation reproduces the platform’s own answer', () => {
    /**
     * The gate. `curveIsFaithful` asks whether counting `coins[]` at the
     * platform's *current* ceiling gives the platform's own `buildable`. Where
     * it does not, one of the two describes something this product does not
     * understand, and extrapolating below it would print a curve starting
     * somewhere the headline says it does not.
     */
    expect(curveIsFaithful(fleet)).toBe(true);

    const skewed: FeasibilityAdvisory = {
      ...fleet,
      counts: { ...fleet.counts, buildable: 9 },
    };
    expect(curveIsFaithful(skewed)).toBe(false);
  });

  it('is not drawn over coins that were dropped to fit the carry', () => {
    // Counts intact, coins gone: the derivation reproduces nothing, so it
    // extrapolates nothing.
    const truncated: FeasibilityAdvisory = { ...fleet, coins: [] };
    expect(curveIsFaithful(truncated)).toBe(false);
  });

  it('offers nothing where no candidate would change the answer', () => {
    // Every band starts above the ceiling: there is no lower ceiling worth
    // naming, and inventing one would draw a curve with no data under it.
    expect(candidateCeilings(advisory([coin('SOL', 'feasible', 3.0)], 2.5))).toEqual([]);
  });
});
