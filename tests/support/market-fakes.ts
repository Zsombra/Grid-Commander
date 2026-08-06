import type { MarketPort, RankedCoinsResult, RankingVocabulary } from '@/ports/market.js';

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
}
