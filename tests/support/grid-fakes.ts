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
 * the price the 2026-08-06 re-probe recorded: `entryFee: 10` on every session,
 * and the schedule keys it recorded on all fifty rows — `status`, `lockAt`,
 * `settleAt`, `playerCount`. Those four are on the *summary* because the list
 * sends them; the arena used to fetch them one detail call per session.
 *
 * The values are one session a test can reason about, not a description of the
 * arena: on 2026-08-06 it held 2 PENDING and 48 CANCELLED sessions, every one
 * with `playerCount: 0`. A fixture is an example, and a populated arena is not
 * something this product may assume.
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
    status: 'PENDING',
    lockAt: '2026-08-01T18:00:00Z',
    settleAt: '2026-08-01T19:00:00Z',
    playerCount: 3,
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

  /**
   * Stage one session with its detail in a single call.
   *
   * The default detail is derived from the summary rather than from
   * `aGridDetail`'s own defaults, because the platform sends the same schedule
   * through both tools: a fixture where the list says LOCKED and the detail
   * says PENDING is a payload BattleGrid has never produced, and a test written
   * against it proves something about nothing.
   */
  stage(
    summary: GridSessionSummary,
    detail = aGridDetail({
      id: summary.id,
      name: summary.name,
      status: summary.status ?? 'PENDING',
      lockAt: summary.lockAt,
      settleAt: summary.settleAt,
      playerCount: summary.playerCount,
    }),
  ) {
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

  /**
   * Which sessions each per-session read was asked about.
   *
   * `detailCalls` exists to be asserted **empty** by the arena: the schedule is
   * on the list row, and re-reading it is fifty calls where the platform's rate
   * limit was met. A test that only checked the rendered schedule would pass
   * just as happily against the fan-out that produced the 429.
   */
  readonly detailCalls: string[] = [];
  readonly submissionCalls: string[] = [];

  async sessionDetail(params: { sessionId: string }): Promise<GridDetailResult> {
    this.detailCalls.push(params.sessionId);
    if (this.unreadableDetail.has(params.sessionId)) {
      return { kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' };
    }
    const detail = this.details.get(params.sessionId);
    if (!detail) return { kind: 'unreadable', reason: `no detail staged for ${params.sessionId}`, cause: 'unreachable' };
    return { kind: 'detail', detail };
  }

  async hasSubmitted(params: { sessionId: string }): Promise<GridSubmissionResult> {
    this.submissionCalls.push(params.sessionId);
    if (this.unreadableSubmission.has(params.sessionId)) {
      return { kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' };
    }
    return { kind: 'submission', entered: this.submitted.has(params.sessionId) };
  }

  async results(): Promise<GridResultsOutcome> {
    return this.outcome;
  }
}
