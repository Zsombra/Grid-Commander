import type { FailureCause } from './failure.js';

/**
 * What is at stake right now, across every agent on the account.
 *
 * One account-wide read rather than one per agent. `list_user_active_positions`
 * carries `agentId` on every row and more fields than the per-agent
 * `get_agent_open_positions` — mark price, margin, ROE, liquidation price —
 * so filtering the account read gives a richer answer in one call than N
 * narrower ones. Two sources for the same fact would also be two things that
 * can disagree, which this product avoids everywhere the choice arises.
 */
export interface PositionsPort {
  readActivePositions(params: {
    userId: string;
    accessToken: string;
  }): Promise<ExposureResult>;
}

/**
 * One open position, as the platform prices it.
 *
 * **Nothing here is derived.** Unrealized P&L, ROE, margin and liquidation
 * price all arrive computed; recomputing any of them from an entry price would
 * disagree with the exchange the first time the platform changed how it marks.
 */
export interface OpenPosition {
  readonly positionId: string;
  readonly agentId: string;
  readonly coinTicker: string;
  readonly direction: string;
  readonly entryFillPrice: number | null;
  /**
   * The platform's current mark, and null when it could not price this one.
   *
   * Null rather than the entry price: `unpricedPositionCount` exists precisely
   * because the platform distinguishes these, and substituting the entry would
   * render a position as flat when its value is simply unknown.
   */
  readonly markPrice: number | null;
  readonly entryNotionalUsd: number | null;
  readonly currentNotionalUsd: number | null;
  readonly marginedUsd: number | null;
  /** Null when unpriced. Never zero — zero is a result, null is silence. */
  readonly unrealizedPnlUsd: number | null;
  readonly roePct: number | null;
  readonly effectiveLeverage: number | null;
  /**
   * Where the stop and target actually are, after position management has
   * moved them. Observed 2026-08-06: a decision recorded `stopLoss:
   * 55.67456526` and its live position reported `effectiveStopLoss: 55.954`.
   */
  readonly effectiveStopLoss: number | null;
  readonly effectiveTakeProfit: number | null;
  readonly liquidationPrice: number | null;
  readonly conviction: number | null;
  readonly timeHorizon: string | null;
  readonly openedAt: string | null;
  /** `LIVE` when the platform priced it. Carried as sent, never interpreted. */
  readonly pricingStatus: string | null;
  readonly status: string | null;
  /** The thread back to why: the decision and the evaluation behind it. */
  readonly decisionId: string | null;
  readonly signalLogId: string | null;
}

/** What the whole account has at stake, as the platform totals it. */
export interface ExposureTotals {
  readonly openPositionCount: number | null;
  readonly activeAgentCount: number | null;
  /** How many the platform could not price. Its own unreadable-is-not-empty. */
  readonly unpricedPositionCount: number | null;
  readonly marginedUsd: number | null;
  readonly currentNotionalUsd: number | null;
  readonly unrealizedPnlUsd: number | null;
  readonly roePct: number | null;
  /** When this was priced. A rendered page is a snapshot, not a ticker. */
  readonly generatedAtMs: number | null;
  readonly pricingStatus: string | null;
}

export interface Exposure {
  readonly totals: ExposureTotals;
  readonly positions: readonly OpenPosition[];
}

export type ExposureResult =
  | { readonly kind: 'exposure'; readonly exposure: Exposure }
  /** The platform answered and nothing is open. Never a failed read. */
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };
