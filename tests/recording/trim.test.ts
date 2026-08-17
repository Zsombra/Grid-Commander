import { describe, expect, it } from 'vitest';
import {
  DescribeTrimRecordQuery,
  TrimRecordCommand,
  TRIM_TOOL,
} from '@/application/use-cases/trim-record.command.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import { InMemorySignalRecordStore } from '../support/recording-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * The ceremony over the one act whose loss is permanent by the product's own
 * argument. The assertions go through the store's contents, not the absence of
 * errors — the FakeAgentsPort lesson, applied to the store that matters most.
 */

const USER = 'owner';

/** A record with two runs either side of the boundary the tests trim at. */
async function aRecord(store: InMemorySignalRecordStore) {
  const early = await store.recordRun({
    userId: USER,
    startedAt: new Date('2026-07-01T06:00:00Z'),
    platformVersion: 'v11.0.0',
    provenance: { kind: 'named', coins: ['BTC'], interval: '1h' },
  });
  await store.appendCapture({
    runId: early,
    userId: USER,
    coinTicker: 'BTC',
    interval: '1h',
    capturedAt: new Date('2026-07-01T06:00:05Z'),
    currentPrice: 100,
    priceChangePercent: 1,
    dominantBias: 'BULLISH',
    aggregateScorePercent: 60,
    hasConflictingSignals: false,
    readings: [
      {
        signalId: 'rsi',
        module: 'RSI',
        triggered: true,
        bias: 'BULLISH',
        direction: 'LONG',
        score: 1,
        scorePercent: 50,
        effectiveAllocation: 1,
        isPrimary: true,
        required: false,
        details: null,
        indicatorValues: {},
      },
    ],
    raw: { coinTicker: 'BTC' },
  });
  await store.appendFailure({
    runId: early,
    userId: USER,
    coinTicker: 'ETH',
    interval: '1h',
    attemptedAt: new Date('2026-07-01T06:00:06Z'),
    reason: 'platform declined',
  });

  const late = await store.recordRun({
    userId: USER,
    startedAt: new Date('2026-08-01T06:00:00Z'),
    platformVersion: 'v14.0.0',
    provenance: { kind: 'named', coins: ['BTC'], interval: '1h' },
  });
  await store.appendCapture({
    runId: late,
    userId: USER,
    coinTicker: 'BTC',
    interval: '1h',
    capturedAt: new Date('2026-08-01T06:00:05Z'),
    currentPrice: 110,
    priceChangePercent: 2,
    dominantBias: 'BULLISH',
    aggregateScorePercent: 70,
    hasConflictingSignals: false,
    readings: [],
    raw: { coinTicker: 'BTC' },
  });
  return { early, late };
}

function ceremony(store: InMemorySignalRecordStore) {
  const clock = new FakeClock();
  const confirmations = new FakeConfirmationStore(clock);
  const describe = new DescribeTrimRecordQuery(store, confirmations, new SequentialRandom(), clock);
  const perform = new TrimRecordCommand(store, confirmations);
  return { describe, perform, confirmations };
}

const BOUNDARY = new Date('2026-07-15T00:00:00Z');

describe('the describe states what becomes unknowable', () => {
  it('counts the doomed span and names its coins and dates', async () => {
    const store = new InMemorySignalRecordStore();
    await aRecord(store);
    const { describe } = ceremony(store);

    const result = await describe.execute({ userId: USER, before: BOUNDARY });
    expect(result.kind).toBe('proposal');
    if (result.kind !== 'proposal') return;
    expect(result.proposal.preview).toMatchObject({ runs: 1, captures: 1, failures: 1, readings: 1 });
    expect(result.proposal.consequence).toContain('BTC, ETH');
    expect(result.proposal.consequence).toContain('2026-07-01');
    // The permanence, said — not a row count dressed as housekeeping.
    expect(result.proposal.consequence).toContain('can ever be re-recorded');
  });

  it('describes and describes again without deleting anything', async () => {
    const store = new InMemorySignalRecordStore();
    await aRecord(store);
    const { describe } = ceremony(store);

    await describe.execute({ userId: USER, before: BOUNDARY });
    await describe.execute({ userId: USER, before: BOUNDARY });
    expect(store.runs).toHaveLength(2);
    expect(store.captures).toHaveLength(2);
    expect(store.failures).toHaveLength(1);
  });

  it('refuses to mint agreement to nothing', async () => {
    const store = new InMemorySignalRecordStore();
    await aRecord(store);
    const { describe, confirmations } = ceremony(store);

    const result = await describe.execute({ userId: USER, before: new Date('2026-06-01T00:00:00Z') });
    expect(result.kind).toBe('nothing-to-trim');
    expect(confirmations.tokens.size).toBe(0);
  });
});

