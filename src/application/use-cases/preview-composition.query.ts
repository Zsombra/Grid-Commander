import type {
  CoinSelection,
  ReportPreviewOutcome,
  RuleMembership,
  StrategiesPort,
} from '@/ports/strategies.js';
import type { Strategy } from '@/domain/strategy/strategy.js';

export type PreviewCompositionResult =
  | {
      readonly kind: 'ready';
      readonly strategy: Strategy;
      readonly outcome: ReportPreviewOutcome;
      readonly membership: readonly RuleMembership[];
    }
  | { readonly kind: 'strategy-missing' }
  | { readonly kind: 'unreadable'; readonly reason: string };

/**
 * The agent's-eye view of a strategy's current composition, live and
 * write-free: the rendered report over a bounded coin selection, and which
 * signals that composition can feed. The strategy is read fresh — the
 * preview describes what the platform holds now, not what a stale page
 * remembered. A refused draft is a distinct outcome carrying the
 * platform's words; a failed read never renders as an empty preview.
 */
export class PreviewCompositionQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    strategyId: string;
    coinSelection: CoinSelection;
  }): Promise<PreviewCompositionResult> {
    const read = await this.strategies.readStrategy(req);
    if (read.kind === 'missing') return { kind: 'strategy-missing' };
    if (read.kind === 'unreadable') return { kind: 'unreadable', reason: read.reason };

    const { detail } = read;
    try {
      const [outcome, membership] = await Promise.all([
        this.strategies.previewReport({
          userId: req.userId,
          accessToken: req.accessToken,
          timeframe: detail.summary.timeframe,
          regimeAutoDerive: detail.regimeAutoDerive,
          regimeTimeframe: detail.regimeTimeframe,
          sections: detail.sections,
          coinSelection: req.coinSelection,
        }),
        this.strategies.deriveRuleView({
          userId: req.userId,
          accessToken: req.accessToken,
          sections: detail.sections,
        }),
      ]);
      return { kind: 'ready', strategy: detail.summary, outcome, membership };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { kind: 'unreadable', reason };
    }
  }
}
