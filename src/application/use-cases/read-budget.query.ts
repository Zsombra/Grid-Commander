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

export type ReadBudgetResult =
  | {
      readonly kind: 'budget';
      readonly limits: readonly Limit[];
      /** Named, because four calm rows do not say "this agent has no limits". */
      readonly unbounded: readonly string[];
      readonly warnings: readonly string[];
      readonly halted: boolean;
      readonly budget: Budget;
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
