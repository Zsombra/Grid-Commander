import type { AgentsPort } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';

export type ReadLossShapeResult =
  | {
      readonly kind: 'loss-shape';
      /** Signed dollars since the budget baseline, or null when unreported. */
      readonly realizedPnlUsd: number | null;
      /** Oldest first — the order a curve is drawn in. */
      readonly curve: readonly number[];
      /** Count of the points kept, which is what the caption states. */
      readonly settlements: number;
    }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * How the loss behind the stop arrived.
 *
 * Lives here rather than in the page for the same reason as `ReadBudgetQuery`:
 * `app/` may not import the domain, and the empty curve carries a meaning the
 * page must not re-derive — the platform states that an empty curve means no
 * settlements yet, not missing data, and this result keeps that distinction
 * from `unreadable` alive at the call site.
 */
export class ReadLossShapeQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<ReadLossShapeResult> {
    const result = await this.agents.readPerformance(req);
    if (result.kind === 'unreadable') {
      return { kind: 'unreadable', reason: result.reason, cause: result.cause };
    }
    const { reading } = result;
    return {
      kind: 'loss-shape',
      realizedPnlUsd: reading.realizedPnlUsd,
      curve: reading.curve,
      settlements: reading.curve.length,
    };
  }
}
