import type { FailureCause } from '@/ports/failure.js';
import type { MetricHints, StrategiesPort } from '@/ports/strategies.js';

export type MetricResult =
  | { readonly kind: 'metric'; readonly hints: MetricHints }
  | { readonly kind: 'no-such-metric' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * One metric's card. Membership first, the roster pattern: the key comes
 * from a URL, the platform enum-rejects unknown keys, and no unlisted key
 * is ever sent onward.
 */
export class ReadMetricQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    metric: string;
  }): Promise<MetricResult> {
    const listed = await this.strategies.listMetrics(req);
    if (listed.kind === 'unreadable') return listed;
    if (!listed.metrics.some((m) => m.id === req.metric)) return { kind: 'no-such-metric' };

    try {
      const hints = await this.strategies.metricHints(req);
      return { kind: 'metric', hints };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { kind: 'unreadable', reason, cause: 'unreachable' };
    }
  }
}
