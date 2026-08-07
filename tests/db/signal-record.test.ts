import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DrizzleSignalRecordStore } from '@/infrastructure/db/repositories/drizzle-signal-record-store.js';
import type { SignalReading } from '@/domain/recording/capture.js';
import { harness, ids } from './support.js';

/**
 * The signal record, against a real PostgreSQL.
 *
 * Three guarantees live here and nowhere else. The raw platform answer
 * round-trips byte-faithful — including fields the domain type does not
 * carry, which is the whole point of storing it. One account's record is
 * invisible to another. And recording works with **no `users` row at all**,
 * because the capture CLI runs on personal deployments as `owner`, an
 * identity only the OAuth callback would ever insert.
 */

const h = harness();
afterAll(() => h.close());
beforeEach(() => h.reset());

const STARTED = new Date('2026-08-07T06:00:00Z');
const CAPTURED = new Date('2026-08-07T06:00:05Z');

function store() {
  return new DrizzleSignalRecordStore(h.db, ids('sr'));
}

const reading = (over: Partial<SignalReading> = {}): SignalReading => ({
  signalId: 'rsi_oversold',
  module: 'RSI',
  triggered: false,
  bias: 'NEUTRAL',
  direction: 'NONE',
  score: 0,
  scorePercent: 0,
  effectiveAllocation: 1,
  isPrimary: false,
  required: false,
  details: 'RSI(14) at 38.1 — not oversold (threshold 30)',
  indicatorValues: { rsi14: 38.1 },
  ...over,
});

/** The platform's answer, carrying fields the domain deliberately does not map. */
const RAW = {
  coinTicker: 'BTC',
  coinName: 'Bitcoin',
  coinImageUrl: 'https://example/btc.png',
  currentPrice: 116423.5,
  priceChangePercent: -0.42,
  dominantBias: 'BEARISH',
  aggregateScorePercent: 41,
  hasConflictingSignals: true,
  isAgentWeighted: false,
  comparison: [{ ticker: 'ETH', relationship: 'correlated', correlationToTarget: 0.87 }],
  allEvaluatedSignals: [{ id: 'rsi_oversold', triggered: false }],
} as const;

async function captureBtc(s: DrizzleSignalRecordStore, userId = 'owner'): Promise<string> {
  const runId = await s.recordRun({
    userId,
    startedAt: STARTED,
    platformVersion: 'v11.0.0',
    provenance: { kind: 'named', interval: '4h', coins: ['BTC'] },
  });
  return s.appendCapture({
    runId,
    userId,
    coinTicker: 'BTC',
    interval: '4h',
    capturedAt: CAPTURED,
    currentPrice: 116423.5,
    priceChangePercent: -0.42,
    dominantBias: 'BEARISH',
    aggregateScorePercent: 41,
    hasConflictingSignals: true,
    readings: [reading(), reading({ signalId: 'macd_cross', module: 'MACD', triggered: true })],
    raw: RAW,
  });
}

describe('a capture round-trips whole', () => {
  it('returns the readings, the run, and the platform version beside every capture', async () => {
    const s = store();
    await captureBtc(s);

    const record = await s.history({ userId: 'owner', coinTicker: 'BTC' });
    expect(record.captures).toHaveLength(1);
    expect(record.failures).toHaveLength(0);
    const capture = record.captures[0];
    expect(capture?.capturedAt.toISOString()).toBe(CAPTURED.toISOString());
    expect(capture?.currentPrice).toBe(116423.5);
    expect(capture?.dominantBias).toBe('BEARISH');
    expect(capture?.hasConflictingSignals).toBe(true);
    expect(capture?.readings).toHaveLength(2);
    expect(capture?.readings.map((r) => r.signalId).sort()).toEqual(['macd_cross', 'rsi_oversold']);
    expect(capture?.readings.find((r) => r.signalId === 'rsi_oversold')?.indicatorValues).toEqual({
      rsi14: 38.1,
    });
    // The run travels with the capture: provenance and generation are part of
    // what a reading means.
    expect(capture?.run.platformVersion).toBe('v11.0.0');
    expect(capture?.run.provenance).toEqual({ kind: 'named', interval: '4h', coins: ['BTC'] });
  });

  it('needs no users row — the personal deployment records as owner', async () => {
    /**
     * Load-bearing, not incidental: `users` rows are written only by the
     * OAuth callback, and the capture CLI acts as `owner` on a personal
     * deployment. A foreign key here would make every personal capture fail
     * on insert — the same shape as the proposals table's FK, filed as
     * `a-proposal-cannot-be-recorded-on-a-personal-deployment`.
     */
    const s = store();
    const captureId = await captureBtc(s, 'owner');
    expect(captureId).toBeTruthy();
  });
});

