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
  /**
   * What entering this session would cost, in the platform's own units.
   *
   * The stake, and the reason this capability reads and does not play:
   * `entryFee: 10` on every session the list returned (observed live
   * 2026-08-06, recorded in `docs/battlegrid-mcp-surface.json`).
   */
  readonly entryFee: number | null;
  /** What the session pays out in total, as the list reports it. */
  readonly prizePool: number | null;
  /** Below this the platform's own preset can cancel the session. */
  readonly minimumPlayers: number | null;
  /** How many more the platform says are still needed. */
  readonly playersNeeded: number | null;
  /** The window predictions are scored over — `1H` on every session seen. */
  readonly timeRangeKey: string | null;
}

/**
 * One of BattleGrid's game presets: the rulebook a session is dealt from.
 *
 * The economics live here rather than on the session — grid shape, price,
 * what a right call multiplies and what a wrong one costs. All of it observed
 * populated on 2026-08-06; nothing on this type has only ever been declared.
 *
 * Deliberately not carried: the fee split, the payout bands, the jackpot
 * highlight table, the war-bond fields and the host columns. They are real and
 * populated, and nothing asks for them yet — mapping a field nobody renders is
 * how a mapper acquires a shape nobody checks.
 */
export interface GamePreset {
  readonly id: string;
  readonly name: string;
  /** `MARKET_GRID` or `COIN_GRID` — the arena is about the first. */
  readonly gameType: string;
  readonly timeRangeKey: string | null;
  readonly gridRows: number | null;
  readonly gridCols: number | null;
  /** Cells in the grid, which is coins per game — nine, as the operator said. */
  readonly coinsPerGame: number | null;
  readonly entryFee: number | null;
  /** What each point of price change is worth. */
  readonly changeMultiplier: number | null;
  /** What the captain pick multiplies, and what it costs when it is wrong. */
  readonly captainMultiplier: number | null;
  readonly captainWrongPenaltyMultiplier: number | null;
  readonly wrongPenaltyMultiplier: number | null;
  /**
   * Whether a jackpot rides on this preset, and whether it demands a perfect
   * game. Both false unless the platform said true: an absent flag is not a
   * denial, so the surface renders these only when they are set.
   */
  readonly jackpotEnabled: boolean;
  readonly perfectGameNeedsEveryCall: boolean;
  readonly minimumPlayers: number | null;
  readonly maxPlayers: number | null;
  /** Whether falling short of the minimum cancels the game rather than running it. */
  readonly cancelsBelowMinimum: boolean;
}

export type GameRulesResult =
  | { readonly kind: 'rules'; readonly presets: readonly GamePreset[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export interface GridSessionDetail {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly lockAt: string | null;
  readonly settleAt: string | null;
  readonly playerCount: number | null;
}

/**
 * One session's detail, or why it could not be read.
 *
 * A result rather than a bare `GridSessionDetail`, because this read is one of
 * N in a fan-out and any of them can fail alone. It used to throw, which at a
 * route is a 500 — found by `all-controllers-probe` when a rate limit took the
 * whole arena down while every other controller in the same run degraded.
 */
export type GridDetailResult =
  | { readonly kind: 'detail'; readonly detail: GridSessionDetail }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * Whether this account entered, or that the question could not be answered.
 *
 * Three states, not a boolean. An unread check rendered as `false` says "this
 * account has not entered" — a definite claim from a read that returned
 * nothing, and the same error as an unreadable roster reported as an empty one.
 */
export type GridSubmissionResult =
  | { readonly kind: 'submission'; readonly entered: boolean }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export type ArenaListResult =
  | { readonly kind: 'sessions'; readonly sessions: readonly GridSessionSummary[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * Results are a state machine, not a payload: before settlement the platform
 * refuses with a CONFLICT that means "not yet", and the surface renders that
 * as a state. The settled payload stays opaque here — it has never been
 * observed on this account, and modelling it from the declaration alone is
 * the mistake this project does not repeat. `payloadUnmodelled` says so in the
 * name, the way `positionsUnmodelled` does on the explorer port: the fact that
 * BattleGrid answered is trustworthy, the contents are not interpreted.
 *
 * The third state arrived when a route started calling this. Every other read
 * on this port returns its failure and this one threw — which at a route is a
 * 500, the outcome `one-bad-session-must-not-take-the-arena-down` spent a
 * whole change making unrepresentable for the two reads beside it.
 */
export type GridResultsOutcome =
  | { readonly kind: 'settled'; readonly payloadUnmodelled: Readonly<Record<string, unknown>> }
  | { readonly kind: 'not-settled' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export interface MarketGridPort {
  listSessions(params: { userId: string; accessToken: string }): Promise<ArenaListResult>;

  /**
   * The rulebook every session is dealt from: grid shape, price, multipliers.
   * One call, no arguments, and no account scope — the rules are the same for
   * everyone, which is why they can be read before anyone plays.
   */
  gameRules(params: { userId: string; accessToken: string }): Promise<GameRulesResult>;

  sessionDetail(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridDetailResult>;

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
  }): Promise<GridSubmissionResult>;

  results(params: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridResultsOutcome>;
}
