import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapConditionOutcomes } from '@/infrastructure/battlegrid/condition-outcome-mapper.js';
import {
  hasUnmodelledEvidence,
  stillProvisional,
} from '@/domain/strategy/condition-outcome.js';

/**
 * The platform's answers about live market state, read into the domain.
 *
 * The fixture below is the **real `conditionOutcomes` row observed 2026-08-04**,
 * recorded in `openspec/backlog/condition-outcomes-are-unrendered.md` — not
 * invented, and not reconstructed from the declared schema, which promises two
 * evidence variants and a per-ticker `verdict` that no capture has ever shown.
 *
 * Three things must survive this mapping, and each has cost this product
 * something in another place: the clause-level evidence that explains *why*, the
 * `provisional` flag that separates an open bar from a settled one, and the
 * `unresolvedCount` third state that is not a synonym for false.
 */

const LIVE_OUTCOMES = [
  {
    ticker: 'BTC',
    outcomes: [
      {
        conditionKey: 'ALL_AGREE_UP',
        name: 'Regime, HTF and ADX agree — up',
        outcome: 'FALSE',
        provisional: true,
        counts: null,
        evidence: [
          {
            kind: 'clause',
            sectionKey: 'includeRegimeContext',
            header: 'regTrend_now',
            op: 'is',
            operand: 'ranging',
            literal: 'trending up',
            outcome: 'FALSE',
          },
        ],
      },
      {
        conditionKey: 'FOUR_OF_FOUR',
        name: 'Four of four',
        outcome: 'TRUE',
        provisional: false,
        // The threshold-group shape, also observed live on 2026-08-04.
        counts: { trueCount: 4, total: 4, unresolvedCount: 0 },
        evidence: [],
      },
    ],
  },
];

describe('the platform’s outcomes become the domain shape', () => {
  const [btc] = mapConditionOutcomes(LIVE_OUTCOMES);

  it('answers per ticker, keeping every condition the platform resolved', () => {
    expect(btc?.ticker).toBe('BTC');
    expect(btc?.outcomes.map((o) => o.conditionKey)).toEqual(['ALL_AGREE_UP', 'FOUR_OF_FOUR']);
  });

  it('keeps the clause-level reason: what was observed against what was required', () => {
    const [e] = btc?.outcomes[0]?.evidence ?? [];
    if (e?.kind !== 'clause') throw new Error('the observed evidence is a clause');
    expect(e.header).toBe('regTrend_now');
    expect(e.sectionKey).toBe('includeRegimeContext');
    expect(e.op).toBe('is');
    // The pair that answers *why*. Losing either half leaves a verdict with no
    // explanation, which is the half an author already had.
    expect(e.operand).toBe('ranging');
    expect(e.literal).toBe('trending up');
    expect(e.outcome).toBe('FALSE');
  });

  it('keeps provisional apart from settled', () => {
    expect(btc?.outcomes[0]?.provisional).toBe(true);
    expect(btc?.outcomes[1]?.provisional).toBe(false);
    expect(stillProvisional(btc?.outcomes ?? []).map((o) => o.conditionKey)).toEqual([
      'ALL_AGREE_UP',
    ]);
  });

  it('an absent provisional flag is "not marked", never "assume it might be"', () => {
    const [row] = mapConditionOutcomes([
      { ticker: 'ETH', outcomes: [{ conditionKey: 'K', name: 'K', outcome: 'TRUE', evidence: [] }] },
    ]);
    expect(row?.outcomes[0]?.provisional).toBe(false);
  });

  it('carries counts as three numbers, and null as "not a threshold group"', () => {
    // `null` is not a group of zero. A condition that is not a threshold group
    // has nothing to count, and rendering it as 0 of 0 would state a fact
    // nobody gave.
    expect(btc?.outcomes[0]?.counts).toBeNull();
    expect(btc?.outcomes[1]?.counts).toEqual({ trueCount: 4, total: 4, unresolvedCount: 0 });
  });

  it('keeps the unresolved third state as its own number', () => {
    const [row] = mapConditionOutcomes([
      {
        ticker: 'SOL',
        outcomes: [
          {
            conditionKey: 'THREE_OF_FIVE',
            name: 'Three of five',
            outcome: 'UNRESOLVED',
            provisional: false,
            counts: { trueCount: 2, total: 5, unresolvedCount: 2 },
            evidence: [],
          },
        ],
      },
    ]);
    const counts = row?.outcomes[0]?.counts;
    // Two held, two could not be resolved, five in total — and *no fourth
    // number*. The one that does not exist is the point: a "did not hold" count
    // is exactly where the third state gets folded into the second.
    expect(counts).toEqual({ trueCount: 2, total: 5, unresolvedCount: 2 });
    expect(Object.keys(counts ?? {}).sort()).toEqual(['total', 'trueCount', 'unresolvedCount']);
  });

  it('a half-read tally is no tally at all', () => {
    // Held and total with the unresolved count missing would render as a group
    // where everything that did not hold was false — the exact collapse.
    const [row] = mapConditionOutcomes([
      {
        ticker: 'BTC',
        outcomes: [
          {
            conditionKey: 'K',
            name: 'K',
            outcome: 'TRUE',
            counts: { trueCount: 2, total: 5 },
            evidence: [],
          },
        ],
      },
    ]);
    expect(row?.outcomes[0]?.counts).toBeNull();
  });

  it('an outcome word this product has never seen passes through as it arrived', () => {
    // The regression that would flatten the third state: a union narrowed to
    // TRUE/FALSE/UNRESOLVED has to do *something* with a fourth word, and
    // everything it can do is wrong. This one is carried.
    const [row] = mapConditionOutcomes([
      {
        ticker: 'BTC',
        outcomes: [{ conditionKey: 'K', name: 'K', outcome: 'PENDING_CLOSE', evidence: [] }],
      },
    ]);
    expect(row?.outcomes[0]?.outcome).toBe('PENDING_CLOSE');
  });

  it('an evidence form the product does not model is reported, not dropped', () => {
    // `conditionRef` is declared by the output schema and has never been
    // observed. It renders as an explanation nobody models, keeping its own
    // outcome — never as an explanation that was one entry shorter.
    const [row] = mapConditionOutcomes([
      {
        ticker: 'BTC',
        outcomes: [
          {
            conditionKey: 'K',
            name: 'K',
            outcome: 'FALSE',
            evidence: [{ kind: 'conditionRef', conditionKey: 'FLOW_UP', outcome: 'FALSE' }],
          },
        ],
      },
    ]);
    const outcome = row?.outcomes[0];
    expect(outcome?.evidence).toHaveLength(1);
    const [e] = outcome?.evidence ?? [];
    if (e?.kind !== 'unmodelled') throw new Error('an unobserved form maps to unmodelled');
    expect(e.outcome).toBe('FALSE');
    expect(e.reason).toContain('conditionRef');
    expect(hasUnmodelledEvidence(outcome!)).toBe(true);
  });

  it('a clause missing what it compared is unmodelled rather than half-rendered', () => {
    const [row] = mapConditionOutcomes([
      {
        ticker: 'BTC',
        outcomes: [
          {
            conditionKey: 'K',
            name: 'K',
            outcome: 'FALSE',
            evidence: [
              { kind: 'clause', sectionKey: 'includeRsi', header: 'RSI14', op: 'gt', outcome: 'FALSE' },
            ],
          },
        ],
      },
    ]);
    expect(row?.outcomes[0]?.evidence[0]?.kind).toBe('unmodelled');
  });

  it('names a condition by its key when the platform sent no name', () => {
    const [row] = mapConditionOutcomes([
      { ticker: 'BTC', outcomes: [{ conditionKey: 'ALL_AGREE_UP', outcome: 'TRUE', evidence: [] }] },
    ]);
    expect(row?.outcomes[0]?.name).toBe('ALL_AGREE_UP');
  });

  it('drops a row that names no condition, and one that names no coin', () => {
    // Both are rows nobody can act on: the key is what an author goes and looks
    // at, and the ticker is what the whole payload is keyed by.
    const [row] = mapConditionOutcomes([
      { ticker: 'BTC', outcomes: [{ name: 'nameless', outcome: 'TRUE', evidence: [] }] },
      { outcomes: [{ conditionKey: 'K', outcome: 'TRUE', evidence: [] }] },
    ]);
    expect(row?.outcomes).toEqual([]);
    expect(mapConditionOutcomes(LIVE_OUTCOMES.concat([{ outcomes: [] }] as never))).toHaveLength(1);
  });

  it('an outcome with no answer is dropped rather than given one', () => {
    const [row] = mapConditionOutcomes([
      { ticker: 'BTC', outcomes: [{ conditionKey: 'K', name: 'K', evidence: [] }] },
    ]);
    expect(row?.outcomes).toEqual([]);
  });

  it('a payload with no outcomes is empty, not a failure', () => {
    // What the platform answers when it was sent no conditions to resolve —
    // every preview this product made before the argument existed.
    expect(mapConditionOutcomes([])).toEqual([]);
    expect(mapConditionOutcomes(undefined)).toEqual([]);
  });
});

