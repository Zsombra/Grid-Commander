import type { CaptureProvenance, DeployedPair } from '@/domain/recording/capture.js';
import type { Clock } from '@/ports/clock.js';
import type { MarketPort } from '@/ports/market.js';
import type { RadarPort } from '@/ports/radar.js';
import type { SignalRecordStore } from '@/ports/signal-record.js';

/**
 * One recorder invocation: capture what every signal says for a set of
 * coins, and record it — including what could not be read.
 *
 * A command, though it writes nothing to BattleGrid: the write is to this
 * product's own store, the way `RecordProposalCommand` writes a proposal.
 * Every platform call it makes is a read, no confirmation is minted or
 * consumed, and the account is the same after a run as before it — decision
 * log DL-004 records why no audit row accompanies that.
 *
 * The load-bearing behavior is per-coin isolation: one coin's refusal
 * becomes a failed-capture row with the platform's reason and the loop
 * continues, because a recorder that drops nine coins for one bad read
 * turns one gap into ten.
 */

export interface CaptureSignalsRequest {
  readonly userId: string;
  readonly accessToken: string;
  /**
   * The coins to capture, with the interval to read them at. Omitted means
   * the account's radar deployments choose — each coin at the timeframe its
   * deployment watches.
   */
  readonly named?: { readonly coins: readonly string[]; readonly interval: string } | undefined;
}

export interface CaptureSignalsResult {
  readonly runId: string;
  readonly provenance: CaptureProvenance;
  readonly platformVersion: string | null;
  readonly recorded: readonly {
    readonly coinTicker: string;
    readonly interval: string;
    readonly captureId: string;
    readonly readingCount: number;
  }[];
  readonly failed: readonly {
    readonly coinTicker: string;
    readonly interval: string;
    readonly reason: string;
  }[];
}

export class CaptureSignalsCommand {
  constructor(
    private readonly market: MarketPort,
    private readonly radar: RadarPort,
    private readonly store: SignalRecordStore,
    private readonly clock: Clock,
  ) {}

  async execute(req: CaptureSignalsRequest): Promise<CaptureSignalsResult> {
    const startedAt = this.clock.now();
    const { provenance, pairs } = await this.resolveSubjects(req);

    // Once per run, not per coin — every capture in a run observed the same
    // platform generation, and null is a recordable answer (DL-003).
    const platformVersion = await this.market.platformVersion({ accessToken: req.accessToken });

    const runId = await this.store.recordRun({
      userId: req.userId,
      startedAt,
      platformVersion,
      provenance,
    });

    const recorded: { coinTicker: string; interval: string; captureId: string; readingCount: number }[] = [];
    const failed: { coinTicker: string; interval: string; reason: string }[] = [];

    for (const pair of pairs) {
      // The port contract is unreadable-not-thrown; the catch is the belt
      // over that suspender (DL-006). A throw here is one coin's surprise,
      // and it must cost that coin, not the nine behind it.
      let result: Awaited<ReturnType<MarketPort['coinSignalPreview']>>;
      try {
        result = await this.market.coinSignalPreview({
          userId: req.userId,
          accessToken: req.accessToken,
          ticker: pair.coinTicker,
          interval: pair.timeframe,
        });
      } catch (err) {
        result = {
          kind: 'unreadable',
          reason: err instanceof Error ? err.message : String(err),
          cause: 'unreachable',
        };
      }
      const at = this.clock.now();
      if (result.kind === 'preview') {
        const captureId = await this.store.appendCapture({
          runId,
          userId: req.userId,
          coinTicker: result.preview.coinTicker,
          interval: pair.timeframe,
          capturedAt: at,
          currentPrice: result.preview.currentPrice,
          priceChangePercent: result.preview.priceChangePercent,
          dominantBias: result.preview.dominantBias,
          aggregateScorePercent: result.preview.aggregateScorePercent,
          hasConflictingSignals: result.preview.hasConflictingSignals,
          readings: result.preview.readings,
          raw: result.preview.raw,
        });
        recorded.push({
          coinTicker: result.preview.coinTicker,
          interval: pair.timeframe,
          captureId,
          readingCount: result.preview.readings.length,
        });
      } else {
        await this.store.appendFailure({
          runId,
          userId: req.userId,
          coinTicker: pair.coinTicker,
          interval: pair.timeframe,
          attemptedAt: at,
          reason: result.reason,
          // An answer that arrived but could not be read is still kept.
          raw: result.raw,
        });
        failed.push({ coinTicker: pair.coinTicker, interval: pair.timeframe, reason: result.reason });
      }
    }

    return { runId, provenance, platformVersion, recorded, failed };
  }

  /**
   * Which coins this run covers, and why — the reason travels into the run
   * row, because "no deployments exist" and "the deployments could not be
   * read" produce the same empty list and mean different things
   * (the qualification screen's lesson, applied to the record).
   */
  private async resolveSubjects(req: CaptureSignalsRequest): Promise<{
    provenance: CaptureProvenance;
    pairs: readonly DeployedPair[];
  }> {
    if (req.named !== undefined) {
      const coins = dedupeTickers(req.named.coins);
      if (coins.length === 0) {
        return {
          provenance: { kind: 'nothing', reason: 'coins were named, but none survived normalisation' },
          pairs: [],
        };
      }
      return {
        provenance: { kind: 'named', interval: req.named.interval, coins },
        pairs: coins.map((coinTicker) => ({ coinTicker, timeframe: req.named!.interval })),
      };
    }

    const deployments = await this.radar.listDeployments(req);
    if (deployments.kind !== 'deployments') {
      return {
        provenance: {
          kind: 'nothing',
          reason: `no coins were named, and the deployments could not be read: ${deployments.reason}`,
        },
        pairs: [],
      };
    }
    const pairs = dedupePairs(
      deployments.deployments.map((d) => ({ coinTicker: d.coinTicker, timeframe: d.timeframe })),
    );
    if (pairs.length === 0) {
      return {
        provenance: {
          kind: 'nothing',
          reason: 'no coins were named, and this account has no radar deployments to record',
        },
        pairs: [],
      };
    }
    return { provenance: { kind: 'deployments', pairs }, pairs };
  }
}

/**
 * The exit status an external scheduler reads. A capture that recorded
 * readings for at least one coin exits zero; one that recorded nothing —
 * every coin failed, or there was nothing to cover — exits nonzero, because
 * cron's only question is "did the record grow", and a run that grew it by
 * nothing is a run someone should hear about.
 *
 * Exported as a pure function so the semantics are testable without
 * spawning a process.
 */
export function exitCodeFor(result: CaptureSignalsResult): number {
  return result.recorded.length > 0 ? 0 : 1;
}

/** Tickers uniqued and case-normalised, in the order first seen. */
function dedupeTickers(tickers: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tickers) {
    const ticker = t.trim().toUpperCase();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    out.push(ticker);
  }
  return out;
}

/** One capture per coin+timeframe, however many slots a deployment holds. */
function dedupePairs(pairs: readonly DeployedPair[]): readonly DeployedPair[] {
  const seen = new Set<string>();
  const out: DeployedPair[] = [];
  for (const p of pairs) {
    const key = `${p.coinTicker} ${p.timeframe}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
