import type {
  MarketPort,
  RankedCoinsResult,
  RankingVocabulary,
  RegimeHistoryResult,
  RegimeSnapshotResult,
} from '@/ports/market.js';

/**
 * The platform's market data, in memory.
 *
 * Records what it was asked for. The metric and interval are chosen by the
 * product from what the platform declares, and a double that discarded them
 * would let a test pass while the product sent an interval BattleGrid does not
 * accept.
 */
export class FakeMarketPort implements MarketPort {
  vocabulary: RankingVocabulary = {
    metrics: ['abs_change', 'rsi_activity', 'volume'],
    intervals: ['1m', '5m', '15m', '1h', '4h', '1d'],
  };
  ranked: RankedCoinsResult = {
    kind: 'coins',
    coins: [
      { ticker: 'BTC', rank: 1, latestMetricValue: 4.2 },
      { ticker: 'ETH', rank: 2, latestMetricValue: -3.1 },
    ],
  };
  readonly rankings: Array<{ metric: string; interval: string; limit?: number | undefined }> = [];

  async topRankedCoins(params: {
    metric: string;
    interval: string;
    limit?: number | undefined;
  }): Promise<RankedCoinsResult> {
    this.rankings.push({ metric: params.metric, interval: params.interval, limit: params.limit });
    return this.ranked;
  }

  async rankingVocabulary(): Promise<RankingVocabulary> {
    return this.vocabulary;
  }

  // The recorder's reads. Nothing that fakes the market this way records, so
  // reaching them is a wiring mistake worth a loud failure.
  async coinSignalPreview(): Promise<never> {
    throw new Error('coinSignalPreview is not in this fake; use ScriptedMarket from recording-fakes');
  }

  async platformVersion(): Promise<string | null> {
    return null;
  }

  /**
   * The regime pair, scripted per symbol. `'none'` / `'unclassified'` by
   * default — the platform's own empty answers — so a test that has not
   * scripted a coin renders the honest empty arms rather than throwing, and
   * `regimeReads` records what was asked so a test can assert the record's
   * own coins and intervals were the subjects.
   */
  regimeHistoryBySymbol: Record<string, RegimeHistoryResult> = {};
  regimeSnapshotBySymbol: Record<string, RegimeSnapshotResult> = {};
  readonly regimeReads: Array<{ tool: 'history' | 'snapshot'; symbol: string; timeframe: string }> =
    [];

  async regimeHistory(params: {
    symbol: string;
    timeframe: string;
  }): Promise<RegimeHistoryResult> {
    this.regimeReads.push({ tool: 'history', symbol: params.symbol, timeframe: params.timeframe });
    return this.regimeHistoryBySymbol[params.symbol] ?? { kind: 'none' };
  }

  async regimeSnapshot(params: {
    symbol: string;
    timeframe: string;
  }): Promise<RegimeSnapshotResult> {
    this.regimeReads.push({ tool: 'snapshot', symbol: params.symbol, timeframe: params.timeframe });
    return this.regimeSnapshotBySymbol[params.symbol] ?? { kind: 'unclassified' };
  }
}
