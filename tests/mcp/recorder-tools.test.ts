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
  it('is not a tool failure, and not empty, on both tools', async () => {
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
  });
});
