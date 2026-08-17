import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  CaptureProvenance,
  CaptureRun,
  DeployedPair,
  FailedCapture,
  SignalCapture,
  SignalReading,
} from '@/domain/recording/capture.js';
import type { CoinRecord, RecordedSeries, SignalRecordStore, TrimOutcome, TrimPreview } from '@/ports/signal-record.js';
import { signalCaptureRuns, signalCaptures, signalReadings } from '../schema/index.js';

type Db = NodePgDatabase<Record<string, never>>;

/** How many rows one history read returns when the caller does not say. */
const DEFAULT_HISTORY_LIMIT = 50;

/**
 * The signal record, in PostgreSQL.
 *
 * Ownership is in the WHERE on every read — the same discipline the proposal
 * store records. A capture and its readings and raw answer land in one
 * transaction: a capture without its readings would read as a market where
 * nothing evaluated, which is precisely the lie the capability forbids.
 */
export class DrizzleSignalRecordStore implements SignalRecordStore {
  constructor(
    private readonly db: Db,
    private readonly newId: () => string,
  ) {}

  async recordRun(run: {
    userId: string;
    startedAt: Date;
    platformVersion: string | null;
    provenance: CaptureProvenance;
  }): Promise<string> {
    const id = this.newId();
    const p = run.provenance;
    await this.db.insert(signalCaptureRuns).values({
      id,
      userId: run.userId,
      startedAt: run.startedAt,
      platformVersion: run.platformVersion,
      provenanceKind: p.kind,
      namedInterval: p.kind === 'named' ? p.interval : null,
      subjects: p.kind === 'named' ? p.coins : p.kind === 'deployments' ? p.pairs : [],
      reason: p.kind === 'nothing' ? p.reason : null,
    });
    return id;
  }

  async appendCapture(capture: {
    runId: string;
    userId: string;
    coinTicker: string;
    interval: string;
    capturedAt: Date;
    currentPrice: number;
    priceChangePercent: number;
    dominantBias: string;
    aggregateScorePercent: number;
    hasConflictingSignals: boolean;
    readings: readonly SignalReading[];
    raw: Readonly<Record<string, unknown>>;
  }): Promise<string> {
    const id = this.newId();
    await this.db.transaction(async (tx) => {
      await tx.insert(signalCaptures).values({
        id,
        runId: capture.runId,
        userId: capture.userId,
        coinTicker: capture.coinTicker,
        interval: capture.interval,
        capturedAt: capture.capturedAt,
        outcome: 'recorded',
        failureReason: null,
        currentPrice: capture.currentPrice,
        priceChangePercent: capture.priceChangePercent,
        dominantBias: capture.dominantBias,
        aggregateScorePercent: capture.aggregateScorePercent,
        hasConflictingSignals: capture.hasConflictingSignals,
        raw: capture.raw,
      });
      if (capture.readings.length > 0) {
        await tx.insert(signalReadings).values(
          capture.readings.map((r) => ({
            id: this.newId(),
            captureId: id,
            userId: capture.userId,
            signalId: r.signalId,
            module: r.module,
            triggered: r.triggered,
            bias: r.bias,
            direction: r.direction,
            score: r.score,
            scorePercent: r.scorePercent,
            effectiveAllocation: r.effectiveAllocation,
            isPrimary: r.isPrimary,
            required: r.required,
            details: r.details,
            indicatorValues: r.indicatorValues,
          })),
        );
      }
    });
    return id;
  }

  async appendFailure(failure: {
    runId: string;
    userId: string;
    coinTicker: string;
    interval: string;
    attemptedAt: Date;
    reason: string;
    raw?: Readonly<Record<string, unknown>> | undefined;
  }): Promise<string> {
    const id = this.newId();
    await this.db.insert(signalCaptures).values({
      id,
      runId: failure.runId,
      userId: failure.userId,
      coinTicker: failure.coinTicker,
      interval: failure.interval,
      capturedAt: failure.attemptedAt,
      outcome: 'failed',
      failureReason: failure.reason,
      currentPrice: null,
      priceChangePercent: null,
      dominantBias: null,
      aggregateScorePercent: null,
      hasConflictingSignals: null,
      // An answer that arrived but could not be read is still kept.
      raw: failure.raw ?? null,
    });
    return id;
  }

