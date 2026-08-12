import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { InMemorySignalRecordStore } from '../support/recording-fakes.js';

/**
 * The trim page as a person meets it: choose, read the consequence, confirm —
 * and the property underneath, rendered rather than asserted on the query:
 * however many times the description renders, nothing is deleted.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

async function trimPage(params: { before?: string; problem?: string; trimmed?: string } = {}) {
  const Page = (await import('../../app/(app)/recorder/trim/page.js')).default;
  const r = await rendered(await Page({ searchParams: Promise.resolve(params) }));
  return { ...r, text: r.text.replace(/\s+/g, ' ') };
}

/** One July run with a capture and a failure, one August run with a capture. */
function aRecordedStore(): InMemorySignalRecordStore {
  const store = new InMemorySignalRecordStore();
  void (async () => {
    const early = await store.recordRun({
      userId: 'owner',
      startedAt: new Date('2026-07-01T06:00:00Z'),
      platformVersion: 'v11.0.0',
      provenance: { kind: 'named', coins: ['BTC'], interval: '1h' },
    });
    await store.appendCapture({
      runId: early,
      userId: 'owner',
      coinTicker: 'BTC',
      interval: '1h',
      capturedAt: new Date('2026-07-01T06:00:05Z'),
      currentPrice: 1,
      priceChangePercent: 0,
      dominantBias: 'NEUTRAL',
      aggregateScorePercent: 0,
      hasConflictingSignals: false,
      readings: [],
      raw: {},
    });
    await store.appendFailure({
      runId: early,
      userId: 'owner',
      coinTicker: 'ETH',
      interval: '1h',
      attemptedAt: new Date('2026-07-01T06:00:06Z'),
      reason: 'declined',
    });
    const late = await store.recordRun({
      userId: 'owner',
      startedAt: new Date('2026-08-01T06:00:00Z'),
      platformVersion: 'v16.0.0',
      provenance: { kind: 'named', coins: ['BTC'], interval: '1h' },
    });
    await store.appendCapture({
      runId: late,
      userId: 'owner',
      coinTicker: 'BTC',
      interval: '1h',
      capturedAt: new Date('2026-08-01T06:00:05Z'),
      currentPrice: 2,
      priceChangePercent: 0,
      dominantBias: 'NEUTRAL',
      aggregateScorePercent: 0,
      hasConflictingSignals: false,
      readings: [],
      raw: {},
    });
  })();
  return store;
}

beforeEach(() => {
  current = actingWith({ signalRecord: aRecordedStore() });
});

describe('choosing a boundary is a question, not an act', () => {
  it('offers the date and promises the description before anything happens', async () => {
    const r = await trimPage();
    expect(r.text).toContain('Trim the record');
    expect(r.text).toContain('nothing happens until you confirm');
  });

  it('reads an unparseable date as a problem, not as a boundary', async () => {
    const r = await trimPage({ before: 'last-tuesday' });
    expect(r.text).toContain('not a date this page can read');
  });
});

describe('the description states what becomes unknowable', () => {
  it('counts the doomed span, names its coins, and says it is permanent', async () => {
    const r = await trimPage({ before: '2026-07-15' });
    expect(r.text).toContain('1 capture run will be removed');
    expect(r.text).toContain('BTC, ETH');
    expect(r.text).toContain('can ever be re-recorded');
    // The button says what it does, with the count the agreement binds.
    expect(r.text).toContain('Trim 1 run permanently');
    expect(r.text).toContain('Keep the record whole');
  });

  it('deletes nothing however many times it renders', async () => {
    const store = aRecordedStore();
    current = actingWith({ signalRecord: store });
    await trimPage({ before: '2026-07-15' });
    await trimPage({ before: '2026-07-15' });
    expect(store.runs).toHaveLength(2);
    expect(store.captures).toHaveLength(2);
    expect(store.failures).toHaveLength(1);
  });

  it('says when nothing falls before the boundary, and mints no agreement', async () => {
    const r = await trimPage({ before: '2026-01-01' });
    expect(r.text).toContain('Nothing to trim');
    expect(r.text).toContain('there is nothing to trim');
  });

  it('returns a refusal to the person still standing at the form', async () => {
    const r = await trimPage({ before: '2026-07-15', problem: 'The confirmation expired.' });
    expect(r.text).toContain('The confirmation expired.');
    // The description is re-rendered beside it — the next attempt starts here.
    expect(r.text).toContain('1 capture run will be removed');
  });
});

/**
 * The receipt, after `the-receipt-states-what-remains`.
 *
 * It used to render the `?trimmed=` parameter verbatim, and the assertion here
 * used to be `toContain('Removed 1 run')` — pinning a figure that arrived in
 * the address. The figures were real when the redirect wrote them, which is
 * exactly what made the shape dangerous: real numbers in an editable address
 * read as authoritative, and this is the receipt for an act that can never be
 * undone. Every number below now comes from the record, and none from the URL.
 */
describe('the receipt', () => {
  it('states what the record now holds, read from the record', async () => {
    const r = await trimPage({ trimmed: '1' });
    expect(r.text).toContain('Record trimmed');
    expect(r.text).toContain('What the record holds now');
    // The coin is the store's. Nothing in the address named it.
    expect(r.text).toContain('BTC');
  });

  it('renders no figure the address carried', async () => {
    // The old sentence's exact shape, forged. None of it may reach the page.
    const r = await trimPage({
      trimmed: 'Removed 9999 runs: 4242 captures, 8 failed attempts, 31337 readings.',
    });
    expect(r.text).not.toContain('9999');
    expect(r.text).not.toContain('4242');
    expect(r.text).not.toContain('31337');
    expect(r.text).not.toContain('Removed');
    // And it still says what is true.
    expect(r.text).toContain('BTC');
  });

  it('re-derives against whatever the record holds when it is opened', async () => {
    // A bookmark cannot re-attest a removal, because it states the present.
    current = actingWith({ signalRecord: new InMemorySignalRecordStore() });
    const r = await trimPage({ trimmed: '1' });
    expect(r.text).toContain('Recording has not started.');
    expect(r.text).not.toContain('BTC');
  });

  it('says the record could not be read, without claiming it is empty', async () => {
    const store = new InMemorySignalRecordStore();
    store.broken = 'connection refused';
    current = actingWith({ signalRecord: store });
    const r = await trimPage({ trimmed: '1' });
    expect(r.text).toContain('The record could not be read.');
    expect(r.text).toContain('connection refused');
    expect(r.text).toContain('does not mean nothing is recorded');
    // The two failures that must not borrow each other's words.
    expect(r.text).not.toContain('Recording has not started');
  });
});