describe('the raw answer is kept whole', () => {
  it('round-trips fields the domain type does not carry', async () => {
    const s = store();
    const captureId = await captureBtc(s);

    const raw = await s.rawAnswer({ userId: 'owner', captureId });
    // Byte-faithful, including what nothing reads today: `comparison` and
    // `coinImageUrl` have no domain field, and a later product that learns to
    // read them must find them in already-recorded history.
    expect(raw).toEqual(RAW);
    expect(raw?.['comparison']).toEqual(RAW.comparison);
    expect(raw?.['coinImageUrl']).toBe('https://example/btc.png');
  });
});

describe('a failed read is a recorded fact', () => {
  it('keeps the failure with its reason, apart from captures', async () => {
    const s = store();
    const runId = await s.recordRun({
      userId: 'owner',
      startedAt: STARTED,
      platformVersion: null,
      provenance: { kind: 'named', interval: '4h', coins: ['BTC'] },
    });
    await s.appendFailure({
      runId,
      userId: 'owner',
      coinTicker: 'BTC',
      interval: '4h',
      attemptedAt: CAPTURED,
      reason: 'tools/call failed with 504',
    });

    const record = await s.history({ userId: 'owner', coinTicker: 'BTC' });
    expect(record.captures).toHaveLength(0);
    expect(record.failures).toHaveLength(1);
    expect(record.failures[0]?.reason).toBe('tools/call failed with 504');
    // A handshake that named no version is recorded as unknown, not guessed.
    expect(record.failures[0]?.run.platformVersion).toBeNull();
  });
});

describe('the recorded series feed coverage', () => {
  it('groups captures by coin and interval, counting failures apart', async () => {
    const s = store();
    const runId = await s.recordRun({
      userId: 'owner',
      startedAt: STARTED,
      platformVersion: 'v11.0.0',
      provenance: {
        kind: 'deployments',
        pairs: [
          { coinTicker: 'BTC', timeframe: '4h' },
          { coinTicker: 'ETH', timeframe: '1h' },
        ],
      },
    });
    const base = { runId, userId: 'owner', readings: [reading()], raw: RAW };
    const metrics = {
      currentPrice: 1,
      priceChangePercent: 0,
      dominantBias: 'NEUTRAL',
      aggregateScorePercent: 50,
      hasConflictingSignals: false,
    };
    await s.appendCapture({ ...base, ...metrics, coinTicker: 'BTC', interval: '4h', capturedAt: new Date('2026-08-05T00:00:00Z') });
    await s.appendCapture({ ...base, ...metrics, coinTicker: 'BTC', interval: '4h', capturedAt: new Date('2026-08-06T00:00:00Z') });
    await s.appendCapture({ ...base, ...metrics, coinTicker: 'ETH', interval: '1h', capturedAt: new Date('2026-08-06T01:00:00Z') });
    await s.appendFailure({ runId, userId: 'owner', coinTicker: 'ETH', interval: '1h', attemptedAt: new Date('2026-08-06T02:00:00Z'), reason: '504' });

    const series = await s.recordedSeries('owner');
    expect(series.series).toHaveLength(2);
    const btc = series.series.find((x) => x.coinTicker === 'BTC');
    expect(btc?.capturedAt).toHaveLength(2);
    expect(btc?.failedAttemptCount).toBe(0);
    const eth = series.series.find((x) => x.coinTicker === 'ETH');
    expect(eth?.capturedAt).toHaveLength(1);
    expect(eth?.failedAttemptCount).toBe(1);
    expect(series.coveredNothing).toHaveLength(0);
  });

  it('keeps a run that covered nothing, with its reason', async () => {
    const s = store();
    await s.recordRun({
      userId: 'owner',
      startedAt: STARTED,
      platformVersion: null,
      provenance: { kind: 'nothing', reason: 'no coins named and the deployments could not be read' },
    });
    const series = await s.recordedSeries('owner');
    expect(series.series).toHaveLength(0);
    expect(series.coveredNothing).toHaveLength(1);
    expect(series.coveredNothing[0]?.provenance).toEqual({
      kind: 'nothing',
      reason: 'no coins named and the deployments could not be read',
    });
  });
});

describe('the record belongs to the account that captured it', () => {
  it('never serves another account, on history, series, or the raw answer', async () => {
    const s = store();
    const captureId = await captureBtc(s, 'owner');

    const otherHistory = await s.history({ userId: 'someone-else', coinTicker: 'BTC' });
    expect(otherHistory.captures).toHaveLength(0);
    expect(otherHistory.failures).toHaveLength(0);

    const otherSeries = await s.recordedSeries('someone-else');
    expect(otherSeries.series).toHaveLength(0);
    expect(otherSeries.coveredNothing).toHaveLength(0);

    // The same null for "not yours" and "does not exist", on purpose.
    expect(await s.rawAnswer({ userId: 'someone-else', captureId })).toBeNull();
  });
});
