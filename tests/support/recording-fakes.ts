import type {
  CaptureProvenance,
  CaptureRun,
  FailedCapture,
  SignalCapture,
  SignalReading,
} from '@/domain/recording/capture.js';
import type { CoinSignalPreviewResult, MarketPort } from '@/ports/market.js';
import type { CoinRecord, RecordedSeries, SignalRecordStore } from '@/ports/signal-record.js';

/**
 * The recorder's two ports, faked for the command and query tests.
 *
 * The market fake is scripted per ticker — a test states exactly what the
 * platform will say, including saying nothing. The store fake holds real
 * arrays and enforces nothing, so a test asserting through it must assert on
 * what was *stored*, not on the absence of an error (the FakeAgentsPort
 * lesson: a fake that records without checking proves nothing by not
 * throwing).
 */

/** A payload in the exact shape observed live at v11.0.0. */
export function aPreviewPayload(
  over: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    coinTicker: 'BTC',
    coinName: 'Bitcoin',
    coinImageUrl: 'https://example/btc.png',
    currentPrice: 116423.5,
    priceChangePercent: -0.42,
    dominantBias: 'BEARISH',
    aggregateScorePercent: 41,
    hasConflictingSignals: true,
    isAgentWeighted: false,
    comparison: [
      {
        category: 'majors',
        correlationToTarget: 0.87,
        momentumState: 'cooling',
        priceChange1h: -0.1,
        priceChange24h: -1.2,
        relationship: 'correlated',
        ticker: 'ETH',
        trendBias1h: 'BEARISH',
      },
    ],
    allEvaluatedSignals: [
      {
        bias: 'NEUTRAL',
        details: 'RSI(14) at 38.1 — not oversold (threshold 30)',
        direction: 'NONE',
        effectiveAllocation: 1,
        id: 'rsi_oversold',
        indicatorValues: { rsi14: 38.1 },
        isPrimary: false,
        module: 'RSI',
        required: false,
        score: 0,
        scorePercent: 0,
        triggered: false,
      },
      {
        bias: 'BEARISH',
        details: 'MACD crossed below signal on the 4h',
        direction: 'SHORT',
        effectiveAllocation: 2,
        id: 'macd_bear_cross',
        indicatorValues: { macd: -12.4, signal: -8.1 },
        isPrimary: true,
        module: 'MACD',
        required: false,
        score: 55,
        scorePercent: 55,
        triggered: true,
      },
    ],
    ...over,
  };
}

/**
 * A market that answers exactly as scripted, per ticker.
 *
 * `calls` records every preview request so a test can assert what was sent —
 * in particular that no `agentId` ever could be, since the port has no way
 * to express one.
 */
export class ScriptedMarket implements MarketPort {
  readonly calls: { ticker: string; interval: string }[] = [];
  private version: string | null = null;

  constructor(
    private readonly script: Record<
      string,
      CoinSignalPreviewResult | (() => CoinSignalPreviewResult)
    > = {},
  ) {}

  saysVersion(v: string | null): this {
    this.version = v;
    return this;
  }

  async coinSignalPreview(params: {
    userId: string;
    accessToken: string;
    ticker: string;
    interval: string;
  }): Promise<CoinSignalPreviewResult> {
    this.calls.push({ ticker: params.ticker, interval: params.interval });
    const entry = this.script[params.ticker];
    if (entry === undefined) {
      return {
        kind: 'unreadable',
        reason: `the test scripted nothing for ${params.ticker}`,
        cause: 'unreachable',
      };
    }
    return typeof entry === 'function' ? entry() : entry;
  }

  async platformVersion(): Promise<string | null> {
    return this.version;
  }

  async topRankedCoins(): Promise<never> {
    throw new Error('the recorder never reads the ranked list');
  }

  async rankingVocabulary(): Promise<never> {
    throw new Error('the recorder never reads the ranking vocabulary');
  }
}

type StoredCapture = SignalCapture & { raw: Readonly<Record<string, unknown>> };
type StoredFailure = FailedCapture & { raw: Readonly<Record<string, unknown>> | null };

