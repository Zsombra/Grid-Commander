import type { AgentsPort, JournalResult } from '@/ports/agents.js';

export interface ReadAgentJournalRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  readonly limit?: number | undefined;
}

export interface ReadAgentJournalResponse {
  readonly journal: JournalResult;
  /**
   * Whose record this is.
   *
   * Two records exist in this product and they answer different questions. The
   * journal answers "what did my agent think?"; the audit log answers "what did
   * *this product* do to my account?". Carrying the answer in the response,
   * rather than leaving the view to imply it, is what keeps the distinction from
   * eroding as surfaces are added.
   */
  readonly recordOf: 'agent';
  readonly heading: string;
}

export class ReadAgentJournalQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: ReadAgentJournalRequest): Promise<ReadAgentJournalResponse> {
    const journal = await this.agents.readJournal(req);
    return {
      journal,
      recordOf: 'agent',
      heading: "What this agent thought and did, as BattleGrid recorded it",
    };
  }
}
