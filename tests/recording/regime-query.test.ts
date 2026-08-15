import { describe, expect, it } from 'vitest';
import { ReadRegimeContextQuery } from '@/application/use-cases/read-regime-context.query.js';
import type { RegimePoint } from '@/domain/recording/regime.js';
import { mapSignalPreview } from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import { FakeMarketPort } from '../support/market-fakes.js';
import { aPreviewPayload, InMemorySignalRecordStore } from '../support/recording-fakes.js';

/**
 * The query's joins and arms: subjects from the record, answers from the
 * platform, one series' failure never costing another's context.
 */

const hour = (n: number): Date => new Date(Date.UTC(2026, 7, 1, n));
const pt = (h: number, regime: string): RegimePoint => ({
  at: hour(h),
  regime,
  conviction: 'medium',
});

async function seeded(
  coins: readonly { ticker: string; hours: readonly number[] }[],
): Promise<InMemorySignalRecordStore> {
  const store = new InMemorySignalRecordStore();
  const runId = await store.recordRun({
    userId: 'owner',
    startedAt: hour(0),
    platformVersion: 'v18.2.0',
    provenance: { kind: 'named', interval: '1h', coins: coins.map((c) => c.ticker) },
  });
  const preview = mapSignalPreview(aPreviewPayload());
  for (const coin of coins) {
    for (const h of coin.hours) {
      await store.appendCapture({
        runId,
        userId: 'owner',
        coinTicker: coin.ticker,
        interval: '1h',
        capturedAt: hour(h),
        currentPrice: 100 + h,
        priceChangePercent: 0,
        dominantBias: 'NEUTRAL',
        aggregateScorePercent: 50,
        hasConflictingSignals: false,
        readings: preview.readings,
        raw: preview.raw,
      });
    }
  }
  return store;
}

const req = { userId: 'owner', accessToken: 'tok' };

describe('the regime context query', () => {
  it('asks the platform for exactly the record’s own subjects', async () => {
    const store = await seeded([
      { ticker: 'BTC', hours: [0, 1, 2] },
      { ticker: 'SOL', hours: [1, 2] },
    ]);
    const market = new FakeMarketPort();
    const result = await new ReadRegimeContextQuery(store, market).execute(req);
    if (result.kind !== 'context') throw new Error(result.kind);

    const asked = market.regimeReads.map((r) => `${r.tool}:${r.symbol}@${r.timeframe}`).sort();
    expect(asked).toEqual([
      'history:BTC@1h',
      'history:SOL@1h',
      'snapshot:BTC@1h',
      'snapshot:SOL@1h',
    ]);
    // Alphabetical — the composition ranks nothing, and the order must not
    // look like it does.
    expect(result.series.map((s) => s.coinTicker)).toEqual(['BTC', 'SOL']);
  });

  it('bounds each series to its own window and composes inside it', async () => {
    const store = await seeded([{ ticker: 'BTC', hours: [2, 1, 3] }]);
    const market = new FakeMarketPort();
    market.regimeHistoryBySymbol['BTC'] = {
      kind: 'history',
      points: [pt(0, 'bull_ranging'), pt(1, 'bear_ranging'), pt(2, 'bear_ranging'), pt(3, 'bear_expansion'), pt(4, 'bull_ranging')],
      droppedPoints: 0,
    };
    const result = await new ReadRegimeContextQuery(store, market).execute(req);
    if (result.kind !== 'context') throw new Error(result.kind);
    const s = result.series[0];
    if (s === undefined || s.history.kind !== 'composition') throw new Error('no composition');
    // Window from the captures' own min and max, whatever order they arrived.
    expect(s.windowFrom).toEqual(hour(1));
    expect(s.windowTo).toEqual(hour(3));
    expect(s.captureCount).toBe(3);
    expect(s.history.composition.barsInWindow).toBe(3);
    expect(s.history.composition.labels[0]).toEqual({ regime: 'bear_ranging', barCount: 2 });
  });

  it('one series’ failed read costs that series only', async () => {
    const store = await seeded([
      { ticker: 'BTC', hours: [0, 1] },
      { ticker: 'ETH', hours: [0, 1] },
      { ticker: 'SOL', hours: [0, 1] },
    ]);
    const market = new FakeMarketPort();
    market.regimeHistoryBySymbol['ETH'] = {
      kind: 'unreadable',
      reason: 'the platform timed out',
      cause: 'unreachable',
    };
    const result = await new ReadRegimeContextQuery(store, market).execute(req);
    if (result.kind !== 'context') throw new Error(result.kind);
    expect(result.series).toHaveLength(3);
    expect(result.series.map((s) => s.history.kind)).toEqual(['none', 'unreadable', 'none']);
  });

  it('a port that throws still costs only its own series', async () => {
    // The port contract is unreadable-not-thrown; the catch is the belt over
    // that suspender, and it must hold per series.
    const store = await seeded([
      { ticker: 'BTC', hours: [0, 1] },
      { ticker: 'ETH', hours: [0, 1] },
    ]);
    const market = new FakeMarketPort();
    const scripted = market.regimeSnapshot.bind(market);
    market.regimeSnapshot = async (p) => {
      if (p.symbol === 'BTC') throw new Error('a surprise the port promised not to throw');
      return scripted(p);
    };
    const result = await new ReadRegimeContextQuery(store, market).execute(req);
    if (result.kind !== 'context') throw new Error(result.kind);
    expect(result.series.map((s) => s.snapshot.kind)).toEqual(['unreadable', 'unclassified']);
  });

  it('keeps never-recorded and unreadable as their own arms', async () => {
    const market = new FakeMarketPort();
    const empty = await new ReadRegimeContextQuery(new InMemorySignalRecordStore(), market).execute(
      req,
    );
    if (empty.kind !== 'never-recorded') throw new Error(empty.kind);
    expect(empty.howToStart).toContain('grid-commander-record');

    const broken = new InMemorySignalRecordStore();
    broken.broken = 'the record store is unreachable';
    const r = await new ReadRegimeContextQuery(broken, market).execute(req);
    expect(r).toEqual({ kind: 'unreadable', reason: 'the record store is unreachable' });
    // And the platform was never asked about a record that could not be read.
    expect(market.regimeReads).toEqual([]);
  });
});
