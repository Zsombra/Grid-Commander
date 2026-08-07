import { describe, expect, it, vi } from 'vitest';
import { mapSignalPreview } from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import { aPreviewPayload, InMemorySignalRecordStore } from '../support/recording-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The recorder's surfaces, rendered: the sentences an operator reads about
 * gaps, failures, and a record that has not started — each state its own
 * words, none borrowing another's.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

import RecorderPage from '../../app/(app)/recorder/page.js';
import CoinRecordPage from '../../app/(app)/recorder/[ticker]/page.js';

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);
const noSearch = Promise.resolve({});

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
  for (const [n, price] of [
    [1, 100],
    [2, 102],
    [3, 101],
    [4, 103],
    [5, 104],
    // The three-day hole: nothing until the 8th.
    [8, 110],
  ] as const) {
    await store.appendCapture({
      runId,
      userId: 'owner',
      coinTicker: 'BTC',
      interval: '4h',
      capturedAt: day(n),
      currentPrice: price,
      priceChangePercent: 0,
      dominantBias: 'NEUTRAL',
      aggregateScorePercent: 50,
      hasConflictingSignals: false,
      readings: preview.readings,
      raw: preview.raw,
    });
  }
  await store.appendFailure({
    runId,
    userId: 'owner',
    coinTicker: 'BTC',
    interval: '4h',
    attemptedAt: day(9),
    reason: 'tools/call failed with 504',
  });
  return store;
}

describe('/recorder — the record states its own coverage', () => {
  it('renders the gap, the counts, and the failed attempts', async () => {
    const { app, user, clock } = actingWith({ signalRecord: await seededStore() });
    clock.set(day(8));
    current = { app, user };

    const page = await rendered(RecorderPage());
    expect(page.text).toContain('Gap in recording');
    // Interpolation boundaries join with spaces, so the span and its clause
    // are asserted apart.
    expect(page.text).toContain('3 days');
    expect(page.text).toContain('with no capture');
    // Nothing suggests the signals were quiet during it.
    expect(page.text).toContain('The signals said things in this span; nothing recorded them.');
    expect(page.text).toContain('6 captures');
    expect(page.text).toContain('1 failed attempt');
    expect(page.links).toContain('/recorder/BTC');
  });

  it('says recording has not started, and how it starts', async () => {
    const { app, user } = actingWith();
    current = { app, user };

    const page = await rendered(RecorderPage());
    expect(page.text).toContain('Recording has not started.');
    expect(page.text).toContain('grid-commander-record');
    // The empty record is not rendered as a market with no signals.
    expect(page.text).not.toContain('Gap in recording');
  });

  it('says the record could not be read, distinctly from empty', async () => {
    const store = new InMemorySignalRecordStore();
    store.broken = 'connection refused';
    const { app, user } = actingWith({ signalRecord: store });
    current = { app, user };

    const page = await rendered(RecorderPage());
    expect(page.text).toContain('The record could not be read.');
    expect(page.text).toContain('connection refused');
    expect(page.text).toContain('does not mean nothing is recorded');
    expect(page.text).not.toContain('Recording has not started');
  });

  it('keeps a coin whose every read failed visible', async () => {
    const store = new InMemorySignalRecordStore();
    const runId = await store.recordRun({
      userId: 'owner',
      startedAt: day(1),
      platformVersion: null,
      provenance: { kind: 'named', interval: '1h', coins: ['DOGE'] },
    });
    await store.appendFailure({
      runId,
      userId: 'owner',
      coinTicker: 'DOGE',
      interval: '1h',
      attemptedAt: day(1),
      reason: 'HTTP 502',
    });
    const { app, user } = actingWith({ signalRecord: store });
    current = { app, user };

    const page = await rendered(RecorderPage());
    expect(page.text).toContain('DOGE');
    expect(page.text).toContain('Attempted and never captured');
  });

  it('refuses to render for an unconnected session', async () => {
    const { app } = actingWith();
    current = { app, user: notConnected };
    const page = await rendered(RecorderPage());
    expect(page.text).toContain('Not connected');
  });
});

describe('/recorder/[ticker] — history that never passes a reading off as now', () => {
  it('renders every capture with its capture time, and the failure with its reason', async () => {
    const { app, user } = actingWith({ signalRecord: await seededStore() });
    current = { app, user };

    const page = await rendered(
      CoinRecordPage({ params: params({ ticker: 'BTC' }), searchParams: noSearch }),
    );
    expect(page.headings).toContain('BTC — signal record');
    // Six captures, each carrying "captured <stamp>".
    expect(page.text.match(/captured\s+2026-/g)?.length).toBe(6);
    expect(page.text).toContain('platform v11.0.0');
    expect(page.text).toContain('Could not be read');
    expect(page.text).toContain('tools/call failed with 504');
    expect(page.text).toContain('Not a quiet market');
    // Provenance is stated with the history.
    expect(page.text).toContain('coins named by the operator');
  });

  it('renders one signal across captures with the price beside each reading', async () => {
    const { app, user } = actingWith({ signalRecord: await seededStore() });
    current = { app, user };

    const page = await rendered(
      CoinRecordPage({
        params: params({ ticker: 'BTC' }),
        searchParams: Promise.resolve({ signal: 'macd_bear_cross' }),
      }),
    );
    expect(page.text).toContain('macd_bear_cross across captures');
    expect(page.text).toContain('Triggered');
    expect(page.text).toContain('MACD crossed below signal on the 4h');
    expect(page.text).toContain('$110');
    expect(page.text).toContain('$100');
  });

  it('states a signal the captures never held, without hiding the timeline', async () => {
    const { app, user } = actingWith({ signalRecord: await seededStore() });
    current = { app, user };

    const page = await rendered(
      CoinRecordPage({
        params: params({ ticker: 'BTC' }),
        searchParams: Promise.resolve({ signal: 'no_such_signal' }),
      }),
    );
    expect(page.text).toContain('no readings in this coin’s captures');
    expect(page.text).toContain('Captures');
  });

  it('says empty for a coin never captured, pointing back at the record', async () => {
    const { app, user } = actingWith({ signalRecord: await seededStore() });
    current = { app, user };

    const page = await rendered(
      CoinRecordPage({ params: params({ ticker: 'DOGE' }), searchParams: noSearch }),
    );
    expect(page.text).toContain('Nothing is recorded for');
    expect(page.text).toContain('DOGE');
    expect(page.links).toContain('/recorder');
  });

  it('says unreadable when the store does not answer', async () => {
    const store = new InMemorySignalRecordStore();
    store.broken = 'connection refused';
    const { app, user } = actingWith({ signalRecord: store });
    current = { app, user };

    const page = await rendered(
      CoinRecordPage({ params: params({ ticker: 'BTC' }), searchParams: noSearch }),
    );
    expect(page.text).toContain('The record could not be read.');
    expect(page.text).not.toContain('Nothing is recorded');
  });
});
