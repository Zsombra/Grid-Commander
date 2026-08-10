import { describe, expect, it } from 'vitest';
import { ReadRiskReadingQuery } from '@/application/use-cases/read-risk-reading.query.js';
import {
  anAgent,
  aTradeOutcome,
  FakeAgentsPort,
  liveTradingConfig,
} from '../support/agent-fakes.js';

/**
 * Each setting against the thing that makes it safe or unsafe.
 *
 * The property that matters most here is the last describe block: three reads,
 * and **one failing hides neither of the others**. An operator whose catalog
 * read times out should still learn that most of their agent's trades ended at
 * a stop, because that is the finding they came for.
 */

const AUTHORITY = { userId: 'u1', accessToken: 't1', agentId: 'a1' };

function portWith(config = liveTradingConfig()): FakeAgentsPort {
  return new FakeAgentsPort([anAgent({ id: 'a1', tradingConfig: config })]);
}

describe('against the platform’s defaults', () => {
  it('sets a ceiling against the default BattleGrid declares for it', async () => {
    const agents = portWith();
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    expect(reading.ceilings.kind).toBe('read');
    if (reading.ceilings.kind !== 'read') return;
    const trades = reading.ceilings.value.find((c) => c.field === 'maxDailyTrades');
    expect(trades?.value).toBe(30);
    expect(trades?.platformDefault).toBe(10);
    expect(trades?.multiple).toBe(3);
    expect(trades?.matchesDefault).toBe(false);
  });

  it('states agreement rather than omitting it — a setting nobody changed is a fact', async () => {
    const agents = portWith(liveTradingConfig({ maxDailyTrades: 10 }));
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    if (reading.ceilings.kind !== 'read') throw new Error('expected a reading');
    const trades = reading.ceilings.value.find((c) => c.field === 'maxDailyTrades');
    expect(trades?.matchesDefault).toBe(true);
    expect(trades?.multiple).toBe(1);
  });

  /**
   * The six BattleGrid deliberately does not default — it will not decide on
   * anyone's behalf how much an agent may lose. Inventing a comparison for them
   * would answer a question the platform left open.
   */
  it('invents no comparison for a field the catalog declines to default', async () => {
    const agents = portWith();
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    if (reading.ceilings.kind !== 'read') throw new Error('expected a reading');
    for (const field of ['maxDailyLossUsd', 'maxCumulativeDrawdownUsd', 'maxConcurrentExposureUsd']) {
      const row = reading.ceilings.value.find((c) => c.field === field);
      expect(row?.platformDefault, field).toBeNull();
      expect(row?.multiple, field).toBeNull();
      expect(row?.matchesDefault, field).toBe(false);
    }
  });

  it('compares only numbers — a mode and a nested block have no multiple', async () => {
    const agents = portWith();
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    if (reading.ceilings.kind !== 'read') throw new Error('expected a reading');
    const fields = reading.ceilings.value.map((c) => c.field);
    expect(fields).not.toContain('tradingMode');
    expect(fields).not.toContain('positionManagement');
    expect(fields).not.toContain('positionSizePresets');
  });

  it('admits no multiple against a default of zero rather than rendering an Infinity', async () => {
    const agents = portWith();
    agents.catalog = { ...agents.catalog, defaults: { ...agents.catalog.defaults, maxLeverage: 0 } };
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    if (reading.ceilings.kind !== 'read') throw new Error('expected a reading');
    const leverage = reading.ceilings.value.find((c) => c.field === 'maxLeverage');
    expect(leverage?.platformDefault).toBe(0);
    expect(leverage?.multiple).toBeNull();
  });

  it('says nothing to compare when the agent carries no config', async () => {
    const agents = new FakeAgentsPort([anAgent({ id: 'a1', tradingConfig: null })]);
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);
    expect(reading.ceilings.kind).toBe('none');
  });
});

describe('the exit geometry', () => {
  it('folds the agent’s own closed trades', async () => {
    const agents = portWith();
    agents.tradeOutcomes = {
      kind: 'outcomes',
      outcomes: [
        aTradeOutcome({ id: 'a', closeReason: 'STOP_LOSS', entryFillPrice: 100, exitFillPrice: 99 }),
        aTradeOutcome({ id: 'b', closeReason: 'STOP_LOSS', entryFillPrice: 100, exitFillPrice: 99 }),
        aTradeOutcome({ id: 'c', closeReason: 'TAKE_PROFIT', entryFillPrice: 100, exitFillPrice: 103 }),
      ],
      total: 3,
    };

    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);
    expect(reading.geometry.kind).toBe('read');
    if (reading.geometry.kind !== 'read') return;
    expect(reading.geometry.value.endings[0]?.reason).toBe('STOP_LOSS');
    expect(reading.geometry.value.measured).toBe(3);
  });

  it('says an agent has closed nothing, distinctly from a record that failed', async () => {
    const agents = portWith();
    agents.tradeOutcomes = { kind: 'none' };
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);
    expect(reading.geometry.kind).toBe('none');
  });

  it('treats an empty page as nothing closed rather than an empty fold', async () => {
    const agents = portWith();
    agents.tradeOutcomes = { kind: 'outcomes', outcomes: [], total: 0 };
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);
    expect(reading.geometry.kind).toBe('none');
  });
});

