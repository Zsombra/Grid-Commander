import type {
  CoinSelection,
  ReportPreviewOutcome,
  RuleMembership,
  StrategiesPort,
} from '@/ports/strategies.js';
import type { Strategy } from '@/domain/strategy/strategy.js';
import type { FailureCause } from '@/ports/failure.js';

export type PreviewCompositionResult =
  | {
      readonly kind: 'ready';
      readonly strategy: Strategy;
      readonly outcome: ReportPreviewOutcome;
      readonly membership: readonly RuleMembership[];
      /**
       * How many conditions the strategy defines.
       *
       * Carried so the surface can tell two empty outcome lists apart: a
       * strategy that decides direction by signals alone, and one that defines
       * conditions the platform returned no outcome for. Counted here rather
       * than on the page — the page holds the summary, not the detail, and a
       * surface deriving it would be a second answer to the same question.
       */
      readonly conditionsDefined: number;
    }
  | { readonly kind: 'strategy-missing' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * The agent's-eye view of a strategy's current composition, live and
 * write-free: the rendered report over a bounded coin selection, which
 * signals that composition can feed, and how the strategy's conditions
 * resolve against those same coins. The strategy is read fresh — the
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
    // The adapter classified this with the error in hand; carrying its verdict
    // is the whole point of `FailureCause`. Re-deriving one here would be a
    // second, worse copy of a judgement already made.
    if (read.kind === 'unreadable') {
      return { kind: 'unreadable', reason: read.reason, cause: read.cause };
    }

    const { detail } = read;
    try {
      const [outcome, membership] = await Promise.all([
        this.strategies.previewReport({
          userId: req.userId,
          accessToken: req.accessToken,
          timeframe: detail.summary.timeframe,
          sections: detail.sections,
          coinSelection: req.coinSelection,
          // The strategy's own conditions, sent so the platform resolves them
          // against the same coins the report is rendered from. This is the
          // only surface holding live market state, so it is the only place
          // "would this rule fire right now" can be asked at all — and they go
          // back exactly as they arrived, never rebuilt from `detail`.
          conditions: read.conditionsAsGiven,
        }),
        this.strategies.deriveRuleView({
          userId: req.userId,
          accessToken: req.accessToken,
          sections: detail.sections,
        }),
      ]);
      return {
        kind: 'ready',
        strategy: detail.summary,
        outcome,
        membership,
        conditionsDefined: detail.conditions.length,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // A throw out of the port is no usable answer, whatever caused it — the
      // same reading `CheckColumnQuery` and `ReadMetricQuery` take. Calling it
      // a refusal would send an author to fix an authority that is working.
      return { kind: 'unreadable', reason, cause: 'unreachable' };
    }
  }
}
