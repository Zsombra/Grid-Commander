import { describe, expect, it } from 'vitest';
import { ReadForwardReturnsQuery } from '@/application/use-cases/read-forward-returns.query.js';
import { mapSignalPreview } from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import { aPreviewPayload, InMemorySignalRecordStore } from '../support/recording-fakes.js';

/**
 * The query's four arms over the in-memory store, and the composition
 * detail that would silently poison every figure: the history read defaults
 * to its newest 50 rows, so the query must ask for the whole series.
 */

const hour = (n: number): Date => new Date(Date.UTC(2026, 7, 1, n));

async function seeded(
  captures: readonly { ticker: string; atHour: number; price: number }[],
): Promise<InMemorySignalRecordStore> {
  const store = new InMemorySignalRecordStore();
  const runId = await store.recordRun({
    userId: 'owner',
    startedAt: hour(0),
    platformVersion: 'v18.2.0',
    provenance: { kind: 'named', interval: '1h', coins: ['BTC'] },
  });
  const preview = mapSignalPreview(aPreviewPayload());
  for (const c of captures) {
    await store.appendCapture({
      runId,
      userId: 'owner',
      coinTicker: c.ticker,
      interval: '1h',
      capturedAt: hour(c.atHour),
      currentPrice: c.price,
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

describe('ReadForwardReturnsQuery', () => {
  it('answers never-recorded for an account with no record at all', async () => {
    const result = await new ReadForwardReturnsQuery(new InMemorySignalRecordStore()).execute({
      userId: 'owner',
    });
    expect(result.kind).toBe('never-recorded');
  });

  it('answers not-deep-enough with the depth facts, not an error', async () => {
    const store = await seeded([{ ticker: 'BTC', atHour: 0, price: 100 }]);
    const result = await new ReadForwardReturnsQuery(store).execute({ userId: 'owner' });
    expect(result.kind).toBe('not-deep-enough');
    if (result.kind === 'not-deep-enough') {
      expect(result.captureCount).toBe(1);
      expect(result.seriesCount).toBe(1);
      expect(result.firstCapturedAt).toEqual(hour(0));
    }
  });

  it('aggregates pairs across series', async () => {
    const store = await seeded([
      { ticker: 'BTC', atHour: 0, price: 100 },
      { ticker: 'BTC', atHour: 1, price: 101 },
      { ticker: 'ETH', atHour: 0, price: 200 },
      { ticker: 'ETH', atHour: 1, price: 198 },
    ]);
    const result = await new ReadForwardReturnsQuery(store).execute({ userId: 'owner' });
    expect(result.kind).toBe('analysis');
    if (result.kind === 'analysis') {
      expect(result.pairCount).toBe(2);
      expect(result.seriesCount).toBe(2);
      expect(result.aggregate.baseline.n).toBe(2);
      expect(result.firstCapturedAt).toEqual(hour(0));
      expect(result.lastCapturedAt).toEqual(hour(1));
    }
  });

  it('asks history for the whole series, not the default newest 50', async () => {
    const store = await seeded([{ ticker: 'BTC', atHour: 0, price: 100 }]);
    const asked: (number | undefined)[] = [];
    const original = store.history.bind(store);
    store.history = async (params) => {
      asked.push(params.limit);
      return original(params);
    };
    await new ReadForwardReturnsQuery(store).execute({ userId: 'owner' });
    expect(asked).toEqual([1 + 8]);
  });

  it('answers unreadable when the store does not, saying nothing about the record', async () => {
    const store = new InMemorySignalRecordStore();
    store.recordedSeries = async () => {
      throw new Error('the record store is unreachable');
    };
    const result = await new ReadForwardReturnsQuery(store).execute({ userId: 'owner' });
    expect(result.kind).toBe('unreadable');
    if (result.kind === 'unreadable') {
      expect(result.reason).toContain('unreachable');
    }
  });
});
