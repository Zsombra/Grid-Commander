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

  /**
   * The orders actually resting at the venue, account-wide.
   *
   * Different claim from a position's `effectiveStopLoss`: that is where
   * software says the stop is, this is an order the exchange will honour on
   * its own. The row carries no positionId and no agentId (observed
   * 2026-08-10, #116) — attribution goes through the position's coin. Queries
   * the venue directly, so it is slower than a cached read and fails when the
   * exchange is unreachable; rows churn within minutes as position management
   * replaces legs, so any rendering of this is a snapshot.
   */
  readRestingOrders(params: {
    userId: string;
    accessToken: string;
  }): Promise<RestingOrdersResult>;
}

/**
 * One resting order, as observed live (13 keys, uniform across every row).
 * Prices and sizes arrive as decimal strings and are parsed here for the
 * reason the account balance is: every call site parsing for itself is how
 * two screens disagree about a number.
 */
export interface RestingOrder {
  readonly orderId: string;
  readonly symbol: string;
  /** BUY | SELL as sent — a leg's side is its position's exit direction. */
  readonly side: string | null;
  readonly status: string | null;
  /** "Stop Market", "Take Profit Market" — carried as sent, never mapped. */
  readonly orderType: string | null;
  readonly price: number | null;
  readonly triggerPrice: number | null;
  readonly quantity: number | null;
  readonly originalSize: number | null;
  readonly filledSize: number | null;
  /** True on every row observed — the resting book is protective legs. */
  readonly reduceOnly: boolean;
  readonly clientOrderId: string | null;
  /** Epoch milliseconds, the one shape this payload states time in. */
  readonly placedAtMs: number | null;
}

export type RestingOrdersResult =
  /** An empty list is a real answer: nothing rests. */
  | { readonly kind: 'orders'; readonly orders: readonly RestingOrder[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

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
  /**
   * What the management engine reports for this position — v17.2.0 fields,
   * carried verbatim. Observed one value deep (`ACTIVE` on all 8 positions,
   * 2026-08-11), so no enum: an unseen value is still the platform's word.
   * Null when the platform said nothing, which is not an idle engine.
   */
  readonly breakEvenStatus: string | null;
  readonly trailingStatus: string | null;
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
