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