  async history(params: {
    userId: string;
    coinTicker: string;
    interval?: string | undefined;
    limit?: number | undefined;
  }): Promise<CoinRecord> {
    const conditions = [
      eq(signalCaptures.userId, params.userId),
      eq(signalCaptures.coinTicker, params.coinTicker),
      ...(params.interval === undefined ? [] : [eq(signalCaptures.interval, params.interval)]),
    ];
    const rows = await this.db
      .select()
      .from(signalCaptures)
      .where(and(...conditions))
      .orderBy(desc(signalCaptures.capturedAt))
      .limit(params.limit ?? DEFAULT_HISTORY_LIMIT);

    const runIds = [...new Set(rows.map((r) => r.runId))];
    const runRows =
      runIds.length === 0
        ? []
        : await this.db
            .select()
            .from(signalCaptureRuns)
            .where(
              and(eq(signalCaptureRuns.userId, params.userId), inArray(signalCaptureRuns.id, runIds)),
            );
    const runs = new Map(runRows.map((r) => [r.id, toRun(r)]));

    const recordedIds = rows.filter((r) => r.outcome === 'recorded').map((r) => r.id);
    const readingRows =
      recordedIds.length === 0
        ? []
        : await this.db
            .select()
            .from(signalReadings)
            .where(
              and(
                eq(signalReadings.userId, params.userId),
                inArray(signalReadings.captureId, recordedIds),
              ),
            );
    const readingsByCapture = new Map<string, SignalReading[]>();
    for (const r of readingRows) {
      const list = readingsByCapture.get(r.captureId) ?? [];
      list.push(toReading(r));
      readingsByCapture.set(r.captureId, list);
    }

    const captures: (SignalCapture & { run: CaptureRun })[] = [];
    const failures: (FailedCapture & { run: CaptureRun })[] = [];
    for (const row of rows) {
      const run = runs.get(row.runId);
      // Impossible under the FK; if it ever happens the row is unreadable and
      // saying so beats rendering history with an invented run.
      if (run === undefined) throw new Error(`capture ${row.id} references a run this account does not hold`);
      if (row.outcome === 'recorded') {
        captures.push({ ...toCapture(row), readings: readingsByCapture.get(row.id) ?? [], run });
      } else {
        failures.push({
          id: row.id,
          runId: row.runId,
          userId: row.userId,
          coinTicker: row.coinTicker,
          interval: row.interval,
          attemptedAt: row.capturedAt,
          reason: row.failureReason ?? 'no reason was recorded',
          run,
        });
      }
    }
    return { captures, failures };
  }

  async recordedSeries(userId: string): Promise<RecordedSeries> {
    const rows = await this.db
      .select({
        coinTicker: signalCaptures.coinTicker,
        interval: signalCaptures.interval,
        capturedAt: signalCaptures.capturedAt,
        outcome: signalCaptures.outcome,
      })
      .from(signalCaptures)
      .where(eq(signalCaptures.userId, userId))
      .orderBy(signalCaptures.capturedAt);

    const bySeries = new Map<string, { coinTicker: string; interval: string; capturedAt: Date[]; failedAttemptCount: number }>();
    for (const row of rows) {
      const key = `${row.coinTicker} ${row.interval}`;
      const entry =
        bySeries.get(key) ??
        { coinTicker: row.coinTicker, interval: row.interval, capturedAt: [], failedAttemptCount: 0 };
      if (row.outcome === 'recorded') entry.capturedAt.push(row.capturedAt);
      else entry.failedAttemptCount += 1;
      bySeries.set(key, entry);
    }

    const nothingRows = await this.db
      .select()
      .from(signalCaptureRuns)
      .where(
        and(eq(signalCaptureRuns.userId, userId), eq(signalCaptureRuns.provenanceKind, 'nothing')),
      )
      .orderBy(desc(signalCaptureRuns.startedAt));

    return {
      series: [...bySeries.values()],
      coveredNothing: nothingRows.map(toRun),
    };
  }