describe('what ends a position early', () => {
  it('carries the two switches that force an exit', async () => {
    const agents = portWith(
      liveTradingConfig({
        positionManagement: {
          positionManagementPreset: 'WALTHER',
          enabled: true,
          trailingEnabled: true,
          timeDecayEnabled: true,
        },
      }),
    );
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    expect(reading.management.kind).toBe('read');
    if (reading.management.kind !== 'read') return;
    expect(reading.management.value.enabled).toBe(true);
    expect(reading.management.value.trailingEnabled).toBe(true);
    expect(reading.management.value.timeDecayEnabled).toBe(true);
    expect(reading.management.value.preset).toBe('WALTHER');
  });

  it('reads management as off when the master switch is off', async () => {
    const agents = portWith();
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);
    if (reading.management.kind !== 'read') throw new Error('expected a reading');
    expect(reading.management.value.enabled).toBe(false);
  });

  /**
   * Drift is `agent-authoring`'s contract and `positionDrift()`'s answer. This
   * only has to carry it — a second implementation would be the drift it exists
   * to prevent. CUSTOM draws no claim either way, which is what the fixture is.
   */
  it('claims no drift for a CUSTOM agent, deferring to positionDrift', async () => {
    const agents = portWith();
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);
    if (reading.management.kind !== 'read') throw new Error('expected a reading');
    expect(reading.management.value.differing).toEqual([]);
  });

  it('says nothing where the agent carries no management block', async () => {
    const agents = portWith(liveTradingConfig({ positionManagement: undefined }));
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);
    expect(reading.management.kind).toBe('none');
  });
});

/**
 * The load-bearing property.
 *
 * Three reads, three sections. Any one of them can fail without taking the
 * others with it — the same rule the pipeline page keeps for its three stages,
 * and for the same reason: a surface that hides two answers behind one outage
 * is a surface that reports an unreadable agent as an agent with nothing to
 * report.
 */
describe('one read failing hides neither of the others', () => {
  it('still folds the trades when the catalog cannot be read', async () => {
    const agents = portWith();
    agents.catalogReadable = false;
    agents.tradeOutcomes = {
      kind: 'outcomes',
      outcomes: [aTradeOutcome({ closeReason: 'STOP_LOSS' })],
      total: 1,
    };

    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    expect(reading.ceilings.kind).toBe('unreadable');
    expect(reading.geometry.kind).toBe('read');
    // Management still renders: the settings are the agent's own, and only the
    // drift claim needed the catalog.
    expect(reading.management.kind).toBe('read');
    if (reading.management.kind !== 'read') return;
    expect(reading.management.value.differing).toEqual([]);
  });

  it('still compares the ceilings when the trade record cannot be read', async () => {
    const agents = portWith();
    agents.tradeOutcomes = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };

    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    expect(reading.geometry.kind).toBe('unreadable');
    expect(reading.ceilings.kind).toBe('read');
    expect(reading.management.kind).toBe('read');
  });

  it('reports every section unreadable when the roster itself fails', async () => {
    // The roster carries the config both other sections read from, so its
    // failure is genuinely all three — stated, rather than rendered as an
    // agent that has no settings.
    const agents = portWith();
    agents.rosterReadable = false;
    agents.tradeOutcomes = {
      kind: 'outcomes',
      outcomes: [aTradeOutcome({ closeReason: 'STOP_LOSS' })],
      total: 1,
    };

    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);

    expect(reading.ceilings.kind).toBe('unreadable');
    expect(reading.management.kind).toBe('unreadable');
    // The trades do not come from the roster, so they still answer.
    expect(reading.geometry.kind).toBe('read');
  });

  it('says nothing rather than failing when the agent is absent from the roster', async () => {
    const agents = new FakeAgentsPort([anAgent({ id: 'someone-else' })]);
    const reading = await new ReadRiskReadingQuery(agents).execute(AUTHORITY);
    expect(reading.ceilings.kind).toBe('none');
    expect(reading.management.kind).toBe('none');
  });
});
