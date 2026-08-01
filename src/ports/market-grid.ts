import type { FailureCause } from './failure.js';

/**
 * Watching the Market Grid arena — reads only. Playing carries a real entry
 * fee and is deliberately not on this port; offering it means the full
 * confirmation ceremony, classification and consequence wording first.
 */

export interface GridSessionSummary {
  readonly id: string;
  readonly name: string;
  /** Ticker per pooled coin, as the platform previews them. */
  readonly coinTickers: readonly string[];
}

export interface GridSessionDetail {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly lockAt: string | null;
  readonly settleAt: string | null;
  readonly playerCount: number | null;
}

export type ArenaListResult =
  | { readonly kind: 'sessions'; readonly sessions: readonly GridSessionSummary[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * Results are a state machine, not a payload: before settlement the platform
 * refuses with a CONFLICT that means "not yet", and the surface renders that
 * as a state. The settled payload stays opaque here — it has never been
 * observed on this account, and modelling it from the declaration alone is
 * the mistake this project does not repeat.
 */
export type GridResultsOutcome =
  | { readonly kind: 'settled'; readonly payload: Readonly<Record<string, unknown>> }
  | { readonly kind: 'not-settled' };

export interface MarketGridPort {
  listSessions(params: { userId: string; accessToken: string }): Promise<ArenaListResult>;

  sessionDetail(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridSessionDetail>;

  /**
   * Whether this account entered the session. The ONLY source for the
   * played/not-played fact: `get_market_grid_player_grid` answers a server
   * error for "not played" (established live 2026-08-01), so nothing may
   * interpret that 500 as an answer.
   */
  hasSubmitted(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<boolean>;

  results(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridResultsOutcome>;
}
