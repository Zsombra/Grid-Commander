/**
 * The `performance` block, as an agent payload actually carries it.
 *
 * Recorded from an older account: nine agents, four with a record, one with 97
 * games. Both `list_intelligence_agents` and `get_intelligence_agent` return the
 * identical thirty keys, so one shape covers both reads.
 *
 * **Identifiers are replaced; structure, precision and nulls are not.** The
 * repository is public. `winRate: 0.3917525773195876` is kept to its full
 * precision because rounding it in a fixture would hide the fact that
 * `winRatePercent: 39` is a *lossy second copy* — which is the whole reason the
 * mapper keeps one and not the other.
 *
 * This replaces `performance: { winRate: 0.5 }`, which had been sitting in
 * `mapper.test.ts` asserting that the block was *dropped*. It was invented, and
 * it was invented wrong: `winRate` is nested under `gameStats`, never at the
 * top. A fixture in that shape can only ever prove the code agrees with itself —
 * the same defect as `defaultCatalog()` defaulting three fields where the live
 * catalog defaults fifteen.
 */

/** 97 games and 18 trades. The busiest agent on the account. */
export const VETERAN_PERFORMANCE = {
  gameStats: {
    gamesPlayed: 97,
    winRate: 0.3917525773195876,
    // Sent alongside the fraction and deliberately discarded by the mapper.
    // Present here so a test can prove it is discarded rather than merely absent.
    winRatePercent: 39,
    avgAccuracy: 0.5040061855670099,
    avgAccuracyPercent: 50,
    gameEarnings: 73.87,
    earningsSparkline: [
      { timestamp: '2026-06-08T13:51:04.610Z', value: 58.01 },
      { timestamp: '2026-06-21T15:51:09.421Z', value: 72.12 },
      { timestamp: '2026-06-26T11:51:12.833Z', value: 73.87 },
    ],
  },
  tradeStats: {
    trades: 18,
    open: 0,
    winLoss: { wins: 5, losses: 13 },
    // Negative, and to nine places. An average P&L is not a round number.
    avgPnl: -0.248160045,
    pnlSparkline: [
      { timestamp: '2026-04-29T10:03:40.160Z', value: -0.47287 },
      { timestamp: '2026-06-21T17:40:55.965Z', value: -4.46688081 },
    ],
  },
};

/**
 * Games, and not one trade.
 *
 * The platform sends `avgPnl: null` here rather than `0` — the one place in this
 * payload it draws the has-not/scored-zero distinction unprompted, and the case
 * a surface must not render as "$0.00 average".
 */
export const GAMES_ONLY_PERFORMANCE = {
  gameStats: {
    gamesPlayed: 20,
    winRate: 0.65,
    winRatePercent: 65,
    avgAccuracy: 0.627785,
    avgAccuracyPercent: 63,
    gameEarnings: 36.9,
    earningsSparkline: [{ timestamp: '2026-04-08T13:53:49.700Z', value: 2.76 }],
  },
  tradeStats: { trades: 0, open: 0, winLoss: { wins: 0, losses: 0 }, avgPnl: null, pnlSparkline: [] },
};

/**
 * Created, never run — and it reports a full block of zeroes, not an absent one.
 *
 * Six of the nine agents observed were in this state. It is the case that makes
 * `isUnproven` necessary: three zeroes on a screen read as a dismal record
 * rather than no record at all.
 */
export const UNPROVEN_PERFORMANCE = {
  gameStats: {
    gamesPlayed: 0,
    winRate: 0,
    winRatePercent: 0,
    avgAccuracy: 0,
    avgAccuracyPercent: 0,
    gameEarnings: 0,
    earningsSparkline: [],
  },
  tradeStats: { trades: 0, open: 0, winLoss: { wins: 0, losses: 0 }, avgPnl: null, pnlSparkline: [] },
};

/** The two keys the block carries, and no others. */
export const OBSERVED_PERFORMANCE_KEYS = ['gameStats', 'tradeStats'] as const;

/**
 * What `get_agent_performance` answered on every agent, on both accounts.
 *
 * Kept so a test can state the finding: the tool named for performance carries
 * none of it. `pnlCurveUsd` was empty and every figure zero on all nine agents —
 * `maxCumulativeDrawdownUsd` being the configured cap echoed back, not a result.
 */
export const EMPTY_PERFORMANCE_TOOL_RESPONSE = {
  performance: {
    agentId: 'aaaaaaaa-1111-4111-8111-111111111111',
    realizedPnlUsd: 0,
    drawdownUsd: 0,
    maxCumulativeDrawdownUsd: 100,
    pnlCurveUsd: [],
    haltedAt: null,
  },
};
