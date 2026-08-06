import type {
  ArenaListResult,
  GamePreset,
  GameRulesResult,
  GridDetailResult,
  GridResultsOutcome,
  GridSessionDetail,
  GridSessionSummary,
  GridSubmissionResult,
  MarketGridPort,
} from '@/ports/market-grid.js';

/**
 * Shaped from the live `list_market_grid_sessions` entry of 2026-08-01, with
 * the price the 2026-08-06 re-probe recorded: `entryFee: 10` on every session.
 */
export function aGridSession(over: Partial<GridSessionSummary> = {}): GridSessionSummary {
  return {
    id: 'ms-1',
    name: 'CRYPTO WARS · 1H',
    coinTickers: ['BTC', 'ETH', 'HYPE'],
    entryFee: 10,
    prizePool: 40,
    minimumPlayers: 4,
    playersNeeded: 1,
    timeRangeKey: '1H',
    ...over,
  };
}

/** Shaped from the live `get_market_grid_session` payload of 2026-08-01. */
export function aGridDetail(over: Partial<GridSessionDetail> = {}): GridSessionDetail {
  return {
    id: 'ms-1',
    name: 'CRYPTO WARS · 1H',
    status: 'PENDING',
    lockAt: '2026-08-01T18:00:00Z',
    settleAt: '2026-08-01T19:00:00Z',
    playerCount: 3,
    ...over,
  };
}

/** Shaped from the live `list_game_presets` entry of 2026-08-06. */
export function aGamePreset(over: Partial<GamePreset> = {}): GamePreset {
  return {
    id: 'p-crypto-wars',
    name: 'CRYPTO WARS',
    gameType: 'MARKET_GRID',
    timeRangeKey: '1H',
    gridRows: 3,
    gridCols: 3,
    coinsPerGame: 9,
    entryFee: 10,
    changeMultiplier: 100,
    captainMultiplier: 2,
    captainWrongPenaltyMultiplier: 2,
    wrongPenaltyMultiplier: 1,
    jackpotEnabled: true,
    perfectGameNeedsEveryCall: true,
    minimumPlayers: 4,
    maxPlayers: 100,
    cancelsBelowMinimum: true,
    ...over,
  };
}

export class FakeMarketGridPort implements MarketGridPort {
  list: ArenaListResult = { kind: 'sessions', sessions: [] };
  details = new Map<string, GridSessionDetail>();
  submitted = new Set<string>();
  outcome: GridResultsOutcome = { kind: 'not-settled' };
  rules: GameRulesResult = { kind: 'rules', presets: [aGamePreset()] };

  /** Stage one session with its detail in a single call. */
  stage(summary: GridSessionSummary, detail = aGridDetail({ id: summary.id, name: summary.name })) {
    const sessions = this.list.kind === 'sessions' ? [...this.list.sessions, summary] : [summary];
    this.list = { kind: 'sessions', sessions };
    this.details.set(summary.id, detail);
  }

  async listSessions(): Promise<ArenaListResult> {
    return this.list;
  }

  async gameRules(): Promise<GameRulesResult> {
    return this.rules;
  }

  /**
   * Sessions whose per-session reads answer `unreadable`, by id.
   *
   * The fan-out failing is the case the arena got wrong for the life of the
   * feature, so the double has to be able to produce it. A fake that could only
   * succeed is why nothing caught it.
   */
  readonly unreadableDetail = new Set<string>();
  readonly unreadableSubmission = new Set<string>();

  async sessionDetail(params: { sessionId: string }): Promise<GridDetailResult> {
    if (this.unreadableDetail.has(params.sessionId)) {
      return { kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' };
    }
    const detail = this.details.get(params.sessionId);
    if (!detail) return { kind: 'unreadable', reason: `no detail staged for ${params.sessionId}`, cause: 'unreachable' };
    return { kind: 'detail', detail };
  }

  async hasSubmitted(params: { sessionId: string }): Promise<GridSubmissionResult> {
    if (this.unreadableSubmission.has(params.sessionId)) {
      return { kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' };
    }
    return { kind: 'submission', entered: this.submitted.has(params.sessionId) };
  }

  async results(): Promise<GridResultsOutcome> {
    return this.outcome;
  }
}
