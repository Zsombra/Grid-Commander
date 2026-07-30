/**
 * How an agent has actually done.
 *
 * Read from a live account before it was typed, and the reading moved the whole
 * design. The tool named `get_agent_performance` returned nothing on any of the
 * nine agents on that account — `pnlCurveUsd` empty, every figure zero — while
 * the *roster* payload carried the full record for four of them. A product that
 * had gone to the schema for this would have built a surface on a tool that has
 * never once answered.
 *
 * So everything here comes from `list_intelligence_agents`, which this product
 * already calls on every agents page and which has been discarding this block
 * since the first release.
 */

/**
 * Grid competitions: what it played and how it placed.
 *
 * Separate from `TradeRecord` because they are separate games. An agent with 97
 * grid entries and 18 perps trades has two records with different units, and a
 * combined "performance" number would be an average of a score and a dollar.
 */
export interface GameRecord {
  readonly played: number;
  /**
   * A fraction, `0.39` for 39%.
   *
   * The platform sends `winRate: 0.3917525773195876` **and**
   * `winRatePercent: 39` — one fact, twice, already rounded in the second. Only
   * the fraction is kept, exactly as `ThoughtEntry.confidence` keeps
   * `confidenceScore` and drops `confidenceScorePercent`. Two copies of a number
   * on one screen eventually disagree, and the rounded one cannot be recovered
   * from.
   */
  readonly winRate: number | null;
  readonly avgAccuracy: number | null;
  /** Cumulative, in USD, as the platform totals it. Not derived from the curve. */
  readonly earningsUsd: number;
  /** Timestamped cumulative earnings. Carried, not charted — see the proposal. */
  readonly earningsCurve: readonly Point[];
}

/**
 * Perps trades: how the money went.
 *
 * `avgPnlUsd` is null on an agent that has not traded — the platform sends null
 * there rather than zero, which is the distinction this whole file is careful
 * about, made by the platform itself for once.
 */
export interface TradeRecord {
  readonly trades: number;
  readonly open: number;
  readonly wins: number;
  readonly losses: number;
  readonly avgPnlUsd: number | null;
  readonly pnlCurve: readonly Point[];
}

export interface Point {
  readonly at: Date;
  readonly value: number;
}

export interface Performance {
  readonly games: GameRecord;
  readonly trades: TradeRecord;
}

/**
 * Has this agent played at all?
 *
 * The reason a surface must ask before rendering: an agent with no games has
 * `played: 0`, `winRate: 0`, `earningsUsd: 0` — three zeroes that read as a
 * dismal record rather than as an absent one. Six of the nine agents observed
 * were in exactly that state, three of them created hours earlier.
 *
 * The same mistake as an unconfigured gauge reporting `remaining: 0`, and the
 * same fix: ask whether the thing exists before showing what it measures.
 */
export function hasPlayed(performance: Performance): boolean {
  return performance.games.played > 0;
}

export function hasTraded(performance: Performance): boolean {
  return performance.trades.trades > 0;
}

/** Nothing to show. Distinct from a record that failed to arrive, which is `null`. */
export function isUnproven(performance: Performance): boolean {
  return !hasPlayed(performance) && !hasTraded(performance);
}

/**
 * A rate as a percentage, for display only.
 *
 * Here rather than in a component so that the one rounding rule lives in one
 * place, and so no surface is tempted to reach for the platform's
 * `winRatePercent` and end up showing a different number from its neighbour.
 */
export function asPercent(rate: number | null): number | null {
  return rate === null ? null : Math.round(rate * 100);
}

/**
 * A dollar figure, to the cent, with a real minus sign.
 *
 * One rule in one place, for the same reason `asPercent` is: this product renders
 * money on the agent record, in a journal event's detail, and on a submission's
 * payout, and three copies of the rule drifted immediately — a payout rendered
 * as `$0` beside an average rendered as `−$0.25`, on adjacent screens.
 *
 * `−` is U+2212, not a hyphen. At small sizes a hyphen in front of a dollar
 * amount is easy to miss, and the figures this formats are losses.
 */
export function usd(amount: number): string {
  const sign = amount < 0 ? '−' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

/**
 * Won and lost need not sum to the trade count.
 *
 * `Fade Master II` reports 18 trades, 5 wins, 13 losses — those do sum. `Apex`
 * reports 3, 0 and 3. Nothing observed disagreed, but the platform sends all
 * three numbers rather than two, so the product shows all three rather than
 * deriving one and being wrong the first time an open trade is counted
 * differently.
 */
export function settledTrades(record: TradeRecord): number {
  return record.wins + record.losses;
}
