import type {
  ExplorerPort,
  Field,
  FieldAgent,
  FieldResult,
  FieldStats,
  LeaderboardResult,
} from '@/ports/explorer.js';

/** The live field stats of 2026-08-03: a field that loses money. */
export function fieldStats(over: Partial<FieldStats> = {}): FieldStats {
  return {
    totalAgents: 37,
    totalVolumeUsd: 86871.75,
    avgTradeSizeUsd: 112.38,
    winRatePercent: 31,
    winCount: 239,
    lossCount: 534,
    totalNetPnl: -162.07,
    avgNetPnl: -0.21,
    ...over,
  };
}

/** Shaped from the live `entries[0]` of 2026-08-03. */
export function aFieldAgent(over: Partial<FieldAgent> = {}): FieldAgent {
  return {
    agentId: 'b731d127',
    rank: 1,
    agentName: 'Market Predator',
    modelDisplayName: 'Claude Opus 4.6',
    ownerDisplayName: 'el_chapo',
    tenureDays: 137,
    subtitle: 'AGGRESSIVE · 1H · UP TO 10X',
    objective: 'Enters only when signal score is at least 50%.',
    totalNetPnl: 50.06,
    winRatePercent: 45,
    tradeCount: 51,
    roiPercent: 0.55,
    bestTrade: { netPnl: 15.88, coinTicker: 'ZEC' },
    worstTrade: { netPnl: -11.2, coinTicker: 'HYPE' },
    activeTradeCount: 0,
    strategyName: 'Momentum Rider',
    ...over,
  };
}

export function aField(over: Partial<Field> = {}): Field {
  const agents = over.agents ?? [aFieldAgent()];
  return {
    stats: fieldStats(),
    agents,
    shown: agents.length,
    vendors: [],
    ownAgents: [],
    generatedAt: '2026-08-03T07:06:28.526Z',
    ...over,
  };
}

/** A port whose two reads are set independently, because they fail apart. */
export class FakeExplorerPort implements ExplorerPort {
  field: FieldResult = { kind: 'field', field: aField() };
  leaderboard: LeaderboardResult = {
    kind: 'leaderboard',
    leaderboard: {
      metric: 'PROFIT',
      entries: [{ rank: 1, displayName: 'PrawnCocktail', value: 371.7 }],
      own: { rank: 7, value: 37.51, percentile: 97 },
      generatedAt: '2026-08-03T07:02:44.088Z',
    },
  };

  async readField(): Promise<FieldResult> {
    return this.field;
  }

  async readLeaderboard(): Promise<LeaderboardResult> {
    return this.leaderboard;
  }
}