/** The store, in memory, with the same account scoping the real one has. */
export class InMemorySignalRecordStore implements SignalRecordStore {
  readonly runs: CaptureRun[] = [];
  readonly captures: StoredCapture[] = [];
  readonly failures: StoredFailure[] = [];
  private n = 0;
  /** Set to make every method throw, the way a dead database would. */
  broken: string | null = null;

  private id(prefix: string): string {
    return `${prefix}-${++this.n}`;
  }

  private check(): void {
    if (this.broken !== null) throw new Error(this.broken);
  }

  async recordRun(run: {
    userId: string;
    startedAt: Date;
    platformVersion: string | null;
    provenance: CaptureProvenance;
  }): Promise<string> {
    this.check();
    const id = this.id('run');
    this.runs.push({ id, ...run });
    return id;
  }

  async appendCapture(
    capture: Omit<StoredCapture, 'id' | 'readings'> & { readings: readonly SignalReading[] },
  ): Promise<string> {
    this.check();
    const id = this.id('cap');
    this.captures.push({ ...capture, id });
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
    this.check();
    const id = this.id('fail');
    this.failures.push({ ...failure, id, raw: failure.raw ?? null });
    return id;
  }

  async history(params: {
    userId: string;
    coinTicker: string;
    interval?: string | undefined;
    limit?: number | undefined;
  }): Promise<CoinRecord> {
    this.check();
    const runOf = (runId: string): CaptureRun => {
      const run = this.runs.find((r) => r.id === runId);
      if (!run) throw new Error(`no run ${runId}`);
      return run;
    };
    const matches = (c: { userId: string; coinTicker: string; interval: string }): boolean =>
      c.userId === params.userId &&
      c.coinTicker === params.coinTicker &&
      (params.interval === undefined || c.interval === params.interval);
    const newestFirst = (a: Date, b: Date): number => b.getTime() - a.getTime();
    return {
      captures: this.captures
        .filter(matches)
        .sort((a, b) => newestFirst(a.capturedAt, b.capturedAt))
        .slice(0, params.limit ?? 50)
        .map((c) => ({ ...c, run: runOf(c.runId) })),
      failures: this.failures
        .filter(matches)
        .sort((a, b) => newestFirst(a.attemptedAt, b.attemptedAt))
        .slice(0, params.limit ?? 50)
        .map((f) => ({ ...f, run: runOf(f.runId) })),
    };
  }

  async recordedSeries(userId: string): Promise<RecordedSeries> {
    this.check();
    const key = (c: { coinTicker: string; interval: string }): string =>
      `${c.coinTicker} ${c.interval}`;
    const series = new Map<
      string,
      { coinTicker: string; interval: string; capturedAt: Date[]; failedAttemptCount: number }
    >();
    for (const c of this.captures.filter((x) => x.userId === userId)) {
      const entry = series.get(key(c)) ?? {
        coinTicker: c.coinTicker,
        interval: c.interval,
        capturedAt: [],
        failedAttemptCount: 0,
      };
      entry.capturedAt.push(c.capturedAt);
      series.set(key(c), entry);
    }
    for (const f of this.failures.filter((x) => x.userId === userId)) {
      const entry = series.get(key(f)) ?? {
        coinTicker: f.coinTicker,
        interval: f.interval,
        capturedAt: [],
        failedAttemptCount: 0,
      };
      entry.failedAttemptCount += 1;
      series.set(key(f), entry);
    }
    return {
      series: [...series.values()].map((s) => ({
        ...s,
        capturedAt: [...s.capturedAt].sort((a, b) => a.getTime() - b.getTime()),
      })),
      coveredNothing: this.runs
        .filter((r) => r.userId === userId && r.provenance.kind === 'nothing')
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()),
    };
  }

  async rawAnswer(params: {
    userId: string;
    captureId: string;
  }): Promise<Readonly<Record<string, unknown>> | null> {
    this.check();
    const capture = this.captures.find(
      (c) => c.id === params.captureId && c.userId === params.userId,
    );
    return capture?.raw ?? null;
  }
}
