import type { FailureCause } from '@/ports/failure.js';
import type { ColumnCheckOutcome, ColumnProposal, StrategiesPort } from '@/ports/strategies.js';

export type ColumnCheckResult =
  | ColumnCheckOutcome
  | { readonly kind: 'no-such-metric' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * A candidate column, checked against the platform's contract — a read.
 *
 * Only the *metric* is membership-checked here. Everything else in the
 * proposal — the transform, operands, parameters — goes to the platform as
 * composed, because its refusals are the lesson this surface exists to
 * show: the validator names the offending path, the received value, and
 * what is legal in its place. Pre-filtering locally would replace the
 * platform's teaching with this product's guess.
 */
export class CheckColumnQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    column: ColumnProposal;
  }): Promise<ColumnCheckResult> {
    const listed = await this.strategies.listMetrics(req);
    if (listed.kind === 'unreadable') return listed;
    if (!listed.metrics.some((m) => m.id === req.column.metric)) return { kind: 'no-such-metric' };

    try {
      return await this.strategies.columnContract(req);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { kind: 'unreadable', reason, cause: 'unreachable' };
    }
  }
}
