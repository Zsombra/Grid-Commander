import type { EvaluationDetail, ExplorerPort, PublicResult } from '@/ports/explorer.js';

/**
 * One public evaluation, in full.
 *
 * A single read, so this class is thin on purpose — it exists so the page
 * depends on the application layer rather than reaching into a port
 * directly, the same as every other surface here.
 */
export class ReadEvaluationQuery {
  constructor(private readonly explorer: ExplorerPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
    logId: string;
  }): Promise<PublicResult<EvaluationDetail>> {
    return this.explorer.readCompetitorEvaluationDetail(req);
  }
}
