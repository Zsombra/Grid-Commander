import type {
  AgentsPort,
  EntryDecision,
  GateBlock,
  SignalEvaluation,
  StageResult,
} from '@/ports/agents.js';

/**
 * Why an agent did or did not trade, stage by stage.
 *
 * The three stages are read in parallel and kept apart: each can be empty
 * or unreadable on its own. An agent whose gate blocks fail to load still
 * has evaluations worth showing, and collapsing the three into one result
 * would let a single failure hide two working answers — the mistake
 * `RosterResult` was shaped to prevent, one surface out.
 */
export interface PipelineResult {
  readonly blocks: StageResult<GateBlock>;
  readonly evaluations: StageResult<SignalEvaluation>;
  readonly decisions: StageResult<EntryDecision>;
}

export class ReadPipelineQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<PipelineResult> {
    const [blocks, evaluations, decisions] = await Promise.all([
      this.agents.readGateBlocks(req),
      this.agents.readSignalLogs(req),
      this.agents.readEntryDecisions(req),
    ]);
    return { blocks, evaluations, decisions };
  }
}
