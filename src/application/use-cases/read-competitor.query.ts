import type {
  CompetitorFunnel,
  ExplorerPort,
  OpenPositions,
  PublicEvaluation,
  PublicResult,
  PublicTrade,
} from '@/ports/explorer.js';

export interface CompetitorView {
  readonly funnel: PublicResult<CompetitorFunnel>;
  readonly open: PublicResult<OpenPositions>;
  readonly trades: PublicResult<PublicTrade[]>;
  readonly evaluations: PublicResult<PublicEvaluation[]>;
}

/**
 * One competitor's public record.
 *
 * Four reads, kept apart and run together. Apart because they fail
 * independently — an agent whose trade list will not load still has a
 * funnel worth reading, and telling an operator "this competitor could not
 * be read" when three quarters of it answered would be a worse lie than
 * showing nothing. Together because they are four round trips to the same
 * platform about the same agent, and doing them in series would make the
 * page four times slower for no gain.
 */
export class ReadCompetitorQuery {
  constructor(private readonly explorer: ExplorerPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<CompetitorView> {
    const limit = req.limit ?? 10;
    const [funnel, open, trades, evaluations] = await Promise.all([
      this.explorer.readCompetitorPerformance(req),
      this.explorer.readCompetitorOpenPositions(req),
      this.explorer.readCompetitorTrades({ ...req, timeframe: 'LIFETIME', limit }),
      this.explorer.readCompetitorEvaluations({ ...req, limit }),
    ]);
    return { funnel, open, trades, evaluations };
  }
}
