import type { Budget, Gauge } from '@/domain/agent/budget.js';
import { describeGauge, stoppableLimits, warnings } from '@/domain/agent/budget.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';

export interface Limit {
  readonly name: string;
  readonly label: string;
  readonly gauge: Gauge;
  /** False when nothing caps this — the state the platform reports as zero. */
  readonly binds: boolean;
}

/**
 * The fill side of the exposure cap: what is committed, what is left, and what
 * the platform says the remainder authorizes.
 *
 * Every figure comes from `get_agent_budget` as sent. **Nothing here is
 * derived**, including the gauge's own fill and remainder — the tool's
 * description says of the gauges, in these words, *"render them, never
 * re-derive"*, and a second arithmetic would be a figure about someone's money
 * that the platform never stated.
 *
 * This is deliberately **not** a projection of the next order's size. That
 * figure is `headroom x sizePct x effectiveLeverage`; the preset is ours to
 * apply and the platform publishes no per-preset projection, so computing one
 * would be exactly what `the-approval-can-be-answered` refused as PE-2, on the
 * same money surface, for the same reason. The open product question lives on
 * `a-confirmation-that-cannot-name-the-amount` (#305) and governs both surfaces.
 */
export interface SizingBase {
  /**
   * False when the platform reports no configured ceiling.
   *
   * The discriminator between "the cap is empty" and "there is no cap". The
   * platform sends `remaining: 0` for the second, and rendering that as a fill
   * would describe a limit that does not exist as one about to bind.
   */
  readonly configured: boolean;
  /** Margin counted against the cap right now. */
  readonly committedUsd: number | null;
  /** What is left beneath the cap — the base each new entry is sized from. */
  readonly headroomUsd: number | null;
  /** What the platform reports that headroom authorizes, at the agent's leverage. */
  readonly authorizedNotionalUsd: number | null;
}

/**
 * A budget-side stop the platform names itself.
 *
 * `reason` is the platform's own wording and is never substituted for: where it
 * blocked an agent and said nothing about why, the honest surface says it was
 * blocked and stops, rather than inventing the likeliest explanation.
 */
export interface BudgetBlock {
  readonly reason: string | null;
  readonly since: Date | null;
  readonly overSubscribed: boolean;
}

export type ReadBudgetResult =
  | {
      readonly kind: 'budget';
      readonly limits: readonly Limit[];
      /** Named, because four calm rows do not say "this agent has no limits". */
      readonly unbounded: readonly string[];
      readonly warnings: readonly string[];
      readonly halted: boolean;
      readonly budget: Budget;
      /** The fill side of the exposure cap, or null where the agent has no exposure gauge. */
      readonly sizing: SizingBase | null;
      /** Null when the platform reports nothing blocked. */
      readonly block: BudgetBlock | null;
    }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * How close an agent is to being stopped.
 *
 * The readings live here rather than in the page. `app/` may not import the
 * domain, and more to the point a surface that decides for itself what
 * `remaining: 0` means will decide wrong — the platform sends that for a limit
 * that does not exist.
 */
export class ReadBudgetQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<ReadBudgetResult> {
    const result = await this.agents.readBudget(req);
    if (result.kind === 'unreadable') {
      return { kind: 'unreadable', reason: result.reason, cause: result.cause };
    }

    const { budget } = result;
    const bounds = stoppableLimits(budget);

    return {
      kind: 'budget',
      budget,
      sizing: sizingBase(budget),
      block: blockOf(budget),
      halted: budget.haltedAt !== null,
      warnings: warnings(budget),
      unbounded: bounds.unbounded.map(describeGauge),
      limits: Object.entries(budget.gauges)
        .map(([name, gauge]) => ({
          name,
          label: describeGauge(name),
          gauge,
          binds: gauge.ceiling !== null,
        }))
        // Binding limits first: the ones that can stop the agent are the ones
        // worth reading, and the unbounded ones are a warning rather than a row.
        .sort((a, b) => Number(b.binds) - Number(a.binds) || a.label.localeCompare(b.label)),
    };
  }
}


/**
 * The exposure gauge read as a sizing base rather than as a ceiling.
 *
 * Null when the platform sent no exposure gauge at all — which is different
 * from an unconfigured one, and both are different from a full one.
 */
function sizingBase(budget: Budget): SizingBase | null {
  const gauge = budget.gauges['exposure'];
  if (gauge === undefined) return null;
  const configured = gauge.ceiling !== null;
  return {
    configured,
    // `capitalAtRiskUsd` and the gauge's own fill are the same quantity read
    // two ways; the gauge is preferred because it is the figure the platform
    // resolved against this cap.
    committedUsd: gauge.used,
    /*
     * Only meaningful under a configured ceiling: the platform sends 0 for
     * remaining where nothing caps the agent, and 0 here reads as "about to
     * stop" when it means "will never stop".
     *
     * **No fallback to the gauge's own remainder.** It was written as
     * `headroomUsd ?? gauge.remaining`, and both are the platform's figures so
     * nothing was computed — but they are two different fields, and if they
     * ever disagreed the surface would label one as the other with no
     * indication. They were equal on the readings taken so far, which is the
     * kind of coincidence this repo has twice been caught by. Absent stays
     * absent, as it does for `authorizedNotionalUsd` on the next line.
     */
    headroomUsd: configured ? budget.headroomUsd : null,
    authorizedNotionalUsd: configured ? budget.effectiveNotionalUsd : null,
  };
}

/**
 * What the platform reports stopping this agent on the budget side.
 *
 * Over-subscription is carried alongside the block rather than folded into it:
 * the platform reports them separately, and an agent can be over-subscribed
 * without being blocked yet.
 */
function blockOf(budget: Budget): BudgetBlock | null {
  const blocked = budget.blockedReason !== null || budget.blockedSince !== null;
  if (!blocked && !budget.overSubscribed) return null;
  return {
    reason: budget.blockedReason,
    since: budget.blockedSince,
    overSubscribed: budget.overSubscribed,
  };
}
