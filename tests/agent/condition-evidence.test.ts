import { describe, expect, it } from 'vitest';
import { mapEvaluationScorecard } from '@/infrastructure/battlegrid/scorecard-mapper.js';

/**
 * v17.2.0's condition evidence, mapped — against the live observation of
 * 2026-08-11 (#133): Undertow, strategy Cannae r3, the block populated on
 * OPEN, SKIPPED and PASS alike.
 *
 * Everything in a clause stays a verbatim string. `operand` is the observed
 * funding rate and `literal` the bound; their units belong to the column
 * they reference, and parsing them here would trade the platform's words
 * for this product's guess at them.
 */

/** The observed payload, verbatim. */
const OBSERVED_CONDITIONS = {
  outcomes: [
    {
      conditionKey: 'FUNDING_STRETCHED',
      name: 'Funding stretched in either direction',
      outcome: 'TRUE',
      required: false,
      evidence: [
        {
          kind: 'clause',
          sectionKey: 'includeFundingRates',
          header: 'rate',
          op: 'gte',
          operand: '0.0013',
          literal: '0.0004',
          outcome: 'TRUE',
        },
        {
          kind: 'clause',
          sectionKey: 'includeFundingRates',
          header: 'rate',
          op: 'lte',
          operand: '0.0013',
          literal: '-0.0004',
          outcome: 'FALSE',
        },
      ],
      counts: null,
      provisional: true,
    },
  ],
  verdict: null,
  decidedBy: null,
  strategyRevision: 3,
  provisional: true,
  counts: { trueCount: 1, total: 1, unresolvedCount: 0 },
};

const logWith = (conditionEvaluation: unknown) => ({
  log: {
    id: 'l1',
    coinTicker: 'WIF',
    terminalStatus: 'OPEN',
    scorecard: {},
    pipeline: {},
    ...(conditionEvaluation === undefined ? {} : { conditionEvaluation }),
  },
});

describe('the condition evidence, mapped', () => {
  it('carries the observed shape whole, strings verbatim', () => {
    const e = mapEvaluationScorecard(logWith(OBSERVED_CONDITIONS), { owned: true });
    const c = e?.conditions;
    expect(c).not.toBeNull();
    expect(c?.outcomes).toHaveLength(1);
    const outcome = c?.outcomes[0];
    expect(outcome?.conditionKey).toBe('FUNDING_STRETCHED');
    expect(outcome?.outcome).toBe('TRUE');
    expect(outcome?.required).toBe(false);
    expect(outcome?.provisional).toBe(true);
    // The evidence pair: the same observed value held to both bounds, with
    // clause-level outcomes making the OR visible.
    expect(outcome?.evidence).toHaveLength(2);
    expect(outcome?.evidence[0]).toEqual({
      kind: 'clause',
      sectionKey: 'includeFundingRates',
      header: 'rate',
      op: 'gte',
      operand: '0.0013',
      literal: '0.0004',
      outcome: 'TRUE',
    });
    expect(outcome?.evidence[1]?.outcome).toBe('FALSE');
    // Decimal strings stay strings — the unit belongs to the column.
    expect(typeof outcome?.evidence[0]?.operand).toBe('string');
    expect(c?.trueCount).toBe(1);
    expect(c?.total).toBe(1);
    expect(c?.unresolvedCount).toBe(0);
    expect(c?.strategyRevision).toBe(3);
    expect(c?.provisional).toBe(true);
    // Only ever observed null — carried, never invented.
    expect(c?.verdict).toBeNull();
    expect(c?.decidedBy).toBeNull();
  });

  it('maps an absent block to null, never an empty report', () => {
    expect(mapEvaluationScorecard(logWith(undefined), { owned: true })?.conditions).toBeNull();
  });

  it('maps a null block to null the same way', () => {
    expect(mapEvaluationScorecard(logWith(null), { owned: true })?.conditions).toBeNull();
  });

  it('drops an outcome the platform did not name, and keeps the named ones', () => {
    const e = mapEvaluationScorecard(
      logWith({
        ...OBSERVED_CONDITIONS,
        outcomes: [{ name: 'nameless', outcome: 'TRUE' }, ...OBSERVED_CONDITIONS.outcomes],
      }),
      { owned: true },
    );
    expect(e?.conditions?.outcomes.map((o) => o.conditionKey)).toEqual(['FUNDING_STRETCHED']);
  });

  it('carries the deciding branch verbatim the day the platform populates it', () => {
    const e = mapEvaluationScorecard(
      logWith({ ...OBSERVED_CONDITIONS, verdict: 'BLOCKED', decidedBy: 'FUNDING_STRETCHED' }),
      { owned: true },
    );
    expect(e?.conditions?.verdict).toBe('BLOCKED');
    expect(e?.conditions?.decidedBy).toBe('FUNDING_STRETCHED');
  });
});