  async rawAnswer(params: {
    userId: string;
    captureId: string;
  }): Promise<Readonly<Record<string, unknown>> | null> {
    const [row] = await this.db
      .select({ raw: signalCaptures.raw })
      .from(signalCaptures)
      .where(and(eq(signalCaptures.id, params.captureId), eq(signalCaptures.userId, params.userId)));
    return row?.raw ?? null;
  }

  async trimPreview(params: { userId: string; before: Date }): Promise<TrimPreview> {
    const runs = await this.doomedRuns(this.db, params);
    if (runs.length === 0) {
      return { runs: 0, captures: 0, failures: 0, readings: 0, coinTickers: [], oldest: null, newest: null };
    }
    const runIds = runs.map((r) => r.id);
    const rows = await this.db
      .select({
        id: signalCaptures.id,
        outcome: signalCaptures.outcome,
        coinTicker: signalCaptures.coinTicker,
        capturedAt: signalCaptures.capturedAt,
      })
      .from(signalCaptures)
      .where(and(eq(signalCaptures.userId, params.userId), inArray(signalCaptures.runId, runIds)));

    const captureIds = rows.map((r) => r.id);
    const readings =
      captureIds.length === 0
        ? []
        : await this.db
            .select({ id: signalReadings.id })
            .from(signalReadings)
            .where(
              and(eq(signalReadings.userId, params.userId), inArray(signalReadings.captureId, captureIds)),
            );

    const at = rows.map((r) => r.capturedAt.getTime());
    return {
      runs: runs.length,
      captures: rows.filter((r) => r.outcome === 'recorded').length,
      failures: rows.filter((r) => r.outcome === 'failed').length,
      readings: readings.length,
      coinTickers: [...new Set(rows.map((r) => r.coinTicker))].sort(),
      oldest: at.length > 0 ? new Date(Math.min(...at)) : null,
      newest: at.length > 0 ? new Date(Math.max(...at)) : null,
    };
  }

  async trim(params: { userId: string; before: Date }): Promise<TrimOutcome> {
    return this.db.transaction(async (tx) => {
      const runs = await this.doomedRuns(tx, params);
      if (runs.length === 0) return { runs: 0, captures: 0, failures: 0, readings: 0 };
      const runIds = runs.map((r) => r.id);

      const rows = await tx
        .select({ id: signalCaptures.id, outcome: signalCaptures.outcome })
        .from(signalCaptures)
        .where(and(eq(signalCaptures.userId, params.userId), inArray(signalCaptures.runId, runIds)));
      const captureIds = rows.map((r) => r.id);

      // Children before parents — the readings reference captures, the
      // captures reference runs, and nothing here cascades by schema.
      const readings =
        captureIds.length === 0
          ? []
          : await tx
              .delete(signalReadings)
              .where(
                and(
                  eq(signalReadings.userId, params.userId),
                  inArray(signalReadings.captureId, captureIds),
                ),
              )
              .returning({ id: signalReadings.id });
      if (captureIds.length > 0) {
        await tx
          .delete(signalCaptures)
          .where(and(eq(signalCaptures.userId, params.userId), inArray(signalCaptures.id, captureIds)));
      }
      await tx
        .delete(signalCaptureRuns)
        .where(and(eq(signalCaptureRuns.userId, params.userId), inArray(signalCaptureRuns.id, runIds)));

      return {
        runs: runs.length,
        captures: rows.filter((r) => r.outcome === 'recorded').length,
        failures: rows.filter((r) => r.outcome === 'failed').length,
        readings: readings.length,
      };
    });
  }

