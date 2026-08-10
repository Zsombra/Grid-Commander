import type { AgentsPort, TradeOutcome } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';

/**
 * What the trades on this page add up to.
 *
 * **Derived, and labelled as derived wherever it is shown.** The platform
 * publishes an aggregate of its own — `get_agent_performance` — and it has
 * answered zeros and an empty curve on agents carrying real closed losses,
 * three times across three sessions. So this product computes the totals
 * from the trades it can actually see, and says that is what they are. A
 * figure this product added up and a figure the platform published are
 * different claims, and the surface must not blur them.
 */
export interface DerivedSummary {
  readonly closed: number;
  readonly wins: number;
  readonly losses: number;
  /** Trades whose net was exactly zero — neither, and not silently a loss. */
  readonly flat: number;
  readonly netPnl: number;
  readonly feesPaid: number;
  readonly averageDurationSeconds: number | null;
  /** Close reason → how many, in descending order. */
  readonly closeReasons: readonly { readonly reason: string; readonly count: number }[];
}

export type TradingRecordResult =
  | {
      readonly kind: 'record';
      readonly outcomes: readonly TradeOutcome[];
      readonly summary: DerivedSummary;
      /** What the platform says exists in total; null when it did not say. */
      readonly total: number | null;
      readonly page: number;
    }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/** Money only where the platform sent a number. A missing fee is not zero. */
function sum(values: readonly (number | null)[]): number {
  return values.reduce((total: number, v) => total + (v ?? 0), 0);
}

/**
 * How far price actually moved on the trades an agent closed.
 *
 * Here, beside `summarize()`, because it is the same derivation over the same
 * rows: one page of `list_trade_outcomes`, folded. A second module computing a
 * second set of totals from the same input is how two figures on two screens
 * begin to disagree.
 *
 * **Why it matters.** A stop distance means nothing on its own. `maxStopLossPct:
 * 1` looks careful until you know how far the moves this agent actually sees
 * are, at which point it may be a setting that converts ordinary noise into
 * realised losses. Both facts were already in the product — the platform sends
 * every closed trade's entry fill, exit fill, direction and close reason — and
 * neither was ever set against the other.
 *
 * **No population constant belongs in this file, and none may.** A measured
 * noise floor — recorded in `_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md`
 * — is a measurement taken on a stated date over a stated sample, not a live
 * reading. Comparing against it here would put false precision on the one
 * surface whose whole purpose is to be trusted instead of the raw setting. An
 * agent's own record needs no such constant; it is already the evidence. The
 * imports of this file are the guard, and
 * `tests/architecture/no-population-constants.test.ts` holds them to ports only.
 */

/**
 * The realised move on one closed trade, as a percentage of its entry, signed
 * so that positive means the trade went the way it was pointed.
 *
 * `null` rather than `0` wherever it cannot be computed. A trade missing a fill
 * price and a trade that closed exactly flat are different facts, and `0` says
 * the second when the truth is the first — the same mistake as an unconfigured
 * gauge reporting `remaining: 0`.
 *
 * The side is matched against the enum BattleGrid declares — LONG or SHORT —
 * rather than parsed, exactly as `protects()` does on the exposure surface. The
 * mapper writes `'UNKNOWN'` where the platform sent no side, and a direction
 * this product cannot read is one where a guess would invert the sign of a
 * number an operator is about to trust.
 */
export function moveOf(outcome: TradeOutcome): number | null {
  const { entryFillPrice: entry, exitFillPrice: exit, direction } = outcome;
  if (entry === null || exit === null) return null;
  // A zero or negative entry is not a price; dividing by it yields an Infinity
  // that renders as a number.
  if (entry <= 0) return null;
  const raw = ((exit - entry) / entry) * 100;
  if (direction === 'LONG') return raw;
  if (direction === 'SHORT') return -raw;
  return null;
}

/**
 * The middle value, or the mean of the two middle ones.
 *
 * A median and not a mean, deliberately. Moves and holding times are both
 * skewed — one trade that ran four hours drags a mean of ninety-minute lives
 * upward, and the result describes no trade that happened.
 * `DerivedSummary.averageDurationSeconds` is a mean and stays one: it answers a
 * different question, and changing it would move a number already on a screen.
 */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/**
 * How the trades that ended one way went.
 *
 * The reason is the platform's own string, never a category of ours. Its
 * vocabulary (`TAKE_PROFIT`, `STOP_LOSS`, `MARKET_CLOSE`, `LIQUIDATION`) is
 * declared only as a filter parameter on a different tool, so it is carried
 * rather than enumerated — `closeReasons` above already tallies it this way.
 */
export interface Ending {
  /** The platform's own close reason, or `unstated` where it gave none. */
  readonly reason: string;
  readonly count: number;
  /**
   * The median realised move for this ending, signed. `null` when nothing in
   * the group could be measured, or when the group is smaller than
   * `MEDIAN_NEEDS`.
   */
  readonly medianMovePct: number | null;
  /** Trades here that carried no measurable move. Stated, never dropped silently. */
  readonly unmeasurable: number;
  /**
   * Wins and losses in this group, from the trade's net and **never** from its
   * close reason.
   *
   * Two independent facts, learned the expensive way: `HYPE` closed at
   * **+$0.0731** with `closeReason: STOP_LOSS`, because position management had
   * trailed the stop into profit. A surface that reads a stop-out as a loss
   * reports a protected winner as a failure — on the screen built to explain
   * losses.
   */
  readonly wins: number;
  readonly losses: number;
}

