/**
 * How close an agent is to the ceilings that would stop it.
 *
 * Read from a live account before it was typed, and the reading changed the
 * design twice. `fill` is not a fraction — it is the amount consumed in the
 * gauge's own unit, so a trades gauge reads `fill: 21, remaining: 13` against a
 * ceiling of 34. And an unconfigured gauge reports `remaining: 0`, which as a
 * bare number says the opposite of what it means.
 */

export interface Gauge {
  /** Consumed so far, in the gauge's own unit. Populated even with no ceiling. */
  readonly used: number;
  /**
   * Headroom, or `null` when nothing caps this.
   *
   * The platform sends `0`. Carrying that through would render "0 remaining" on
   * a limit that does not exist — read as *about to halt*, meaning *will never
   * halt*. On the account this was built against, the two gauges without
   * ceilings were drawdown and daily loss.
   */
  readonly remaining: number | null;
  readonly ceiling: number | null;
  readonly breached: boolean;
}

export interface Budget {
  readonly agentId: string;
  readonly gauges: Readonly<Record<string, Gauge>>;
  /** As the platform states them. Not recomputed — see `warnings`. */
  readonly overSubscribed: boolean;
  readonly stopBelowSingleTradeLoss: boolean;
  readonly stopEffectivelyUnbounded: boolean;
  readonly haltedAt: Date | null;
  readonly haltReason: string | null;
  readonly capitalAtRiskUsd: number | null;
  readonly headroomUsd: number | null;
}

/** A gauge with a ceiling can stop the agent. One without cannot. */
export function binds(gauge: Gauge): boolean {
  return gauge.ceiling !== null;
}

export interface Bounds {
  /** Limits that could halt this agent. */
  readonly binding: readonly string[];
  /** Limits that could not, because no ceiling was set. */
  readonly unbounded: readonly string[];
}

/**
 * What would stop this agent, and what would not.
 *
 * The second list is the point. Four calm rows on a screen read as an agent
 * operating comfortably inside its limits; if every gauge is unconfigured, the
 * truth is that it has none. Naming the unbounded ones is the difference.
 */
export function stoppableLimits(budget: Budget): Bounds {
  const binding: string[] = [];
  const unbounded: string[] = [];
  for (const [name, gauge] of Object.entries(budget.gauges)) {
    (binds(gauge) ? binding : unbounded).push(name);
  }
  return { binding: binding.sort(), unbounded: unbounded.sort() };
}

/** Copy for a gauge, where this product has it. Open, as outcomes are. */
export const GAUGE_NAMES: Readonly<Record<string, string>> = {
  dailyLoss: 'Loss in a day',
  dailyTrades: 'Trades in a day',
  drawdown: 'Loss in total',
  exposure: 'At risk at once',
};

export function describeGauge(name: string): string {
  return GAUGE_NAMES[name] ?? name;
}

/**
 * The platform's own warnings, as it stated them.
 *
 * Carried rather than recomputed. BattleGrid decides what "over-subscribed" or
 * "effectively unbounded" means against state this product cannot see, and a
 * local re-derivation would be a second opinion that quietly diverges.
 */
export function warnings(budget: Budget): readonly string[] {
  const out: string[] = [];
  if (budget.haltedAt !== null) {
    out.push(budget.haltReason ?? 'BattleGrid has halted this agent.');
  }
  if (budget.overSubscribed) {
    out.push('This agent is allocated more than the account can cover.');
  }
  if (budget.stopBelowSingleTradeLoss) {
    out.push('Its stop sits below what a single trade could lose.');
  }
  if (budget.stopEffectivelyUnbounded) {
    out.push('Its stop is set so wide that it will not bind.');
  }
  return out;
}
