import { describe, expect, it } from 'vitest';
import { deriveSeriesCoverage } from '@/domain/recording/coverage.js';
import {
  HOW_RECORDING_STARTS,
  ReadRecordCoverageQuery,
} from '@/application/use-cases/read-record-coverage.query.js';
import { FakeClock } from '../support/fakes.js';
import { InMemorySignalRecordStore } from '../support/recording-fakes.js';

/**
 * Coverage — the one place a gap is defined, exercised at the definition and
 * at the query that serves it.
 */

const day = (n: number): Date => new Date(Date.UTC(2026, 7, n));

describe('the gap definition (spacing > 2× the series median)', () => {
  it('states a three-day hole in a daily cadence as exactly one gap', () => {
    const coverage = deriveSeriesCoverage({
      coinTicker: 'BTC',
      interval: '4h',
      // Daily 1st→5th, then nothing until the 8th — the scenario in the spec.
      capturedAt: [day(1), day(2), day(3), day(4), day(5), day(8)],
      failedAttemptCount: 0,
      now: day(8),
    });
    expect(coverage.gaps).toHaveLength(1);
    expect(coverage.gaps[0]?.fromCapturedAt).toEqual(day(5));
    expect(coverage.gaps[0]?.toCapturedAt).toEqual(day(8));
    expect(coverage.gaps[0]?.spanSeconds).toBe(3 * 86400);
    expect(coverage.captureCount).toBe(6);
    expect(coverage.firstCapturedAt).toEqual(day(1));
    expect(coverage.lastCapturedAt).toEqual(day(8));
  });

  it('states the open interval since the last capture, by the same bound', () => {
    const coverage = deriveSeriesCoverage({
      coinTicker: 'BTC',
      interval: '4h',
      capturedAt: [day(1), day(2), day(3)],
      failedAttemptCount: 0,
      // Four days of silence and counting.
      now: day(7),
    });
    expect(coverage.gaps).toHaveLength(1);
    expect(coverage.gaps[0]?.toCapturedAt).toBeNull();
    expect(coverage.gaps[0]?.spanSeconds).toBe(4 * 86400);
  });

  it('claims no gap when there is no cadence to violate', () => {
    const single = deriveSeriesCoverage({
      coinTicker: 'BTC',
      interval: '4h',
      capturedAt: [day(1)],
      failedAttemptCount: 0,
      now: day(30),
    });
    // One capture states one moment; a gap after it would invent a schedule
    // nobody declared.
    expect(single.gaps).toHaveLength(0);
  });

  it('does not let one long outage redefine the cadence it violated', () => {
    const coverage = deriveSeriesCoverage({
      coinTicker: 'BTC',
      interval: '4h',
      // Median spacing stays 1 day despite the 10-day hole.
      capturedAt: [day(1), day(2), day(3), day(13), day(14), day(15)],
      failedAttemptCount: 0,
      now: day(15),
    });
    expect(coverage.gaps).toHaveLength(1);
    expect(coverage.gaps[0]?.spanSeconds).toBe(10 * 86400);
  });

  it('counts failed attempts apart — they explain a gap without filling it', () => {
    const coverage = deriveSeriesCoverage({
      coinTicker: 'ETH',
      interval: '1h',
      capturedAt: [day(1), day(2)],
      failedAttemptCount: 7,
      now: day(2),
    });
    expect(coverage.failedAttemptCount).toBe(7);
  });
});

describe('the coverage query keeps the three states apart', () => {
  const at = (store: InMemorySignalRecordStore) =>
    new ReadRecordCoverageQuery(store, new FakeClock(day(8)));

  async function recordedSeries(store: InMemorySignalRecordStore, days: readonly number[]) {
    const runId = await store.recordRun({
      userId: 'owner',
      startedAt: day(days[0] ?? 1),
      platformVersion: 'v11.0.0',
      provenance: { kind: 'named', interval: '4h', coins: ['BTC'] },
    });
    for (const n of days) {
      await store.appendCapture({
        runId,
        userId: 'owner',
        coinTicker: 'BTC',
        interval: '4h',
        capturedAt: day(n),
        currentPrice: 1,
        priceChangePercent: 0,
        dominantBias: 'NEUTRAL',
        aggregateScorePercent: 50,
        hasConflictingSignals: false,
        readings: [],
        raw: {},
      });
    }
    return runId;
  }

  it('derives coverage with gaps from the rows', async () => {
    const store = new InMemorySignalRecordStore();
    await recordedSeries(store, [1, 2, 3, 4, 5, 8]);
    const result = await at(store).execute({ userId: 'owner' });
    expect(result.kind).toBe('coverage');
    if (result.kind !== 'coverage') return;
    expect(result.series).toHaveLength(1);
    expect(result.series[0]?.gaps).toHaveLength(1);
  });

  it('says recording has not started, and how it starts', async () => {
    const result = await at(new InMemorySignalRecordStore()).execute({ userId: 'owner' });
    expect(result).toEqual({ kind: 'never-recorded', howToStart: HOW_RECORDING_STARTS });
    expect(HOW_RECORDING_STARTS).toContain('grid-commander-record');
  });

  it('reports an unanswerable store as unreadable, never as empty', async () => {
    const store = new InMemorySignalRecordStore();
    store.broken = 'connection refused';
    const result = await at(store).execute({ userId: 'owner' });
    expect(result).toEqual({ kind: 'unreadable', reason: 'connection refused' });
  });

  it('keeps a coin whose every read failed visible, apart from the covered ones', async () => {
    const store = new InMemorySignalRecordStore();
    const runId = await recordedSeries(store, [1, 2]);
    await store.appendFailure({
      runId,
      userId: 'owner',
      coinTicker: 'DOGE',
      interval: '1h',
      attemptedAt: day(2),
      reason: 'HTTP 502',
    });
    const result = await at(store).execute({ userId: 'owner' });
    if (result.kind !== 'coverage') throw new Error('expected coverage');
    // DOGE has no captures, so it cannot state a first/last — but it must
    // not vanish: attempted-and-never-captured is its own listed state.
    expect(result.series.map((s) => s.coinTicker)).toEqual(['BTC']);
    expect(result.neverCaptured).toEqual([
      { coinTicker: 'DOGE', interval: '1h', failedAttemptCount: 1 },
    ]);
  });

  it('lists runs that covered nothing, with their reasons', async () => {
    const store = new InMemorySignalRecordStore();
    await store.recordRun({
      userId: 'owner',
      startedAt: day(3),
      platformVersion: null,
      provenance: { kind: 'nothing', reason: 'the deployments could not be read: HTTP 502' },
    });
    const result = await at(store).execute({ userId: 'owner' });
    // An attempted run that found no subject is not "never recorded" — the
    // recorder ran, and the record says so.
    expect(result.kind).toBe('coverage');
    if (result.kind !== 'coverage') return;
    expect(result.coveredNothing).toHaveLength(1);
  });
});
