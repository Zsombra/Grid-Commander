import { describe, expect, it } from 'vitest';
import { ReadSectionOptionsQuery } from '@/application/use-cases/read-section-options.query.js';
import { FakeStrategiesPort, aStrategy } from '../support/strategy-fakes.js';
import type { StrategyDetail } from '@/domain/strategy/strategy.js';

function aDetail(overrides: Partial<StrategyDetail> = {}): StrategyDetail {
  return {
    summary: aStrategy(),
    sections: [],
    marketReadText: null,
    thresholds: { minAggregateScore: null, minRequiredCount: null, minAtrPct: null },
    tradeLevelPolicy: null,
    signalRules: [],
    conditions: [],
    openPositionCount: 0,
    cadence: null,
    regimeAutoDerive: false,
    regimeTimeframe: null,
    ...overrides,
  };
}

const who = { userId: 'u1', accessToken: 'at', strategyId: 's1' };

describe('ReadSectionOptionsQuery', () => {
  /**
   * 7.1 — Strategy has sections A and B; vocabulary has A, B, C.
   * All three appear in the result; A and B are present in `detail.sections`.
   */
  it('returns all templates and the strategy detail together', async () => {
    const port = new FakeStrategiesPort([aStrategy()]);
    port.detail = aDetail({
      sections: [
        { kind: 'platform', sectionKey: 'includeRsi' },
        { kind: 'platform', sectionKey: 'includeMacd' },
      ],
    });
    // FakeStrategiesPort.listVocabularyTemplates returns RSI, MACD, Moving Averages
    const query = new ReadSectionOptionsQuery(port);
    const result = await query.execute(who);

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;

    // All three templates from vocabulary are present
    expect(result.templates).toHaveLength(3);
    const keys = result.templates.map((t) => (t.kind === 'platform' ? t.sectionKey : t.templateKey));
    expect(keys).toContain('includeRsi');
    expect(keys).toContain('includeMacd');
    expect(keys).toContain('includeMovingAverages');

    // The strategy detail is the one readStrategy returned
    expect(result.detail.sections).toHaveLength(2);
    expect(result.detail.sections[0]?.sectionKey).toBe('includeRsi');
    expect(result.detail.sections[1]?.sectionKey).toBe('includeMacd');
  });

  /**
   * 7.2 — vocabulary unavailable blocks section editing.
   */
  it('returns vocabulary-unreadable when readVocabulary fails', async () => {
    const port = new FakeStrategiesPort([aStrategy()]);
    port.detail = aDetail();
    port.vocabularyReadable = false;

    const result = await new ReadSectionOptionsQuery(port).execute(who);
    expect(result.kind).toBe('vocabulary-unreadable');
  });

  /**
   * 7.2 (template variant) — template list unavailable also blocks section editing.
   */
  it('returns vocabulary-unreadable when listVocabularyTemplates fails', async () => {
    const port = new FakeStrategiesPort([aStrategy()]);
    port.detail = aDetail();
    port.vocabularyTemplatesReadable = false;

    const result = await new ReadSectionOptionsQuery(port).execute(who);
    expect(result.kind).toBe('vocabulary-unreadable');
  });

  /**
   * 7.3 — strategy reachability gates the compose form.
   */
  it('returns strategy-missing when readStrategy returns missing', async () => {
    const port = new FakeStrategiesPort([aStrategy()]);
    port.detail = null; // null → missing in FakeStrategiesPort

    const result = await new ReadSectionOptionsQuery(port).execute(who);
    expect(result.kind).toBe('strategy-missing');
  });

  it('returns strategy-unreadable when readStrategy is unreadable', async () => {
    const port = new FakeStrategiesPort([aStrategy()]);
    port.detail = null;
    port.detailReadable = false;

    const result = await new ReadSectionOptionsQuery(port).execute(who);
    expect(result.kind).toBe('strategy-unreadable');
  });

  it('carries vocabulary categories on a ready result', async () => {
    const port = new FakeStrategiesPort([aStrategy()]);
    port.detail = aDetail();

    const result = await new ReadSectionOptionsQuery(port).execute(who);
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;

    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.categories[0]?.category).toBe('momentum');
  });
});

/**
 * A failed read reaches the surface with its reason.
 *
 * This query collapsed both unreadable arms to their kind alone, so the edit
 * page could render a heading and a back link and nothing else — the one
 * unreadable branch in the product unable to comply with the rule the rest
 * follow, not because it declined to but because nothing reached it.
 */
describe('a failed read carries its reason and cause', () => {
  it('carries them when the strategy cannot be read', async () => {
    const strategies = new FakeStrategiesPort([aStrategy()]);
    // detailReadable, not readable: the first is the strategy read this query
    // makes, the second is the listing it does not.
    strategies.detailReadable = false;
    const result = await new ReadSectionOptionsQuery(strategies).execute({
      userId: 'u',
      accessToken: 't',
      strategyId: 's1',
    });
    expect(result.kind).toBe('strategy-unreadable');
    if (result.kind === 'strategy-unreadable') {
      expect(result.reason).toBe('BattleGrid did not respond');
      expect(result.cause).toBe('unreachable');
    }
  });
});
