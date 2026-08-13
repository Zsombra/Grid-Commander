import { describe, expect, it } from 'vitest';
import {
  CaptureSignalsCommand,
  exitCodeFor,
} from '@/application/use-cases/capture-signals.command.js';
import { mapSignalPreview } from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import type { RadarPort, RadarReadResult } from '@/ports/radar.js';
import type { Clock } from '@/ports/clock.js';
import {
  aPreviewPayload,
  InMemorySignalRecordStore,
  ScriptedMarket,
} from '../support/recording-fakes.js';

/**
 * The capture command over fakes: what gets stored, not what got returned.
 *
 * Every assertion that matters reads the store's own arrays — the
 * FakeAgentsPort lesson: a command that returns a tidy summary while storing
 * nothing would pass any test that only reads the summary.
 */

const T0 = new Date('2026-08-07T06:00:00Z');

function tickingClock(): Clock {
  let t = T0.getTime();
  return { now: () => new Date((t += 1000)) };
}

function radarWith(result: RadarReadResult): RadarPort {
  return {
    listDeployments: async () => result,
    deploymentTimeframes: async () => [],
    upsertDeployment: async () => {
      throw new Error('the recorder never writes a deployment');
    },
    deleteDeployment: async () => {
      throw new Error('the recorder never deletes a deployment');
    },
  };
}

const radarUnused = (): RadarPort =>
  radarWith({ kind: 'unreadable', reason: 'the test never expected a radar read', cause: 'unreachable' });

function previewFor(ticker: string) {
  return {
    kind: 'preview' as const,
    preview: mapSignalPreview(aPreviewPayload({ coinTicker: ticker })),
  };
}

const REQ = { userId: 'owner', accessToken: 'bg_live_test' };

describe('a named capture records what every signal said', () => {
  it('stores a capture per coin with readings, price, clock time, and the run version', async () => {
    const market = new ScriptedMarket({ BTC: previewFor('BTC'), ETH: previewFor('ETH') }).saysVersion(
      'v11.0.0',
    );
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(market, radarUnused(), store, tickingClock());

    const result = await command.execute({ ...REQ, named: { coins: ['btc', 'ETH'], interval: '4h' } });

    expect(result.recorded).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(exitCodeFor(result)).toBe(0);

    // The store, not the summary, is the record.
    expect(store.captures).toHaveLength(2);
    const btc = store.captures.find((c) => c.coinTicker === 'BTC');
    expect(btc?.interval).toBe('4h');
    expect(btc?.currentPrice).toBe(116423.5);
    expect(btc?.readings.map((r) => r.signalId).sort()).toEqual(['macd_bear_cross', 'rsi_oversold']);
    // Clock-stamped, strictly after the run started.
    expect(btc?.capturedAt.getTime()).toBeGreaterThan(T0.getTime());
    // The raw answer rode along whole.
    expect(btc?.raw['comparison']).toBeDefined();

    expect(store.runs).toHaveLength(1);
    expect(store.runs[0]?.platformVersion).toBe('v11.0.0');
    expect(store.runs[0]?.provenance).toEqual({
      kind: 'named',
      interval: '4h',
      coins: ['BTC', 'ETH'],
    });
  });

  it('sends the ticker and interval it was given, and nothing else can be sent', async () => {
    const market = new ScriptedMarket({ SOL: previewFor('SOL') });
    const command = new CaptureSignalsCommand(
      market,
      radarUnused(),
      new InMemorySignalRecordStore(),
      tickingClock(),
    );
    await command.execute({ ...REQ, named: { coins: ['SOL'], interval: '1h' } });
    expect(market.calls).toEqual([{ ticker: 'SOL', interval: '1h' }]);
  });
});

describe('one coin failing is one gap, not ten', () => {
  it('records the failure with the platform reason and captures the siblings', async () => {
    const market = new ScriptedMarket({
      BTC: previewFor('BTC'),
      ETH: { kind: 'unreadable', reason: 'tools/call failed with 504', cause: 'unreachable' },
      SOL: previewFor('SOL'),
    });
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(market, radarUnused(), store, tickingClock());

    const result = await command.execute({
      ...REQ,
      named: { coins: ['BTC', 'ETH', 'SOL'], interval: '4h' },
    });

    expect(result.recorded.map((r) => r.coinTicker)).toEqual(['BTC', 'SOL']);
    expect(result.failed).toEqual([
      { coinTicker: 'ETH', interval: '4h', reason: 'tools/call failed with 504' },
    ]);
    expect(exitCodeFor(result)).toBe(0);
    expect(store.captures).toHaveLength(2);
    expect(store.failures).toHaveLength(1);
    expect(store.failures[0]?.reason).toBe('tools/call failed with 504');
  });

  it('keeps an answer that arrived but could not be read', async () => {
    const malformedAnswer = aPreviewPayload({ currentPrice: undefined });
    const market = new ScriptedMarket({
      BTC: {
        kind: 'unreadable',
        reason: 'the signal preview carried no usable currentPrice',
        cause: 'unreachable',
        raw: malformedAnswer,
      },
    });
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(market, radarUnused(), store, tickingClock());

    await command.execute({ ...REQ, named: { coins: ['BTC'], interval: '4h' } });

    expect(store.failures).toHaveLength(1);
    // The malformed answer is exactly the kind a later mapper fix recovers —
    // but only if it survives today.
    expect(store.failures[0]?.raw).toBe(malformedAnswer);
  });

  it("turns a thrown read into that coin's failure and continues — the port contract's belt", async () => {
    const market = new ScriptedMarket({
      BTC: () => {
        throw new Error('a bug the adapter never caught');
      },
      ETH: previewFor('ETH'),
    });
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(market, radarUnused(), store, tickingClock());

    const result = await command.execute({ ...REQ, named: { coins: ['BTC', 'ETH'], interval: '4h' } });

    expect(result.failed).toEqual([
      { coinTicker: 'BTC', interval: '4h', reason: 'a bug the adapter never caught' },
    ]);
    expect(store.captures.map((c) => c.coinTicker)).toEqual(['ETH']);
    expect(store.failures.map((f) => f.coinTicker)).toEqual(['BTC']);
  });
});

