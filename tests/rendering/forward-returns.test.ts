import { describe, expect, it, vi } from 'vitest';
import { mapSignalPreview } from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import { aPreviewPayload, InMemorySignalRecordStore } from '../support/recording-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The analysis page's four arms, as a person reads them — and the two
 * spec-pinned honesty rules at the surface: every figure carries its pair
 * count, and the depth line renders with its exclusions.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

import AnalysisPage from '../../app/(app)/recorder/analysis/page.js';

const hour = (n: number): Date => new Date(Date.UTC(2026, 7, 1, n));

async function page(store: InMemorySignalRecordStore) {
  current = actingWith({ signalRecord: store }) as typeof current;
  const resolved = await rendered(await AnalysisPage());
  return { ...resolved, text: resolved.text.replace(/\s+/g, ' ') };
}

async function seeded(
  rows: readonly { atHour: number; price: number }[],
): Promise<InMemorySignalRecordStore> {
  const store = new InMemorySignalRecordStore();
  const runId = await store.recordRun({
    userId: 'owner',
    startedAt: hour(0),
    platformVersion: 'v18.2.0',
    provenance: { kind: 'named', interval: '1h', coins: ['BTC'] },
  });
  const preview = mapSignalPreview(aPreviewPayload());
  for (const row of rows) {
    await store.appendCapture({
      runId,
      userId: 'owner',
      coinTicker: 'BTC',
      interval: '1h',
      capturedAt: hour(row.atHour),
      currentPrice: row.price,
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

describe('the analysis renders with its honesty attached', () => {
  it('leads with the depth line and puts a pair count beside the baseline', async () => {
    const r = await page(
      await seeded([
        { atHour: 0, price: 100 },
        { atHour: 1, price: 101 },
        { atHour: 2, price: 102 },
      ]),
    );
    expect(r.text).toContain('These figures stand on 2 pairs');
    expect(r.text).toContain('2 pairs: mean');
    expect(r.text).toContain('read against this, not against zero');
  });

  it('states pairs excluded over gaps', async () => {
    // Hourly, then a four-hour hole, then hourly again: one excluded pair.
    const r = await page(
      await seeded([
        { atHour: 0, price: 100 },
        { atHour: 1, price: 101 },
        { atHour: 2, price: 102 },
        { atHour: 6, price: 103 },
        { atHour: 7, price: 104 },
      ]),
    );
    expect(r.text).toContain('1 pair excluded over recording gaps');
    expect(r.text).toContain('not a return over one cadence step');
  });

  it('says too shallow as a fact about depth, not an error', async () => {
    const r = await page(await seeded([{ atHour: 0, price: 100 }]));
    expect(r.text).toContain('not yet deep enough to pair');
    expect(r.text).toContain('1 capture across 1 series');
    expect(r.text).not.toContain('could not be read');
  });

  it('keeps never-recorded and unreadable as their own sentences', async () => {
    const empty = await page(new InMemorySignalRecordStore());
    expect(empty.text).toContain('Recording has not started');
    expect(empty.text).toContain('grid-commander-record');

    const broken = new InMemorySignalRecordStore();
    broken.recordedSeries = async () => {
      throw new Error('the record store is unreachable');
    };
    const r = await page(broken);
    expect(r.text).toContain('The record could not be read.');
    expect(r.text).toContain('does not mean the record is empty');
  });
});
