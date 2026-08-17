import type { FailureCause } from '@/ports/failure.js';
import type { MetricSummary, StrategiesPort } from '@/ports/strategies.js';

/** One family's metrics, in the platform's listing order. */
export interface MetricFamilyGroup {
  readonly family: string;
  readonly metrics: readonly MetricSummary[];
}

export type MetricIndexResult =
  | { readonly kind: 'index'; readonly families: readonly MetricFamilyGroup[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * The metric index, grouped by family. Zero metrics renders as unreadable
 * for the same reason zero signals does: the vocabulary is the platform's
 * own catalogue, and "none exist" is not this product's claim to make.
 */
export class ReadMetricIndexQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: { userId: string; accessToken: string }): Promise<MetricIndexResult> {
    const listed = await this.strategies.listMetrics(req);
    if (listed.kind === 'unreadable') return listed;
    if (listed.metrics.length === 0) {
      return {
        kind: 'unreadable',
        reason: 'BattleGrid listed no report metrics — the vocabulary did not load',
        cause: 'unreachable',
      };
    }

    const order: string[] = [];
    const byFamily = new Map<string, MetricSummary[]>();
    for (const metric of listed.metrics) {
      const group = byFamily.get(metric.family);
      if (group) group.push(metric);
      else {
        order.push(metric.family);
        byFamily.set(metric.family, [metric]);
      }
    }
    return {
      kind: 'index',
      families: order.map((family) => ({ family, metrics: byFamily.get(family) ?? [] })),
    };
  }
}
