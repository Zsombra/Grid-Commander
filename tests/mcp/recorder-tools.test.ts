import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '@/mcp/server.js';
import type { App } from '@/composition.js';
import { mapSignalPreview } from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import { aPreviewPayload, InMemorySignalRecordStore } from '../support/recording-fakes.js';
import { actingWith } from '../rendering/support/fake-acting.js';
import { FakeClock } from '../support/fakes.js';

/**
 * The record, crossed to a model.
 *
 * The one failure this boundary can add is manufactured evidence: a model
 * reading a hole in the record and reporting a quiet market, or reading a
 * store outage and reporting "nothing is recorded". So what is asserted here
 * is the crossing itself — gaps arrive as gaps, never-recorded arrives with
 * how to start, and unreadable arrives as data naming itself, never as a
 * tool error.
 */

const day = (n: number): Date => new Date(Date.UTC(2026, 6, n));

async function seededStore(): Promise<InMemorySignalRecordStore> {
  const store = new InMemorySignalRecordStore();
  const runId = await store.recordRun({
    userId: 'owner',
    startedAt: day(1),
    platformVersion: 'v11.0.0',
    provenance: { kind: 'named', interval: '4h', coins: ['BTC'] },
  });
  const preview = mapSignalPreview(aPreviewPayload());
  for (const n of [1, 2, 3, 4, 5, 8]) {
    await store.appendCapture({
      runId,
      userId: 'owner',
      coinTicker: 'BTC',
      interval: '4h',
      capturedAt: day(n),
      currentPrice: 100 + n,
      priceChangePercent: 0,
      dominantBias: 'NEUTRAL',
      aggregateScorePercent: 50,
      hasConflictingSignals: false,
      readings: preview.readings,
      raw: preview.raw,
    });
  }
  return store;
}

