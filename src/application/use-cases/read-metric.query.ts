import type { FailureCause } from '@/ports/failure.js';
import type { ColumnControls, MetricHints, StrategiesPort } from '@/ports/strategies.js';

/**
 * The shared vocabulary for a hints read. `ComposeColumnQuery` returns this
 * same type for its embedded hints, so the two surfaces cannot come to
 * disagree about what a hints failure is.
 */
export type MetricResult =
  | { readonly kind: 'metric'; readonly hints: MetricHints }
  | { readonly kind: 'no-such-metric' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * What the metric workbench renders: the hints, plus the declared column
 * controls the check form offers. The controls ride the same outcome rather
 * than a second query so the page cannot show a form whose selects came from
 * a different platform moment than its card.
 */
export type MetricWorkbenchResult =
  | {
      readonly kind: 'metric';
      readonly hints: MetricHints;
      readonly controls: ColumnControls;
    }
  | { readonly kind: 'no-such-metric' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * One metric's card. Membership first, the roster pattern: the key comes
 * from a URL, the platform enum-rejects unknown keys, and no unlisted key
 * is ever sent onward — which is also why the controls read waits for the
 * membership check instead of racing it: an unlisted metric spends nothing.
 */
export class ReadMetricQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    metric: string;
  }): Promise<MetricWorkbenchResult> {
    const listed = await this.strategies.listMetrics(req);
    if (listed.kind === 'unreadable') return listed;
    if (!listed.metrics.some((m) => m.id === req.metric)) return { kind: 'no-such-metric' };

    try {
      // Independent of each other: the hints come from the metric's card, the
      // controls from the tool declaration. Same ordering as ComposeColumnQuery.
      const [hints, controls] = await Promise.all([
        this.strategies.metricHints(req),
        this.strategies.columnControls(req),
      ]);
      return { kind: 'metric', hints, controls };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { kind: 'unreadable', reason, cause: 'unreachable' };
    }
  }
}
