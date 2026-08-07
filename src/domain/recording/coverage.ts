/**
 * What the record can honestly say about its own continuity.
 *
 * The rule this file exists to hold: the record must never present itself as
 * more continuous than it is. Coverage is derived from the capture rows at
 * read time — never stored as a flag that could disagree with them — and a
 * gap is defined in exactly one place, here.
 */

/** A hole in the recorded data, stated with its span. */
export interface CoverageGap {
  readonly fromCapturedAt: Date;
  readonly toCapturedAt: Date | null;
  readonly spanSeconds: number;
}

/** One coin+interval series' coverage, derived from its rows. */
export interface SeriesCoverage {
  readonly coinTicker: string;
  readonly interval: string;
  readonly firstCapturedAt: Date;
  readonly lastCapturedAt: Date;
  readonly captureCount: number;
  /**
   * Failed attempts on this series, counted apart from captures. They explain
   * a data gap (the recorder ran and the platform refused) without filling it
   * — the readings are still missing, so the gap is still stated.
   */
  readonly failedAttemptCount: number;
  readonly gaps: readonly CoverageGap[];
}

/**
 * A spacing counts as a gap when it exceeds this multiple of the series'
 * median spacing. Relative rather than absolute so an hourly recorder and a
 * daily one both get honest gaps without configuration; the median rather
 * than the mean so one long outage does not redefine the cadence it violated.
 */
const GAP_FACTOR = 2;

/**
 * Derive one series' coverage from its capture times.
 *
 * `capturedAt` must belong to recorded captures only — failed attempts are
 * counted, not interleaved, because an attempt that produced no readings
 * does not make the data any less absent (decision log DL-007).
 *
 * With fewer than two captures there is no cadence to violate, so there are
 * no gaps — a single capture is total coverage of one moment, and claiming a
 * gap after it would be inventing a schedule nobody stated. The trailing
 * open interval (last capture → now) is judged by the same bound, so a
 * recorder that quietly died shows up without waiting for its next success.
 */
export function deriveSeriesCoverage(params: {
  coinTicker: string;
  interval: string;
  capturedAt: readonly Date[];
  failedAttemptCount: number;
  now: Date;
}): SeriesCoverage {
  const times = [...params.capturedAt].sort((a, b) => a.getTime() - b.getTime());
  const first = times[0];
  const last = times[times.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error('deriveSeriesCoverage requires at least one capture; the caller reports an empty series itself');
  }

  const spacings: number[] = [];
  for (let i = 1; i < times.length; i++) {
    // Non-null by construction: i ranges over [1, length).
    spacings.push((times[i] as Date).getTime() - (times[i - 1] as Date).getTime());
  }

  const gaps: CoverageGap[] = [];
  const medianMs = median(spacings);
  if (medianMs !== null && medianMs > 0) {
    const bound = medianMs * GAP_FACTOR;
    for (let i = 1; i < times.length; i++) {
      const fromT = times[i - 1] as Date;
      const toT = times[i] as Date;
      const span = toT.getTime() - fromT.getTime();
      if (span > bound) {
        gaps.push({
          fromCapturedAt: fromT,
          toCapturedAt: toT,
          spanSeconds: Math.floor(span / 1000),
        });
      }
    }
    const trailing = params.now.getTime() - last.getTime();
    if (trailing > bound) {
      gaps.push({
        fromCapturedAt: last,
        toCapturedAt: null,
        spanSeconds: Math.floor(trailing / 1000),
      });
    }
  }

  return {
    coinTicker: params.coinTicker,
    interval: params.interval,
    firstCapturedAt: first,
    lastCapturedAt: last,
    captureCount: times.length,
    failedAttemptCount: params.failedAttemptCount,
    gaps,
  };
}

/** The middle spacing, or null when there are no spacings to take it from. */
function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}
