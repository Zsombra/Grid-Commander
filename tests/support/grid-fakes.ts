import type {
  ArenaListResult,
  GridResultsOutcome,
  GridSessionDetail,
  GridSessionSummary,
  MarketGridPort,
} from '@/ports/market-grid.js';

/** Shaped from the live `list_market_grid_sessions` entry of 2026-08-01. */
export function aGridSession(over: Partial<GridSessionSummary> = {}): GridSessionSummary {
  return {
    id: 'ms-1',
    name: 'CRYPTO WARS · 1H',
    coinTickers: ['BTC', 'ETH', 'HYPE'],
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

export class FakeMarketGridPort implements MarketGridPort {
  list: ArenaListResult = { kind: 'sessions', sessions: [] };
  details = new Map<string, GridSessionDetail>();
  submitted = new Set<string>();
  outcome: GridResultsOutcome = { kind: 'not-settled' };

  /** Stage one session with its detail in a single call. */
  stage(summary: GridSessionSummary, detail = aGridDetail({ id: summary.id, name: summary.name })) {
    const sessions = this.list.kind === 'sessions' ? [...this.list.sessions, summary] : [summary];
    this.list = { kind: 'sessions', sessions };
    this.details.set(summary.id, detail);
  }

  async listSessions(): Promise<ArenaListResult> {
    return this.list;
  }

  async sessionDetail(params: { sessionId: string }): Promise<GridSessionDetail> {
    const detail = this.details.get(params.sessionId);
    if (!detail) throw new Error(`no detail staged for ${params.sessionId}`);
    return detail;
  }

  async hasSubmitted(params: { sessionId: string }): Promise<boolean> {
    return this.submitted.has(params.sessionId);
  }

  async results(): Promise<GridResultsOutcome> {
    return this.outcome;
  }
}