async function connected(store: InMemorySignalRecordStore) {
  const clock = new FakeClock(day(8));
  const server = buildServer({
    app: actingWith({ signalRecord: store, clock }).app as unknown as App,
    authority: { userId: 'owner', accessToken: 'tok' },
  });
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

const text = (result: unknown): string =>
  ((result as { content: { text: string }[] }).content[0]?.text ?? '');

async function call(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ parsed: Record<string, unknown>; isError: boolean }> {
  const result = await client.callTool({ name, arguments: args });
  return {
    parsed: JSON.parse(text(result)) as Record<string, unknown>,
    isError: (result as { isError?: boolean }).isError === true,
  };
}

describe('a model reads a coin’s recorded history', () => {
  it('receives captures with times and the platform generation each observed', async () => {
    const client = await connected(await seededStore());
    const { parsed, isError } = await call(client, 'read_signal_history', { coinTicker: 'BTC' });

    expect(isError).toBe(false);
    expect(parsed['kind']).toBe('history');
    const entries = parsed['entries'] as { kind: string; capturedAt: string; platformVersion: string }[];
    expect(entries).toHaveLength(6);
    expect(entries[0]?.capturedAt).toContain('2026-07-08');
    for (const e of entries) expect(e.platformVersion).toBe('v11.0.0');
  });

  it('serves one signal across captures with the price beside each reading', async () => {
    const client = await connected(await seededStore());
    const { parsed } = await call(client, 'read_signal_history', {
      coinTicker: 'BTC',
      signalId: 'macd_bear_cross',
    });
    const signal = parsed['signal'] as {
      signalId: string;
      points: { currentPrice: number; reading: { triggered: boolean } }[];
    };
    expect(signal.signalId).toBe('macd_bear_cross');
    expect(signal.points).toHaveLength(6);
    expect(signal.points[0]?.currentPrice).toBe(108);
    expect(signal.points[0]?.reading.triggered).toBe(true);
  });

  it('says empty for a coin never captured — not an error, not a quiet market', async () => {
    const client = await connected(await seededStore());
    const { parsed, isError } = await call(client, 'read_signal_history', { coinTicker: 'DOGE' });
    expect(isError).toBe(false);
    expect(parsed).toEqual({ kind: 'empty', coinTicker: 'DOGE' });
  });
});

describe('a gap crosses the boundary as a gap', () => {
  it('states the hole with its span, apart from the captures around it', async () => {
    const client = await connected(await seededStore());
    const { parsed } = await call(client, 'read_record_coverage');

    expect(parsed['kind']).toBe('coverage');
    const series = parsed['series'] as {
      coinTicker: string;
      captureCount: number;
      gaps: { spanSeconds: number; fromCapturedAt: string; toCapturedAt: string | null }[];
    }[];
    expect(series[0]?.coinTicker).toBe('BTC');
    expect(series[0]?.captureCount).toBe(6);
    expect(series[0]?.gaps).toHaveLength(1);
    expect(series[0]?.gaps[0]?.spanSeconds).toBe(3 * 86400);
    expect(series[0]?.gaps[0]?.fromCapturedAt).toContain('2026-07-05');
  });
});

describe('recording has not started', () => {
  it('is told so, with how it starts — distinctly from a record that failed', async () => {
    const client = await connected(new InMemorySignalRecordStore());
    const { parsed, isError } = await call(client, 'read_record_coverage');

    expect(isError).toBe(false);
    expect(parsed['kind']).toBe('never-recorded');
    expect(String(parsed['howToStart'])).toContain('grid-commander-record');
  });
});

describe('an unreadable store crosses as data naming itself', () => {
  it('is not a tool failure, and not empty, on any of the three tools', async () => {
    const store = new InMemorySignalRecordStore();
    store.broken = 'connection refused';
    const client = await connected(store);

    const coverage = await call(client, 'read_record_coverage');
    expect(coverage.isError).toBe(false);
    expect(coverage.parsed['kind']).toBe('unreadable');
    expect(coverage.parsed['reason']).toBe('connection refused');

    const history = await call(client, 'read_signal_history', { coinTicker: 'BTC' });
    expect(history.isError).toBe(false);
    expect(history.parsed['kind']).toBe('unreadable');

    const forward = await call(client, 'read_forward_returns');
    expect(forward.isError).toBe(false);
    expect(forward.parsed['kind']).toBe('unreadable');
    expect(forward.parsed['reason']).toBe('connection refused');
  });
});

/**
 * The analysis, crossed to a model — and the half of it that has no
 * enforcement on this side.
 *
 * On the web, `ForwardReturnsPanel` renders the query's order and cannot
 * re-sort, so "never by the return" is guaranteed by code. Over MCP the model
 * IS the renderer: it can sort by whatever column it likes and will, unless
 * the contract tells it not to. So the description is tested as carefully as
 * the figures, and the ordering is asserted on a fixture built to punish a
 * sort by return.
 */
describe('the forward analysis crosses with its disciplines', () => {
  type Group = { key: string; n: number; meanPct: number };
  type Analysis = {
    baseline: Group;
    perSignal: Group[];
    perBias: Group[];
    perConflict: Group[];
  };

  /**
   * Four pairs over five evenly-spaced captures, with the biases laid out so
   * the group holding the FEWEST pairs has by far the highest mean — the exact
   * arrangement that "sort by the interesting column" inverts.
   */
  async function unevenStore(): Promise<InMemorySignalRecordStore> {
    const store = new InMemorySignalRecordStore();
    const runId = await store.recordRun({
      userId: 'owner',
      startedAt: day(1),
      platformVersion: 'v19.1.0',
      provenance: { kind: 'named', interval: '4h', coins: ['ETH'] },
    });
    const preview = mapSignalPreview(aPreviewPayload());
    const plan = [
      { n: 1, price: 100, bias: 'BULLISH' },
      { n: 2, price: 101, bias: 'BULLISH' },
      { n: 3, price: 102, bias: 'BULLISH' },
      { n: 4, price: 103, bias: 'BEARISH' },
      { n: 5, price: 113, bias: 'NEUTRAL' },
    ];
    for (const p of plan) {
      await store.appendCapture({
        runId,
        userId: 'owner',
        coinTicker: 'ETH',
        interval: '4h',
        capturedAt: day(p.n),
        currentPrice: p.price,
        priceChangePercent: 0,
        dominantBias: p.bias,
        aggregateScorePercent: 50,
        hasConflictingSignals: false,
        readings: preview.readings,
        raw: preview.raw,
      });
    }
    return store;
  }

  it('carries every figure with the pair count it stands on', async () => {
    const client = await connected(await unevenStore());
    const { parsed, isError } = await call(client, 'read_forward_returns');

    expect(isError).toBe(false);
    expect(parsed['kind']).toBe('analysis');
    expect(parsed['pairCount']).toBe(4);
    expect(parsed['seriesCount']).toBe(1);

    const a = parsed['aggregate'] as Analysis;
    expect(a.baseline.n).toBe(4);
    // Only the signal that fired earns pairs — the attribution rule, as a
    // figure a model can check rather than a sentence it must trust.
    expect(a.perSignal.map((s) => s.key)).toEqual(['macd_bear_cross']);
    expect(a.perSignal[0]?.n).toBe(4);
    for (const row of [...a.perBias, ...a.perConflict]) {
      expect(row.n, row.key).toBeGreaterThan(0);
    }
  });

  it('orders by sample size even when the smallest sample has the best return', async () => {
    const client = await connected(await unevenStore());
    const { parsed } = await call(client, 'read_forward_returns');
    const a = parsed['aggregate'] as Analysis;

    // Three pairs held BULLISH at the earlier capture; one held BEARISH and
    // was followed by a ~10% move.
    expect(a.perBias.map((s) => [s.key, s.n])).toEqual([
      ['BULLISH', 3],
      ['BEARISH', 1],
    ]);
    // The assertion that matters: the leading row is the WORSE figure. If
    // anything ever ranks this by return, this flips.
    expect(a.perBias[0]?.meanPct).toBeLessThan(a.perBias[1]?.meanPct ?? 0);
  });

  it('excludes the pair that spans the gap, and says how many it dropped', async () => {
    // `seededStore` records days 1–5 and then day 8: five spacings, one of
    // which coverage already calls a gap. The pair across it is not a forward
    // return, and a model must be told it was dropped rather than left to
    // wonder why six captures made four pairs.
    const client = await connected(await seededStore());
    const { parsed } = await call(client, 'read_forward_returns');

    expect(parsed['kind']).toBe('analysis');
    expect(parsed['pairCount']).toBe(4);
    expect(parsed['excludedOverGaps']).toBe(1);
    expect((parsed['aggregate'] as Analysis).baseline.n).toBe(4);
  });

  it('says too-shallow as a fact about depth, apart from never-recorded', async () => {
    const shallow = new InMemorySignalRecordStore();
    const runId = await shallow.recordRun({
      userId: 'owner',
      startedAt: day(1),
      platformVersion: 'v19.1.0',
      provenance: { kind: 'named', interval: '4h', coins: ['BTC'] },
    });
    const preview = mapSignalPreview(aPreviewPayload());
    await shallow.appendCapture({
      runId,
      userId: 'owner',
      coinTicker: 'BTC',
      interval: '4h',
      capturedAt: day(1),
      currentPrice: 100,
      priceChangePercent: 0,
      dominantBias: 'NEUTRAL',
      aggregateScorePercent: 50,
      hasConflictingSignals: false,
      readings: preview.readings,
      raw: preview.raw,
    });

    const thin = await call(await connected(shallow), 'read_forward_returns');
    expect(thin.isError).toBe(false);
    expect(thin.parsed['kind']).toBe('not-deep-enough');
    expect(thin.parsed['captureCount']).toBe(1);

    const virgin = await call(await connected(new InMemorySignalRecordStore()), 'read_forward_returns');
    expect(virgin.parsed['kind']).toBe('never-recorded');
    expect(String(virgin.parsed['howToStart'])).toContain('grid-commander-record');

    // A record that holds something but cannot pair it, and a record that was
    // never written, send an operator somewhere different.
    expect(thin.parsed['kind']).not.toBe(virgin.parsed['kind']);
  });

  it('states both disciplines in the contract a model actually receives', async () => {
    const { tools } = await (await connected(new InMemorySignalRecordStore())).listTools();
    const tool = tools.find((t) => t.name === 'read_forward_returns');

    // Gap-pairing: excluded and counted, with the reason a model can repeat.
    expect(tool?.description).toContain('recording gap is excluded');
    expect(tool?.description).toContain('excludedOverGaps');
    // Ordering: stated as an instruction, because the model is the renderer.
    expect(tool?.description).toContain('never by the return');
    expect(tool?.description).toContain('do not re-rank');
    // And that this is the product's own store, not a BattleGrid read.
    expect(tool?.description).toContain('not a live BattleGrid read');
  });
});
