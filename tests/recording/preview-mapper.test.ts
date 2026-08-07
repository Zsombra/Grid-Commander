import { describe, expect, it } from 'vitest';
import {
  mapSignalPreview,
  mapSignalReading,
  UnmappablePreviewError,
} from '@/infrastructure/battlegrid/signal-preview-mapper.js';
import { aPreviewPayload } from '../support/recording-fakes.js';

/**
 * The mapper, against the shape observed live at v11.0.0.
 *
 * The standing lesson this suite exists for: two of the nine historical data
 * bugs were the same mistake — a mapper keeping fewer fields than the payload
 * carried. So the first test counts the observed reading fields and asserts
 * every one lands, and the raw answer is asserted to travel whole.
 */

describe('every observed reading field is mapped', () => {
  it('keeps all twelve fields of an evaluated-signal row', () => {
    const preview = mapSignalPreview(aPreviewPayload());
    const fired = preview.readings.find((r) => r.signalId === 'macd_bear_cross');
    expect(fired).toBeDefined();
    expect(fired).toEqual({
      signalId: 'macd_bear_cross',
      module: 'MACD',
      triggered: true,
      bias: 'BEARISH',
      direction: 'SHORT',
      score: 55,
      scorePercent: 55,
      effectiveAllocation: 2,
      isPrimary: true,
      required: false,
      details: 'MACD crossed below signal on the 4h',
      indicatorValues: { macd: -12.4, signal: -8.1 },
    });
  });

  it('keeps the header the record depends on, price included', () => {
    const preview = mapSignalPreview(aPreviewPayload());
    expect(preview.coinTicker).toBe('BTC');
    expect(preview.currentPrice).toBe(116423.5);
    expect(preview.priceChangePercent).toBe(-0.42);
    expect(preview.dominantBias).toBe('BEARISH');
    expect(preview.aggregateScorePercent).toBe(41);
    expect(preview.hasConflictingSignals).toBe(true);
  });

  it('carries the raw answer whole, unmapped fields included', () => {
    const payload = aPreviewPayload();
    const preview = mapSignalPreview(payload);
    // `comparison`, `coinName`, `coinImageUrl`, `isAgentWeighted` have no
    // domain field on purpose; the record still keeps them.
    expect(preview.raw).toBe(payload);
    expect(preview.raw['comparison']).toEqual(payload['comparison']);
    expect(preview.raw['isAgentWeighted']).toBe(false);
  });

  it('keeps untriggered rows — they are most of the payload', () => {
    const preview = mapSignalPreview(aPreviewPayload());
    expect(preview.readings.map((r) => r.signalId).sort()).toEqual([
      'macd_bear_cross',
      'rsi_oversold',
    ]);
    expect(preview.readings.find((r) => r.signalId === 'rsi_oversold')?.triggered).toBe(false);
  });
});

describe('what the platform did not say stays unsaid', () => {
  it('maps an absent per-signal field to null, never a default', () => {
    const reading = mapSignalReading({ id: 'lonely_signal', triggered: true });
    expect(reading).toEqual({
      signalId: 'lonely_signal',
      module: null,
      triggered: true,
      bias: null,
      direction: null,
      score: null,
      scorePercent: null,
      effectiveAllocation: null,
      isPrimary: false,
      required: false,
      details: null,
      indicatorValues: {},
    });
  });

  it('drops a row with no id — unattributable evidence cannot be looked up', () => {
    expect(mapSignalReading({ triggered: true, score: 90 })).toBeNull();
  });
});

describe('an answer the record cannot use fails loudly, not partially', () => {
  it.each([
    ['currentPrice', { currentPrice: undefined }],
    ['coinTicker', { coinTicker: undefined }],
    ['dominantBias', { dominantBias: undefined }],
    ['aggregateScorePercent', { aggregateScorePercent: undefined }],
    ['priceChangePercent', { priceChangePercent: undefined }],
  ])('refuses a preview missing %s', (_field, over) => {
    expect(() => mapSignalPreview(aPreviewPayload(over))).toThrow(UnmappablePreviewError);
  });

  it('refuses a preview with no signal rows at all', () => {
    expect(() => mapSignalPreview(aPreviewPayload({ allEvaluatedSignals: [] }))).toThrow(
      UnmappablePreviewError,
    );
  });

  it('refuses a preview whose rows are all unattributable', () => {
    expect(() =>
      mapSignalPreview(aPreviewPayload({ allEvaluatedSignals: [{ triggered: true }] })),
    ).toThrow(UnmappablePreviewError);
  });
});
