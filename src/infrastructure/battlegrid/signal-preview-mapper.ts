import type { SignalReading } from '@/domain/recording/capture.js';
import type { CoinSignalPreview } from '@/ports/market.js';

/**
 * `get_coin_signal_preview`'s answer, mapped for the record.
 *
 * Shape observed live at battlegrid v11.0.0 (2026-08-06, zero drift between
 * declared and returned): header metrics, ~84 `allEvaluatedSignals` rows in
 * the `ConsultedSignal` family shape, and a comparison basket. The basket and
 * the cosmetic fields stay unmapped on purpose — they travel in `raw`, which
 * the recorder stores whole, so nothing here is the last custodian of them.
 *
 * The nullability discipline is `mapConsultedSignal`'s, because these are the
 * same rows read from a different door: `signalId` required (an
 * unattributable reading cannot be looked up), everything else kept as
 * stated, null when the platform did not say.
 */

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const list = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

/** Thrown when the answer cannot honestly be called a preview. */
export class UnmappablePreviewError extends Error {
  constructor(missing: string) {
    super(`the signal preview carried no usable ${missing}`);
    this.name = 'UnmappablePreviewError';
  }
}

export function mapSignalReading(raw: unknown): SignalReading | null {
  const s = obj(raw);
  const signalId = str(s['id']);
  if (signalId === null) return null;
  return {
    signalId,
    module: str(s['module']),
    triggered: s['triggered'] === true,
    bias: str(s['bias']),
    direction: str(s['direction']),
    score: num(s['score']),
    scorePercent: num(s['scorePercent']),
    effectiveAllocation: num(s['effectiveAllocation']),
    isPrimary: s['isPrimary'] === true,
    required: s['required'] === true,
    details: str(s['details']),
    indicatorValues: obj(s['indicatorValues']),
  };
}

/**
 * The whole answer. Throws `UnmappablePreviewError` when a header fact the
 * record cannot do without is missing — the price a reading was taken at, the
 * signal list itself — so the caller records a failed capture *with the raw
 * answer attached* instead of a capture that quietly means less than it says.
 */
export function mapSignalPreview(payload: Readonly<Record<string, unknown>>): CoinSignalPreview {
  const coinTicker = str(payload['coinTicker']);
  const currentPrice = num(payload['currentPrice']);
  const priceChangePercent = num(payload['priceChangePercent']);
  const dominantBias = str(payload['dominantBias']);
  const aggregateScorePercent = num(payload['aggregateScorePercent']);

  if (coinTicker === null) throw new UnmappablePreviewError('coinTicker');
  // A reading without its price is a signal record that cannot ever say what
  // the market did next — the one derivation the whole capability promises.
  if (currentPrice === null) throw new UnmappablePreviewError('currentPrice');
  if (priceChangePercent === null) throw new UnmappablePreviewError('priceChangePercent');
  if (dominantBias === null) throw new UnmappablePreviewError('dominantBias');
  if (aggregateScorePercent === null) throw new UnmappablePreviewError('aggregateScorePercent');

  const rows = list(payload['allEvaluatedSignals']);
  if (rows.length === 0) throw new UnmappablePreviewError('allEvaluatedSignals');

  const readings = rows
    .map(mapSignalReading)
    .filter((r): r is SignalReading => r !== null);
  if (readings.length === 0) throw new UnmappablePreviewError('attributable signal rows');

  return {
    coinTicker,
    currentPrice,
    priceChangePercent,
    dominantBias,
    aggregateScorePercent,
    hasConflictingSignals: payload['hasConflictingSignals'] === true,
    readings,
    raw: payload,
  };
}
