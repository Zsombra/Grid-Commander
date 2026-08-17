import type { AgentsPort, EvaluationResult } from '@/ports/agents.js';

/**
 * One of the user's own evaluations, in full.
 *
 * Thin by design: one read, wrapped so the page depends on the application
 * layer rather than reaching into a port — the same shape as
 * `ReadEvaluationQuery`, which does this for a competitor's.
 */
export class ReadOwnEvaluationQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
    logId: string;
  }): Promise<EvaluationResult> {
    return this.agents.readOwnEvaluationDetail(req);
  }
}
