/**
 * The forward record of what the platform's signals said.
 *
 * BattleGrid serves current signal readings only — `get_coin_signal_preview`
 * answers for *now*, candles cap at a hundred, and no read serves yesterday's
 * signals. So evidence about signal behavior exists only from the day a
 * recorder starts, and a capture missed is history nobody can re-fetch. These
 * types carry one capture run: which coins were asked about and why, what
 * every signal said per coin, and what could not be read — kept apart, because
 * a failed read rendered as a quiet market is the lie this capability exists
 * to never tell.
 */

/**
 * One signal's reading, as the platform evaluated it at one capture.
 *
 * The same nullability discipline as `ConsultedSignal` (the scorecard's
 * mapping of these very rows): `signalId` is required because an
 * unattributable reading cannot be looked up, everything else is kept as the
 * platform stated it — null when it did not. The raw answer stored beside
 * the readings is what settles any doubt a null leaves.
 */
export interface SignalReading {
  /** The platform's own signal id, e.g. `rsi_oversold`. */
  readonly signalId: string;
  readonly module: string | null;
  readonly triggered: boolean;
  readonly bias: string | null;
  readonly direction: string | null;
  readonly score: number | null;
  readonly scorePercent: number | null;
  readonly effectiveAllocation: number | null;
  readonly isPrimary: boolean;
  readonly required: boolean;
  /** The platform's own sentence about what it read. */
  readonly details: string | null;
  /**
   * Raw indicator values under the platform's own keys (`rsi14: 38.1`).
   * `unknown` values on purpose: the platform declares an open object, and
   * narrowing it here would drop whatever a future signal publishes.
   */
  readonly indicatorValues: Readonly<Record<string, unknown>>;
}

/**
 * Which coins a run covered, and why — because the same verdict means
 * different things depending on who chose the subject. A record of coins the
 * operator named and a record of whatever happened to be deployed that day
 * are different kinds of evidence, and collapsing them would quietly change
 * what every later analysis is analysing.
 */
export type CaptureProvenance =
  | { readonly kind: 'named'; readonly interval: string; readonly coins: readonly string[] }
  | {
      readonly kind: 'deployments';
      readonly pairs: readonly DeployedPair[];
    }
  /**
   * Nothing could be covered. Recorded rather than skipped, so the record
   * shows an attempt that found no subject — distinct from a scheduler that
   * never fired, and never rendered as a market with no signals.
   */
  | { readonly kind: 'nothing'; readonly reason: string };

/** A coin at the timeframe its radar deployment watches. */
export interface DeployedPair {
  readonly coinTicker: string;
  readonly timeframe: string;
}

/** One invocation of the recorder: the header every capture row hangs off. */
export interface CaptureRun {
  readonly id: string;
  readonly userId: string;
  readonly startedAt: Date;
  /**
   * The BattleGrid server version that answered this run's handshake, or null
   * when it did not say. Nullable on purpose: the platform redeploys often and
   * changes semantics without changing its tool count, so a record that cannot
   * name its generation cannot be trusted across one — and a generation the
   * handshake did not state must read as unknown, never be guessed.
   */
  readonly platformVersion: string | null;
  readonly provenance: CaptureProvenance;
}

/** One coin's successful capture: what every signal said, and the price then. */
export interface SignalCapture {
  readonly id: string;
  readonly runId: string;
  readonly userId: string;
  readonly coinTicker: string;
  readonly interval: string;
  readonly capturedAt: Date;
  readonly currentPrice: number;
  readonly priceChangePercent: number;
  readonly dominantBias: string;
  readonly aggregateScorePercent: number;
  readonly hasConflictingSignals: boolean;
  readonly readings: readonly SignalReading[];
}

/**
 * One coin's read that produced nothing, kept as a fact with its reason.
 * A gap with an explanation is evidence; a silent absence is indistinguishable
 * from a recorder that never ran.
 */
export interface FailedCapture {
  readonly id: string;
  readonly runId: string;
  readonly userId: string;
  readonly coinTicker: string;
  readonly interval: string;
  readonly attemptedAt: Date;
  readonly reason: string;
}
