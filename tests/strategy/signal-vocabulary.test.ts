import { describe, expect, it } from 'vitest';
import { McpStrategyAdapter, StrategyPayloadError } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { ReadSignalLibraryQuery } from '@/application/use-cases/read-signal-library.query.js';
import { ReadSignalQuery } from '@/application/use-cases/read-signal.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { aSignal, aSignalDefinition, FakeStrategiesPort } from '../support/strategy-fakes.js';

/** Shaped from the live `list_strategy_signals` entry of 2026-08-01. */
const LIVE_SUMMARY = {
  signalId: 'rsi_oversold',
  module: 'RSI',
  direction: 'LONG',
  kind: 'standard',
  priceBasis: 'CLOSED',
  display: {
    id: 'rsi_oversold',
    module: 'RSI',
    displayName: 'Oversold',
    description: 'RSI-14 falls below 30 — price in oversold territory',
  },
};

/** Shaped from the live `get_strategy_signal_definition` payload of 2026-08-01. */
const LIVE_DEFINITION = {
  signal: {
    ...LIVE_SUMMARY,
    moduleDisplay: {
      module: 'RSI',
      displayName: 'RSI',
      description: 'Relative Strength Index — momentum oscillator on 0–100.',
    },
    info: {
      detects: 'RSI has fallen into oversold territory.',
      fires: 'Triggers when RSI(14) drops below the threshold.',
      exampleSetup: 'Threshold = 30',
      examples: [
        { scenario: 'RSI = 27', outcome: 'fires, Bullish, score 0.10' },
        { scenario: 'RSI = 32', outcome: 'does not fire' },
      ],
      bestFor: 'Mean-reversion entries inside ranges.',
      watchOut: 'In strong downtrends RSI can stay <30 for many bars.',
    },
    paramSchemaJson: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          minimum: 1,
          maximum: 50,
          description: 'RSI oversold boundary in 0–100 index points.',
        },
      },
      required: ['threshold'],
    },
    defaultParams: { threshold: 30 },
    indicators: [{ key: 'rsi14', meta: { label: 'RSI(14)', precision: 1 } }],
    timeframeAvailability: null,
  },
};

function adapterOver(respond: (req: ToolCallRequest) => unknown) {
  const calls: ToolCallRequest[] = [];
  const battlegrid: BattleGridPort = {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('unused');
    },
    refresh: async () => {
      throw new Error('unused');
    },
    revoke: async () => {},
    discoverTools: async () => [],
    callTool: async (request) => {
      calls.push(request);
      return {
        content: respond(request),
        classification: {
          mutating: false,
          destructive: false,
          requiredScope: 'mcp:read',
          basis: 'annotations',
        },
        auditEntryId: 'a1',
      };
    },
  };
  return { adapter: new McpStrategyAdapter(battlegrid), calls };
}

const who = { userId: 'u1', accessToken: 'at' };

describe('mapping the live signal list', () => {
  it('keeps id, module, direction and display copy', async () => {
    const { adapter, calls } = adapterOver(() => ({ signals: [LIVE_SUMMARY] }));
    const result = await adapter.listSignals(who);
    expect(result.kind).toBe('signals');
    if (result.kind !== 'signals') return;
    expect(result.signals[0]).toEqual({
      id: 'rsi_oversold',
      module: 'RSI',
      direction: 'LONG',
      name: 'Oversold',
      description: 'RSI-14 falls below 30 — price in oversold territory',
    });
    expect(calls[0]?.tool).toBe('list_strategy_signals');
  });

  it('a row with no signalId makes the whole read unreadable, not a shorter list', async () => {
    const { adapter } = adapterOver(() => ({ signals: [LIVE_SUMMARY, { module: 'RSI' }] }));
    const result = await adapter.listSignals(who);
    expect(result.kind).toBe('unreadable');
    if (result.kind !== 'unreadable') return;
    expect(result.reason).toContain('signalId');
  });

  it('a payload with no signals array is unreadable', async () => {
    const { adapter } = adapterOver(() => ({ items: [] }));
    expect((await adapter.listSignals(who)).kind).toBe('unreadable');
  });
});