/**
 * How many measurable trades an ending needs before a median is reported.
 *
 * Three is the smallest group where a median is not simply one of the two
 * values. Named rather than buried in a comparison, so a reader can see the
 * threshold the surface holds itself to. Below it the caller shows the trades
 * themselves — more honest, and at that size no harder to read.
 */
export const MEDIAN_NEEDS = 3;

export interface ExitGeometry {
  readonly endings: readonly Ending[];
  /** Trades folded — the denominator every share is against. */
  readonly measured: number;
  /** Trades carrying no measurable move, across all endings. */
  readonly unmeasurable: number;
  /** Earliest and latest close folded, where the platform stated them. */
  readonly from: Date | null;
  readonly to: Date | null;
  /** Median life of a closed position, in seconds. Null below `MEDIAN_NEEDS`. */
  readonly medianDurationSeconds: number | null;
}

/**
 * Fold closed trades into what each kind of ending actually cost.
 *
 * Over exactly the trades handed in and no others. The caller reads one page of
 * the platform's paging, so the window is a window — `from` and `to` are here so
 * a surface can say which one rather than implying it counted everything.
 *
 * Endings are ordered by how often they happened, because the one that keeps
 * happening is the finding. Ties break on the reason, so the order is stable
 * across reads.
 */
export function exitGeometry(outcomes: readonly TradeOutcome[]): ExitGeometry {
  const groups = new Map<string, TradeOutcome[]>();
  for (const o of outcomes) {
    const reason = o.closeReason ?? 'unstated';
    const group = groups.get(reason);
    if (group) group.push(o);
    else groups.set(reason, [o]);
  }

  const endings: Ending[] = [...groups.entries()]
    .map(([reason, group]) => {
      const moves = group.map(moveOf).filter((m): m is number => m !== null);
      const nets = group.map((o) => o.netPnl);
      return {
        reason,
        count: group.length,
        medianMovePct: moves.length >= MEDIAN_NEEDS ? median(moves) : null,
        unmeasurable: group.length - moves.length,
        wins: nets.filter((n) => n !== null && n > 0).length,
        losses: nets.filter((n) => n !== null && n < 0).length,
      };
    })
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  const closes = outcomes
    .map((o) => (o.closedAt === null ? null : new Date(o.closedAt)))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const durations = outcomes
    .map((o) => o.durationSeconds)
    .filter((d): d is number => typeof d === 'number');

  return {
    endings,
    measured: outcomes.length,
    unmeasurable: endings.reduce((total, e) => total + e.unmeasurable, 0),
    from: closes[0] ?? null,
    to: closes[closes.length - 1] ?? null,
    medianDurationSeconds:
      durations.length >= MEDIAN_NEEDS ? Math.round(median(durations) as number) : null,
  };
}

/**
 * The share of closes that ended this way, against what was folded.
 *
 * Here rather than in a component so the denominator cannot quietly become
 * something else on one screen. The population study's headline is a share and
 * a share against the wrong base is the easiest number on this surface to get
 * wrong.
 */
export function shareOf(ending: Ending, geometry: ExitGeometry): number | null {
  if (geometry.measured === 0) return null;
  return (ending.count / geometry.measured) * 100;
}

export function summarize(outcomes: readonly TradeOutcome[]): DerivedSummary {
  const nets = outcomes.map((o) => o.netPnl);
  const durations = outcomes
    .map((o) => o.durationSeconds)
    .filter((d): d is number => typeof d === 'number');

  const byReason = new Map<string, number>();
  for (const o of outcomes) {
    // A trade the platform did not explain is counted as unexplained rather
    // than dropped — how often that happens is itself worth seeing.
    const reason = o.closeReason ?? 'unstated';
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }

  return {
    closed: outcomes.length,
    // Only a stated net counts as a win or a loss; an unstated one is
    // neither, and inventing 0 for it would file it under `flat`.
    wins: nets.filter((n) => n !== null && n > 0).length,
    losses: nets.filter((n) => n !== null && n < 0).length,
    flat: nets.filter((n) => n === 0).length,
    netPnl: sum(nets),
    feesPaid: sum(outcomes.map((o) => o.totalFees)),
    averageDurationSeconds:
      durations.length === 0
        ? null
        : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    closeReasons: [...byReason.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
  };
}

/**
 * One agent's trading record: what it closed, and what those trades came
 * to. An agent that has closed nothing says so — a summary of zeros would
 * read as a result, and "no trades yet" and "flat across ten trades" are
 * not the same fact.
 */
export class ReadTradingRecordQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<TradingRecordResult> {
    const read = await this.agents.readTradeOutcomes(req);
    if (read.kind === 'unreadable') return read;
    if (read.kind === 'none') return { kind: 'none' };
    return {
      kind: 'record',
      outcomes: read.outcomes,
      summary: summarize(read.outcomes),
      total: read.total,
      page: req.page ?? 1,
    };
  }
}
