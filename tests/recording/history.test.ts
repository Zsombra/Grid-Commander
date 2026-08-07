import { describe, expect, it } from 'vitest';
import { ReadSignalHistoryQuery } from '@/application/use-cases/read-signal-history.query.js';
import { mapSignalPreview } from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import { aPreviewPayload, InMemorySignalRecordStore } from '../support/recording-fakes.js';

/**
 * One coin's history, as the surfaces read it: captures and failures in one
 * time order, the run's facts on every entry, and one signal's readings with
 * the price beside each.
 */

const T = (h: number): Date => new Date(Date.UTC(2026, 7, 7, h));

async function seeded(): Promise<InMemorySignalRecordStore> {
  const store = new InMemorySignalRecordStore();
  const runId = await store.recordRun({
    userId: 'owner',
    startedAt: T(0),
    platformVersion: 'v11.0.0',
    provenance: { kind: 'named', interval: '4h', coins: ['BTC'] },
  });
  const preview = mapSignalPreview(aPreviewPayload());
  await store.appendCapture({
    runId,
    userId: 'owner',
    coinTicker: 'BTC',
    interval: '4h',
    capturedAt: T(1),
    currentPrice: 100,
    priceChangePercent: 1,
    dominantBias: 'BULLISH',
    aggregateScorePercent: 60,
    hasConflictingSignals: false,
    readings: preview.readings,
    raw: preview.raw,
  });
  await store.appendFailure({
    runId,
    userId: 'owner',
    coinTicker: 'BTC',
    interval: '4h',
    attemptedAt: T(2),
    reason: 'tools/call failed with 504',
  });
  await store.appendCapture({
    runId,
    userId: 'owner',
    coinTicker: 'BTC',
    interval: '4h',
    capturedAt: T(3),
    currentPrice: 104,
    priceChangePercent: 4,
    dominantBias: 'BULLISH',
    aggregateScorePercent: 70,
    hasConflictingSignals: true,
    readings: preview.readings,
    raw: preview.raw,
  });
  return store;
}

describe('the timeline carries captures and failures together', () => {
  it('orders newest first with failures as themselves, run facts on every entry', async () => {
    const query = new ReadSignalHistoryQuery(await seeded());
    const result = await query.execute({ userId: 'owner', coinTicker: 'btc' });
    if (result.kind !== 'history') throw new Error(`expected history, got ${result.kind}`);

    expect(result.coinTicker).toBe('BTC');
    expect(result.entries.map((e) => e.kind)).toEqual(['recorded', 'failed', 'recorded']);
    const [newest, failure, oldest] = result.entries;
    expect(newest?.kind === 'recorded' && newest.currentPrice).toBe(104);
    expect(failure?.kind === 'failed' && failure.reason).toBe('tools/call failed with 504');
    expect(oldest?.kind === 'recorded' && oldest.currentPrice).toBe(100);
    // The run's facts travel on every entry — a reading without its
    // generation and provenance is not evidence.
    for (const entry of result.entries) {
      expect(entry.platformVersion).toBe('v11.0.0');
      expect(entry.provenance.kind).toBe('named');
    }
    // Counts a surface can state without re-deriving.
    expect(newest?.kind === 'recorded' && newest.readingCount).toBe(2);
    expect(newest?.kind === 'recorded' && newest.triggeredCount).toBe(1);
  });
});

describe('one signal across captures', () => {
  it('returns the reading and the price at each capture, newest first', async () => {
    const query = new ReadSignalHistoryQuery(await seeded());
    const result = await query.execute({
      userId: 'owner',
      coinTicker: 'BTC',
      signalId: 'macd_bear_cross',
    });
    if (result.kind !== 'history') throw new Error('expected history');
    expect(result.signal?.signalId).toBe('macd_bear_cross');
    expect(result.signal?.points).toHaveLength(2);
    expect(result.signal?.points.map((p) => p.currentPrice)).toEqual([104, 100]);
    expect(result.signal?.points[0]?.reading.triggered).toBe(true);
    expect(result.signal?.points[0]?.reading.details).toBe('MACD crossed below signal on the 4h');
  });

  it('states a signal with no readings as empty points, not as no history', async () => {
    const query = new ReadSignalHistoryQuery(await seeded());
    const result = await query.execute({
      userId: 'owner',
      coinTicker: 'BTC',
      signalId: 'no_such_signal',
    });
    if (result.kind !== 'history') throw new Error('expected history');
    expect(result.signal).toEqual({ signalId: 'no_such_signal', points: [] });
    // The timeline still renders — the record has plenty to say about the coin.
    expect(result.entries.length).toBeGreaterThan(0);
  });
});

describe('empty and unreadable stay different answers', () => {
  it('says empty for a coin never captured', async () => {
    const query = new ReadSignalHistoryQuery(await seeded());
    const result = await query.execute({ userId: 'owner', coinTicker: 'DOGE' });
    expect(result).toEqual({ kind: 'empty', coinTicker: 'DOGE' });
  });

  it('says unreadable when the store does not answer', async () => {
    const store = new InMemorySignalRecordStore();
    store.broken = 'connection refused';
    const query = new ReadSignalHistoryQuery(store);
    const result = await query.execute({ userId: 'owner', coinTicker: 'BTC' });
    expect(result).toEqual({ kind: 'unreadable', reason: 'connection refused' });
  });

  it('never serves another account', async () => {
    const query = new ReadSignalHistoryQuery(await seeded());
    const result = await query.execute({ userId: 'someone-else', coinTicker: 'BTC' });
    expect(result).toEqual({ kind: 'empty', coinTicker: 'BTC' });
  });
});
