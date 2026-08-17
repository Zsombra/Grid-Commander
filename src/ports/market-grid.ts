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
   * The schedule, which the **list** carries — `status`, `lockAt`, `settleAt`
   * and `playerCount` on all 50 rows (observed 2026-08-06), and byte-identical
   * to what the detail read answers for the same session.
   *
   * They live here rather than on `GridSessionDetail` alone because the arena
   * used to fetch them one `get_market_grid_session` per listed session: fifty
   * calls for four fields already in hand, and the exact fan-out where
   * `all-controllers-probe` met HTTP 429. Worse, when one of those calls
   * failed the surface said "this session's schedule could not be read" while
   * the schedule sat in the payload that had rendered the row.
   *
   * Nullable like every other list field: a status the platform did not send is
   * unknown, and inventing one would put a session in a state nobody reported.
   */
  readonly status: string | null;
  readonly lockAt: string | null;
  readonly settleAt: string | null;
  readonly playerCount: number | null;
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
  /**
   * Who hosts the session, as the list names them. Only the list carries a
   * host name at all — the detail has a bare `hostUserId` — and so far the
   * platform has named nobody: `hostDisplayName: null` on all 50 rows
   * (2026-08-06). Null renders as "no host named", never as a name invented.
   *
   * `hostAvatarUrl` is deliberately not beside this: no surface renders
   * avatars, and a field must reach a reader to earn a mapping.
   */
  readonly hostDisplayName: string | null;
  /**
   * How the money is split, in the platform's own figures — list-only, and
   * the substance of deciding whether to enter. Read, never derived: the
   * percent of players in the money, how many places that pays at the current
   * player count, the payout curve's id and its `alpha` parameter, and the
   * per-entry fee breakdown. All observed populated on every row 2026-08-06.
   *
   * `payoutStructure` is deliberately absent — it has only ever been observed
   * as an empty array, so its row shape is exactly as unobserved as
   * `coinPicks.top`, and a declared-only shape is not mapped here.
   */
  readonly itmPercent: number | null;
  readonly calculatedItmCount: number | null;
  readonly alpha: number | null;
  readonly distributionCurveId: string | null;
  readonly feeBreakdown: GridFeeBreakdown | null;
  /**
   * The pick roster's envelope — the only part of the crowd read the platform
   * has ever sent populated. `rosterSize: 36` with `hasPicks: false` is an
   * observed, coherent state: 36 coins on offer, nobody has picked. The rows
   * themselves (`coinPicks.top`) have never had an entry and are not modelled
   * — see `market-grid-payloads-that-only-fill-once-someone-plays`.
   */
  readonly pickRosterSize: number | null;
  readonly hasPicks: boolean | null;
}

/**
 * Where each entry fee goes, exactly as `list_market_grid_sessions` states it
 * (`feeBreakdown`, observed populated on all 50 rows 2026-08-06). Five amounts
 * in the platform's own units, carried without arithmetic: nothing here sums
 * them, checks them against the entry fee, or fills a missing one from the
 * others — a derived figure on a money surface is a claim the platform never
 * made.
 */
export interface GridFeeBreakdown {
  readonly winnersAmount: number | null;
  readonly platformAmount: number | null;
  readonly jackpotAmount: number | null;
  readonly warBondAmount: number | null;
  readonly hostAmount: number | null;
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

/**
 * What `get_market_grid_session` is read for today.
 *
 * Every field here is also on the list row — the two reads were taken for the
 * same session on 2026-08-06 and `status`, `lockAt`, `settleAt` and
 * `playerCount` came back byte-identical — which is why the arena no longer
 * asks for it. This shape now serves one session opened on its own.
 *
 * The detail read does carry thirteen keys the list does not: `id`,
 * `chartIntervalMs`, `createdAt`, `gridRows`, `gridCols`, `gridSize`,
 * `coinPool` (resolved, against the list's `coinPoolPreview`), `coinCount`,
 * `timeframe`, `prizePool`, `warBondDeployed`, `warBondPoolId`,
 * `coinCaptainBadges`. None is modelled: nothing renders them, and a mapper
 * that acquires a shape nobody checks is how the dead write paths in
 * HANDOFF.md started. See
 * `market-grid-payloads-that-only-fill-once-someone-plays`.
 */
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
 * A result rather than a bare `GridSessionDetail`, because a read that throws
 * is a 500 at the route that made it — found by `all-controllers-probe` when a
 * rate limit took the whole arena down while every other controller in the same
 * run degraded. The fan-out that provoked that is gone (the arena reads the
 * schedule off the list), and the named result stays: `/arena/[id]` asks this
 * question, and one failed read there must render as a state rather than a
 * stack trace.
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

  /**
   * One session, asked about by id — for the surface a reader opened, never
   * once per listed session. The arena's schedule comes off `listSessions`,
   * which sends it on every row; asking for it again is fifty calls for four
   * fields already in hand, and it is where the platform's rate limit was met.
   */
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