  /** The runs an age trim takes: started before the boundary, this account's. */
  private doomedRuns(db: Db | Parameters<Parameters<Db['transaction']>[0]>[0], params: { userId: string; before: Date }) {
    return db
      .select({ id: signalCaptureRuns.id })
      .from(signalCaptureRuns)
      .where(and(eq(signalCaptureRuns.userId, params.userId), lt(signalCaptureRuns.startedAt, params.before)));
  }
}

// -- row mapping — shape only, nothing defaulted that masks a gap -----------

function toRun(row: {
  id: string;
  userId: string;
  startedAt: Date;
  platformVersion: string | null;
  provenanceKind: string;
  namedInterval: string | null;
  subjects: readonly unknown[];
  reason: string | null;
}): CaptureRun {
  return {
    id: row.id,
    userId: row.userId,
    startedAt: row.startedAt,
    platformVersion: row.platformVersion,
    provenance: toProvenance(row),
  };
}

/**
 * A provenance kind this product does not read maps to `nothing` with a
 * reason naming what was found — the row stays visible as an attempt rather
 * than being dropped, and nothing invents coins it cannot vouch for.
 */
function toProvenance(row: {
  provenanceKind: string;
  namedInterval: string | null;
  subjects: readonly unknown[];
  reason: string | null;
}): CaptureProvenance {
  if (row.provenanceKind === 'named' && row.namedInterval !== null) {
    return {
      kind: 'named',
      interval: row.namedInterval,
      coins: row.subjects.filter((s): s is string => typeof s === 'string'),
    };
  }
  if (row.provenanceKind === 'deployments') {
    return { kind: 'deployments', pairs: row.subjects.filter(isDeployedPair) };
  }
  if (row.provenanceKind === 'nothing') {
    return { kind: 'nothing', reason: row.reason ?? 'no reason was recorded' };
  }
  return {
    kind: 'nothing',
    reason: `recorded with provenance '${row.provenanceKind}', which this product does not read`,
  };
}

function isDeployedPair(s: unknown): s is DeployedPair {
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof (s as Record<string, unknown>)['coinTicker'] === 'string' &&
    typeof (s as Record<string, unknown>)['timeframe'] === 'string'
  );
}

/** A recorded row missing a metric is unreadable, and says so loudly. */
function toCapture(row: {
  id: string;
  runId: string;
  userId: string;
  coinTicker: string;
  interval: string;
  capturedAt: Date;
  currentPrice: number | null;
  priceChangePercent: number | null;
  dominantBias: string | null;
  aggregateScorePercent: number | null;
  hasConflictingSignals: boolean | null;
}): Omit<SignalCapture, 'readings'> {
  if (
    row.currentPrice === null ||
    row.priceChangePercent === null ||
    row.dominantBias === null ||
    row.aggregateScorePercent === null ||
    row.hasConflictingSignals === null
  ) {
    throw new Error(`capture ${row.id} is recorded but missing its metrics; the record is unreadable`);
  }
  return {
    id: row.id,
    runId: row.runId,
    userId: row.userId,
    coinTicker: row.coinTicker,
    interval: row.interval,
    capturedAt: row.capturedAt,
    currentPrice: row.currentPrice,
    priceChangePercent: row.priceChangePercent,
    dominantBias: row.dominantBias,
    aggregateScorePercent: row.aggregateScorePercent,
    hasConflictingSignals: row.hasConflictingSignals,
  };
}

function toReading(row: {
  signalId: string;
  module: string | null;
  triggered: boolean;
  bias: string | null;
  direction: string | null;
  score: number | null;
  scorePercent: number | null;
  effectiveAllocation: number | null;
  isPrimary: boolean;
  required: boolean;
  details: string | null;
  indicatorValues: Readonly<Record<string, unknown>>;
}): SignalReading {
  return {
    signalId: row.signalId,
    module: row.module,
    triggered: row.triggered,
    bias: row.bias,
    direction: row.direction,
    score: row.score,
    scorePercent: row.scorePercent,
    effectiveAllocation: row.effectiveAllocation,
    isPrimary: row.isPrimary,
    required: row.required,
    details: row.details,
    indicatorValues: row.indicatorValues,
  };
}
