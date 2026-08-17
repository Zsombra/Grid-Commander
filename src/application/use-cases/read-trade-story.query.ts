import type {
  AgentsPort,
  PositionAuditResult,
  TradeChart,
  TradeChartResult,
} from '@/ports/agents.js';

/**
 * How one trade unfolded: the platform's frozen chart, and the audit trail
 * of what position management did while the trade was open.
 *
 * The join is forced by the platform: `positionId` is carried by the chart
 * and by nothing else on a closed trade (the 26-key outcome row has no
 * position key — checked raw, 2026-08-08). So the chart read is also the
 * only address for the audit read, which makes the two reads one question.
 *
 * The audit half fails independently. A story whose trail cannot be read
 * still shows its chart — and a chart that names no position has a
 * trail with **no address**, which is `audit: null` here: not an empty
 * trail, not a failed one, but nothing to ask about. The three cases reach
 * the surface as three different sentences.
 */
export type TradeStoryResult =
  | {
      readonly kind: 'story';
      readonly chart: TradeChart;
      /** Null when the chart named no position to ask about. */
      readonly audit: PositionAuditResult | null;
    }
  /** The evaluation ran and never became a filled trade. Not an error. */
  | { readonly kind: 'no-trade' }
  /** No evaluation with that id belongs to that agent. */
  | { readonly kind: 'not-found' }
  | Extract<TradeChartResult, { kind: 'unreadable' }>;

export class ReadTradeStoryQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
    logId: string;
  }): Promise<TradeStoryResult> {
    const chart = await this.agents.readTradeChart(req);
    if (chart.kind !== 'chart') return chart;

    const positionId = chart.chart.positionId;
    if (positionId === null) return { kind: 'story', chart: chart.chart, audit: null };

    const audit = await this.agents.readPositionAudit({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: req.agentId,
      positionId,
    });
    return { kind: 'story', chart: chart.chart, audit };
  }
}
