import type {
  CompetitorFunnel,
  ExplorerPort,
  Field,
  FieldAgent,
  FieldResult,
  FieldStats,
  ConsultedSignal,
  EvaluationDetail,
  LeaderboardResult,
  OpenPositions,
  PublicEvaluation,
  PublicResult,
  PublicTrade,
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

/** The live `get_public_agent_signal_performance` funnel of 2026-08-03. */
export function aFunnel(over: Partial<CompetitorFunnel> = {}): CompetitorFunnel {
  return {
    totalEvaluations: 245,
    totalDecisions: 102,
    enterDecisions: 73,
    // Two counters the platform names alike and means differently.
    skipDecisions: 29,
    skippedTerminal: 0,
    executed: 51,
    failed: 9,
    expired: 13,
    cancelled: 0,
    blocked: 0,
    pending: 0,
    fillRatePercent: 76,
    avgAggregateScorePercent: 63,
    avgConvictionPercent: 49,
    avgRiskRewardRatio: 2.2647397260273974,
    outcomeCount: 51,
    winCount: 23,
    lossCount: 28,
    winRatePercent: 45.1,
    avgNetPnl: 0.9816281960784313,
    totalNetPnl: 50.063038,
    avgDurationSeconds: 33937.98039215686,
    topCoins: [
      { coinTicker: 'ENA', count: 21 },
      { coinTicker: 'FARTCOIN', count: 19 },
    ],
    ...over,
  };
}

/** Shaped from the live `get_public_agent_realized_trades` row. */
export function aPublicTrade(over: Partial<PublicTrade> = {}): PublicTrade {
  return {
    id: 'ee856719',
    coinTicker: 'ETH',
    direction: 'SHORT',
    entryFillPrice: 1565.7,
    exitFillPrice: 1584,
    netPnl: -0.402459,
    isWin: false,
    movePercent: 1.1688062847288723,
    roePercent: -14.604961765576824,
    closeReason: 'MARKET_CLOSE',
    leverage: 10,
    conviction: 0.62,
    openedAt: '2026-06-30T15:28:58.295Z',
    closedAt: '2026-07-01T03:17:38.949Z',
    durationSeconds: 42520,
    signalLogId: '96b4f817',
    ...over,
  };
}

/** Shaped from the live `get_public_agent_signal_logs` row. */
export function aPublicEvaluation(over: Partial<PublicEvaluation> = {}): PublicEvaluation {
  return {
    id: 'fc0978d5',
    coinTicker: 'BTC',
    aggregateScorePercent: 65,
    minAggregateScorePercent: 50,
    dominantBias: 'BEARISH',
    assessmentDirection: 'DOWN',
    hasConflictingSignals: true,
    triggeredSignalCount: 14,
    gateStatus: 'ROUTED',
    terminalStatus: 'EXPIRED',
    signalSource: 'CONVERSATIONAL',
    at: '2026-07-01T03:30:15.167Z',
    ...over,
  };
}

/** One consulted signal, shaped from the live scorecard of 2026-08-03. */
export function aConsultedSignal(over: Partial<ConsultedSignal> = {}): ConsultedSignal {
  return {
    signalId: 'macd_bull_divergence',
    module: 'MACD',
    triggered: true,
    scorePercent: 100,
    bias: 'BULLISH',
    direction: 'LONG',
    isPrimary: false,
    required: false,
    effectiveAllocation: 1,
    details: 'MACD bull divergence: price lower but histogram rising',
    indicatorValues: { macd_histogram: -4.45112127, price: 1562.7 },
    ...over,
  };
}

/**
 * The live ETH / PASS evaluation of 2026-08-03, in miniature.
 *
 * Deliberately holds both a triggered and an untriggered signal: 60 of the
 * real 72 did not fire, and the page exists to show them.
 */
export function anEvaluationDetail(over: Partial<EvaluationDetail> = {}): EvaluationDetail {
  return {
    coinTicker: 'ETH',
    evaluatedAt: '2026-06-30T15:27:25.845Z',
    timeframesUsed: ['1h'],
    aggregateScorePercent: 57,
    dominantBias: 'MIXED',
    hasConflictingSignals: true,
    terminalStatus: 'PASS',
    signals: [
      aConsultedSignal(),
      aConsultedSignal({
        signalId: 'rsi_oversold',
        module: 'RSI',
        triggered: false,
        scorePercent: 0,
        details: 'RSI(14) at 38.1 — not oversold (threshold 30)',
        indicatorValues: { rsi14: 38.0982344 },
      }),
      aConsultedSignal({
        signalId: 'htf_trend_adx_trending',
        module: 'TREND_STRENGTH',
        scorePercent: 30,
        bias: 'NEUTRAL',
        isPrimary: true,
        required: true,
        details: 'HTF ADX at 32.5 — strong trend on higher timeframe (> 25)',
        indicatorValues: { htf_adx_value: 32.46065296 },
      }),
    ],
    attributions: [
      { signalId: 'macd_bull_divergence', name: 'Bull Divergence', scorePercent: 100, attributionPercent: 13 },
      { signalId: 'stoch_oversold', name: 'Oversold', scorePercent: 43, attributionPercent: 5 },
    ],
    chain: {
      gateStatus: 'ROUTED',
      gateReason: null,
      attemptResult: 'LLM_APPROVED',
      attemptReasonCodes: [],
      decision: 'ENTER',
      decisionDirection: 'SHORT',
      convictionPercent: 62,
      entryPrice: 1562.7,
      stopLoss: 1582.44015785,
      takeProfit: 1503.47952646,
      riskRewardRatio: 3,
      executionStatus: 'CLOSED',
      failureReason: null,
      expiryReason: null,
      executionMessage: null,
      tradeOutcome: 'LOSS',
      netPnl: -0.402459,
    },
    // The public detail tool does not declare the v17 condition block, so a
    // competitor's evaluation genuinely has none to show.
    conditions: null,
    ...over,
  };
}

/** A port whose reads are set independently, because they fail apart. */
export class FakeExplorerPort implements ExplorerPort {
  field: FieldResult = { kind: 'field', field: aField() };
  /**
   * The live shape of 2026-08-06: ten rows, and **this account is one of
   * them** — rank 7 by profit, inside its own top ten. Two rows are enough
   * to carry that property, and it is the property that matters: a fake
   * whose own standing sat outside its own list would let a page that never
   * marks a row pass every test.
   *
   * `userId`s are the real ones the platform returned, so the match under
   * test is the match that happens live.
   */
  leaderboard: LeaderboardResult = {
    kind: 'leaderboard',
    leaderboard: {
      metric: 'PROFIT',
      entries: [
        {
          rank: 1,
          displayName: 'PrawnCocktail',
          value: 371.7,
          userId: '9b7a50e1-678e-4ee9-b229-2a65a67c4823',
        },
        {
          rank: 7,
          displayName: 'ANBUJEFF',
          value: 37.51,
          userId: 'bb334a1e-2ac2-4956-8dea-7c7cf01097b9',
        },
      ],
      own: {
        rank: 7,
        value: 37.51,
        percentile: 97,
        userId: 'bb334a1e-2ac2-4956-8dea-7c7cf01097b9',
      },
      generatedAt: '2026-08-03T07:02:44.088Z',
    },
  };

  funnel: PublicResult<CompetitorFunnel> = { kind: 'value', value: aFunnel(), total: null };
  trades: PublicResult<PublicTrade[]> = { kind: 'value', value: [aPublicTrade()], total: 51 };
  evaluations: PublicResult<PublicEvaluation[]> = {
    kind: 'value',
    value: [aPublicEvaluation()],
    total: 245,
  };
  evaluationDetail: PublicResult<EvaluationDetail> = {
    kind: 'value',
    value: anEvaluationDetail(),
    total: null,
  };
  /** The only shape ever observed: an envelope with nothing in it. */
  open: PublicResult<OpenPositions> = {
    kind: 'value',
    value: {
      unrealizedPnl: 0,
      openPositionCount: 0,
      positionsUnmodelled: [],
      fetchedAt: '2026-08-03T09:36:43.724Z',
    },
    total: null,
  };

  async readField(): Promise<FieldResult> {
    return this.field;
  }

  async readLeaderboard(): Promise<LeaderboardResult> {
    return this.leaderboard;
  }

  async readCompetitorPerformance(): Promise<PublicResult<CompetitorFunnel>> {
    return this.funnel;
  }

  async readCompetitorTrades(): Promise<PublicResult<PublicTrade[]>> {
    return this.trades;
  }

  async readCompetitorEvaluations(): Promise<PublicResult<PublicEvaluation[]>> {
    return this.evaluations;
  }

  async readCompetitorOpenPositions(): Promise<PublicResult<OpenPositions>> {
    return this.open;
  }

  async readCompetitorEvaluationDetail(): Promise<PublicResult<EvaluationDetail>> {
    return this.evaluationDetail;
  }
}