describe('mapping a signal definition', () => {
  it('keeps the whole authoring card in the platform’s words', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_DEFINITION);
    const d = await adapter.signalDefinition({ ...who, signalId: 'rsi_oversold' });
    expect(d.summary.name).toBe('Oversold');
    expect(d.moduleName).toBe('RSI');
    expect(d.detects).toContain('oversold territory');
    expect(d.fires).toContain('drops below the threshold');
    expect(d.examples).toHaveLength(2);
    expect(d.bestFor).toContain('Mean-reversion');
    expect(d.watchOut).toContain('downtrends');
    expect(d.parameters).toEqual([
      {
        key: 'threshold',
        description: 'RSI oversold boundary in 0–100 index points.',
        min: 1,
        max: 50,
        defaultValue: 30,
      },
    ]);
    expect(d.indicators).toEqual(['RSI(14)']);
    expect(calls[0]?.args).toEqual({ signalId: 'rsi_oversold' });
  });

  it('a signal with no parameters maps to an empty list, not an invented one', async () => {
    const { adapter } = adapterOver(() => ({
      signal: { ...LIVE_SUMMARY, paramSchemaJson: {}, defaultParams: {}, indicators: [] },
    }));
    const d = await adapter.signalDefinition({ ...who, signalId: 'rsi_oversold' });
    expect(d.parameters).toEqual([]);
    expect(d.indicators).toEqual([]);
  });

  it('refuses a payload with no signal object', async () => {
    const { adapter } = adapterOver(() => ({}));
    await expect(adapter.signalDefinition({ ...who, signalId: 'rsi_oversold' })).rejects.toThrow(
      StrategyPayloadError,
    );
  });
});

describe('the signal library query', () => {
  it('groups by module in listing order', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.signals = [
      aSignal(),
      aSignal({ id: 'macd_bull_cross', module: 'MACD', name: 'Bull Cross' }),
      aSignal({ id: 'rsi_overbought', direction: 'SHORT', name: 'Overbought' }),
    ];
    const result = await new ReadSignalLibraryQuery(strategies).execute(who);
    expect(result.kind).toBe('library');
    if (result.kind !== 'library') return;
    expect(result.modules.map((m) => m.module)).toEqual(['RSI', 'MACD']);
    expect(result.modules[0]?.signals.map((s) => s.id)).toEqual(['rsi_oversold', 'rsi_overbought']);
  });

  it('zero signals renders as unreadable — the vocabulary did not load', async () => {
    const result = await new ReadSignalLibraryQuery(new FakeStrategiesPort()).execute(who);
    expect(result.kind).toBe('unreadable');
  });

  it('an unreadable list stays unreadable', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.signalsReadable = false;
    const result = await new ReadSignalLibraryQuery(strategies).execute(who);
    expect(result.kind).toBe('unreadable');
  });
});

describe('the single-signal query', () => {
  it('an unlisted id is no-such-signal, and the definition tool is never asked', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageSignal(aSignalDefinition());
    const result = await new ReadSignalQuery(strategies).execute({ ...who, signalId: 'ghost' });
    expect(result).toEqual({ kind: 'no-such-signal' });
  });

  it('a listed id answers with its definition', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageSignal(aSignalDefinition());
    const result = await new ReadSignalQuery(strategies).execute({ ...who, signalId: 'rsi_oversold' });
    expect(result.kind).toBe('signal');
    if (result.kind !== 'signal') return;
    expect(result.definition.summary.name).toBe('Oversold');
  });

  it('a definition that fails after listing is unreadable, not missing', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.signals = [aSignal()]; // listed, but no definition staged → read throws
    const result = await new ReadSignalQuery(strategies).execute({ ...who, signalId: 'rsi_oversold' });
    expect(result.kind).toBe('unreadable');
  });
});
