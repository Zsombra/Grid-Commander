import { describe, expect, it, vi } from 'vitest';
import type { RegimePoint } from '@/domain/recording/regime.js';
import { mapSignalPreview } from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import { FakeMarketPort } from '../support/market-fakes.js';
import { aPreviewPayload, InMemorySignalRecordStore } from '../support/recording-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The regime page's arms, as a person reads them — the window before the
 * composition, the labels verbatim with their counts, "now" kept apart from
 * the window, and every failure or empty answer in its own words.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

import RegimePage from '../../app/(app)/recorder/regime/page.js';

const hour = (n: number): Date => new Date(Date.UTC(2026, 7, 1, n));
const pt = (h: number, regime: string): RegimePoint => ({
  at: hour(h),
  regime,
  conviction: 'medium',
});

async function page(store: InMemorySignalRecordStore, market: FakeMarketPort) {
  current = actingWith({ signalRecord: store, market }) as typeof current;
  const resolved = await rendered(await RegimePage());
  return { ...resolved, text: resolved.text.replace(/\s+/g, ' ') };
}

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

describe('the regime context renders with its honesty attached', () => {
  it('states the window, the composition with counts, and now — kept apart', async () => {
    const market = new FakeMarketPort();
    market.regimeHistoryBySymbol['BTC'] = {
      kind: 'history',
      points: [pt(0, 'bear_ranging'), pt(1, 'bear_ranging'), pt(2, 'bear_expansion')],
      droppedPoints: 0,
    };
    market.regimeSnapshotBySymbol['BTC'] = {
      kind: 'snapshot',
      snapshot: {
        regime: 'bear_ranging',
        conviction: 'medium',
        runLengthBars: 15,
        axes: [
          { axis: 'trend', value: 'ranging' },
          { axis: 'volatility', value: 'normal' },
          { axis: 'momentum', value: 'bullish' },
        ],
      },
    };
    const r = await page(await seeded([{ ticker: 'BTC', hours: [0, 1, 2] }]), market);
    expect(r.text).toContain('BTC · 1h');
    expect(r.text).toContain('Recorded window 2026-08-01 00:00Z to 2026-08-01 02:00Z — 3 captures');
    expect(r.text).toContain('Over 3 platform bars in the window');
    expect(r.text).toContain('bear_ranging — 2 bars');
    expect(r.text).toContain('bear_expansion — 1 bar');
    // The snapshot names itself as now, apart from the window.
    expect(r.text).toContain('Now — not the window: bear_ranging (medium conviction), held 15 bars');
    expect(r.text).toContain('trend ranging, volatility normal, momentum bullish');
  });

  it('says when the look-back cannot reach the record’s start', async () => {
    const market = new FakeMarketPort();
    market.regimeHistoryBySymbol['BTC'] = {
      kind: 'history',
      points: [pt(3, 'bear_ranging'), pt(4, 'bear_ranging')],
      droppedPoints: 0,
    };
    const r = await page(await seeded([{ ticker: 'BTC', hours: [0, 1, 2, 3, 4] }]), market);
    expect(r.text).toContain('look-back begins 2026-08-01 03:00Z, after this record started');
    expect(r.text).toContain('covers 2026-08-01 03:00Z to 2026-08-01 04:00Z, not the whole window');
  });

  it('renders the platform’s empty answers in their own terms', async () => {
    // Nothing scripted: the fake answers 'none' and 'unclassified' — the
    // platform's own empty answers, which must not read as failures.
    const r = await page(await seeded([{ ticker: 'BTC', hours: [0, 1] }]), new FakeMarketPort());
    expect(r.text).toContain('holds no regime history for BTC at 1h');
    expect(r.text).toContain('classifies no regime for BTC at 1h');
    expect(r.text).toContain('not a failure');
    expect(r.text).not.toContain('could not be read');
  });

  it('one coin’s failed read leaves the other rendering, with the cause said', async () => {
    const market = new FakeMarketPort();
    market.regimeHistoryBySymbol['ETH'] = {
      kind: 'unreadable',
      reason: 'the platform timed out',
      cause: 'unreachable',
    };
    market.regimeHistoryBySymbol['BTC'] = {
      kind: 'history',
      points: [pt(0, 'bull_ranging'), pt(1, 'bull_ranging')],
      droppedPoints: 0,
    };
    const r = await page(
      await seeded([
        { ticker: 'BTC', hours: [0, 1] },
        { ticker: 'ETH', hours: [0, 1] },
      ]),
      market,
    );
    expect(r.text).toContain('bull_ranging — 2 bars');
    expect(r.text).toContain('The regime history for ETH could not be read: the platform timed out');
    // The shared sentence, cause-accurate, subject completing it.
    expect(r.text).toContain('This does not mean this coin’s regime history is gone');
    expect(r.text).toContain('could not reach BattleGrid');
  });

  it('states dropped points beside the composition they are missing from', async () => {
    const market = new FakeMarketPort();
    market.regimeHistoryBySymbol['BTC'] = {
      kind: 'history',
      points: [pt(0, 'bear_ranging'), pt(1, 'bear_ranging')],
      droppedPoints: 2,
    };
    const r = await page(await seeded([{ ticker: 'BTC', hours: [0, 1] }]), market);
    expect(r.text).toContain('2 points could not be read and are not counted');
  });

  it('keeps never-recorded and the store failing as their own sentences', async () => {
    const market = new FakeMarketPort();
    const empty = await page(new InMemorySignalRecordStore(), market);
    expect(empty.text).toContain('Recording has not started');
    expect(empty.text).toContain('grid-commander-record');

    const broken = new InMemorySignalRecordStore();
    broken.broken = 'the record store is unreachable';
    const r = await page(broken, market);
    expect(r.text).toContain('The record could not be read.');
    expect(r.text).toContain('does not mean the record is empty');
    // And the platform was never asked — no BattleGrid sentence appears.
    expect(market.regimeReads).toEqual([]);
  });
});