describe('the platform being down is a recorded attempt, not silence', () => {
  it('records every coin as failed and exits nonzero', async () => {
    const market = new ScriptedMarket({
      BTC: { kind: 'unreadable', reason: 'HTTP 502', cause: 'unreachable' },
      ETH: { kind: 'unreadable', reason: 'HTTP 502', cause: 'unreachable' },
    }).saysVersion(null);
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(market, radarUnused(), store, tickingClock());

    const result = await command.execute({ ...REQ, named: { coins: ['BTC', 'ETH'], interval: '4h' } });

    expect(result.recorded).toHaveLength(0);
    expect(exitCodeFor(result)).toBe(1);
    expect(store.failures).toHaveLength(2);
    // A handshake that did not answer is recorded as unknown, not guessed.
    expect(store.runs[0]?.platformVersion).toBeNull();
  });
});

describe('the deployments choose when nothing is named', () => {
  const deployments: RadarReadResult = {
    kind: 'deployments',
    deployments: [
      { policyId: 'p1', coinTicker: 'HYPE', revision: 3, timeframe: '15m', enabled: true, slotAgentIds: ['a1'], onDutyAgentId: 'a1', openPositionAgentId: null, resolution: null },
      { policyId: 'p2', coinTicker: 'BTC', revision: 1, timeframe: '4h', enabled: true, slotAgentIds: ['a2'], onDutyAgentId: null, openPositionAgentId: null, resolution: null },
      // The same coin+timeframe twice — two slots, one capture.
      { policyId: 'p3', coinTicker: 'HYPE', revision: 2, timeframe: '15m', enabled: false, slotAgentIds: ['a3'], onDutyAgentId: null, openPositionAgentId: null, resolution: null },
    ],
  };

  it('captures each deployed coin at its deployed timeframe, once', async () => {
    const market = new ScriptedMarket({ HYPE: previewFor('HYPE'), BTC: previewFor('BTC') });
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(market, radarWith(deployments), store, tickingClock());

    const result = await command.execute(REQ);

    expect(market.calls).toEqual([
      { ticker: 'HYPE', interval: '15m' },
      { ticker: 'BTC', interval: '4h' },
    ]);
    expect(result.provenance).toEqual({
      kind: 'deployments',
      pairs: [
        { coinTicker: 'HYPE', timeframe: '15m' },
        { coinTicker: 'BTC', timeframe: '4h' },
      ],
    });
    expect(store.captures).toHaveLength(2);
  });

  it("records covered-nothing with the radar's own reason when it cannot be read", async () => {
    const market = new ScriptedMarket({});
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(
      market,
      radarWith({ kind: 'unreadable', reason: 'HTTP 502', cause: 'unreachable' }),
      store,
      tickingClock(),
    );

    const result = await command.execute(REQ);

    expect(result.recorded).toHaveLength(0);
    expect(exitCodeFor(result)).toBe(1);
    expect(market.calls).toHaveLength(0);
    expect(store.runs).toHaveLength(1);
    const provenance = store.runs[0]?.provenance;
    expect(provenance?.kind).toBe('nothing');
    // The radar's reason travels — "could not be read" and "not deployed"
    // send an operator to different places.
    expect(provenance?.kind === 'nothing' && provenance.reason).toContain('HTTP 502');
  });

  it('records covered-nothing when the account is deployed nowhere', async () => {
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(
      new ScriptedMarket({}),
      radarWith({ kind: 'deployments', deployments: [] }),
      store,
      tickingClock(),
    );

    const result = await command.execute(REQ);

    expect(exitCodeFor(result)).toBe(1);
    const provenance = store.runs[0]?.provenance;
    expect(provenance?.kind === 'nothing' && provenance.reason).toContain('no radar deployments');
  });

  it('records covered-nothing when named coins normalise to none', async () => {
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(
      new ScriptedMarket({}),
      radarUnused(),
      store,
      tickingClock(),
    );

    const result = await command.execute({ ...REQ, named: { coins: ['  ', ''], interval: '4h' } });

    expect(exitCodeFor(result)).toBe(1);
    expect(store.runs[0]?.provenance.kind).toBe('nothing');
    expect(store.captures).toHaveLength(0);
  });
});