describe('this product never decides whether a condition held', () => {
  it('the outcome mapper concludes nothing', () => {
    const src = readFileSync('src/infrastructure/battlegrid/condition-outcome-mapper.ts', 'utf8');
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    // No outcome word is ever produced here — every one is carried from the
    // payload. A literal would be this product's guess wearing BattleGrid's
    // authority, the `get_agent_performance` defect in a new place.
    expect(code, 'outcome words are carried, never written').not.toMatch(
      /['"](TRUE|FALSE|UNRESOLVED)['"]/,
    );
    // And nothing here compares what was observed to what was required — that
    // comparison is the platform's, resolved against market data we do not hold.
    expect(code).not.toMatch(/operand\s*[=!]==?\s*literal|literal\s*[=!]==?\s*operand/);
  });

  it('the domain over outcomes classifies and counts nothing false', () => {
    for (const [name, fn] of Object.entries({ stillProvisional, hasUnmodelledEvidence })) {
      const src = fn.toString();
      expect(src, `${name} decides no outcome`).not.toMatch(/['"](TRUE|FALSE|UNRESOLVED)['"]/);
      expect(src, `${name} reads no column value`).not.toMatch(/\boperand\b|\bliteral\b/);
      // `total - trueCount - unresolvedCount` is the arithmetic that turns three
      // states into two. It exists nowhere.
      expect(src, `${name} derives no false count`).not.toMatch(/unresolvedCount/);
    }
  });

  it('no surface derives a count of members that did not hold', () => {
    const sources = [
      'src/presentation/components/condition-outcomes.tsx',
      'src/infrastructure/battlegrid/condition-outcome-mapper.ts',
    ].map((f) => readFileSync(f, 'utf8'));
    for (const src of sources) {
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
        .join('\n');
      expect(code, 'no subtraction folds unresolved into false').not.toMatch(
        /total\s*-\s*|-\s*unresolvedCount|-\s*trueCount/,
      );
    }
  });
});