describe('the perform spends the confirmation or does nothing', () => {
  it('trims exactly the described span, and reports it', async () => {
    const store = new InMemorySignalRecordStore();
    const { late } = await aRecord(store);
    const { describe, perform } = ceremony(store);

    const described = await describe.execute({ userId: USER, before: BOUNDARY });
    if (described.kind !== 'proposal') throw new Error('expected a proposal');
    const result = await perform.execute({
      userId: USER,
      before: BOUNDARY,
      describedRuns: described.proposal.preview.runs,
      confirmationToken: described.proposal.confirmationToken,
    });

    expect(result).toMatchObject({ kind: 'trimmed', outcome: { runs: 1, captures: 1, failures: 1, readings: 1 } });
    // The survivors, checked by identity rather than by count alone.
    expect(store.runs.map((r) => r.id)).toEqual([late]);
    expect(store.captures.every((c) => c.runId === late)).toBe(true);
    expect(store.failures).toHaveLength(0);
  });

  it('refuses without a confirmation and deletes nothing', async () => {
    const store = new InMemorySignalRecordStore();
    await aRecord(store);
    const { perform } = ceremony(store);

    const result = await perform.execute({
      userId: USER,
      before: BOUNDARY,
      describedRuns: 1,
      confirmationToken: 'never-minted',
    });
    expect(result.kind).toBe('refused');
    expect(store.runs).toHaveLength(2);
  });

  it('refuses a token minted for a different extent — the mismatch is the protection', async () => {
    const store = new InMemorySignalRecordStore();
    await aRecord(store);
    const { describe, perform } = ceremony(store);

    const described = await describe.execute({ userId: USER, before: BOUNDARY });
    if (described.kind !== 'proposal') throw new Error('expected a proposal');
    // The record changed between describe and perform: agreement to "1 run
    // goes" must not authorise a trim that would take two.
    const result = await perform.execute({
      userId: USER,
      before: BOUNDARY,
      describedRuns: described.proposal.preview.runs + 1,
      confirmationToken: described.proposal.confirmationToken,
    });
    expect(result.kind).toBe('refused');
    if (result.kind === 'refused') expect(result.cause).toBe('mismatched');
    expect(store.runs).toHaveLength(2);
  });

  it('spends the token once', async () => {
    const store = new InMemorySignalRecordStore();
    await aRecord(store);
    const { describe, perform } = ceremony(store);

    const described = await describe.execute({ userId: USER, before: BOUNDARY });
    if (described.kind !== 'proposal') throw new Error('expected a proposal');
    const req = {
      userId: USER,
      before: BOUNDARY,
      describedRuns: described.proposal.preview.runs,
      confirmationToken: described.proposal.confirmationToken,
    };
    await perform.execute(req);
    const again = await perform.execute(req);
    expect(again.kind).toBe('refused');
    if (again.kind === 'refused') expect(again.cause).toBe('already-used');
  });

  it('reaches no other account’s rows', async () => {
    const store = new InMemorySignalRecordStore();
    await aRecord(store);
    const theirs = await store.recordRun({
      userId: 'someone-else',
      startedAt: new Date('2026-07-01T05:00:00Z'),
      platformVersion: null,
      provenance: { kind: 'named', coins: ['BTC'], interval: '1h' },
    });
    const { describe, perform } = ceremony(store);

    const described = await describe.execute({ userId: USER, before: BOUNDARY });
    if (described.kind !== 'proposal') throw new Error('expected a proposal');
    // Their older run is not even counted…
    expect(described.proposal.preview.runs).toBe(1);
    await perform.execute({
      userId: USER,
      before: BOUNDARY,
      describedRuns: 1,
      confirmationToken: described.proposal.confirmationToken,
    });
    // …and survives the trim.
    expect(store.runs.some((r) => r.id === theirs)).toBe(true);
  });
});

describe('the target binds the values', () => {
  it('is the boundary and the extent, not the verb alone', () => {
    const a = confirmationTarget.signalRecordTrim(USER, BOUNDARY, 1);
    expect(a).toContain(USER);
    expect(a).toContain(BOUNDARY.toISOString());
    expect(a).not.toBe(confirmationTarget.signalRecordTrim(USER, BOUNDARY, 2));
    expect(a).not.toBe(confirmationTarget.signalRecordTrim(USER, new Date('2026-07-16T00:00:00Z'), 1));
    expect(TRIM_TOOL).toContain('trim');
  });
});
