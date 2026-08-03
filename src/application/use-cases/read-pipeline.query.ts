import type {
  AgentsPort,
  EntryDecision,
  FunnelResult,
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
  /**
   * How much this agent evaluated against how much it acted on.
   *
   * A fourth read, and the one that frames the other three: 245
   * evaluations behind 73 entries says something no list of ten rows can.
   * It fails independently like the rest.
   */
  readonly funnel: FunnelResult;
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
    const [funnel, blocks, evaluations, decisions] = await Promise.all([
      this.agents.readOwnFunnel(req),
      this.agents.readGateBlocks(req),
      this.agents.readSignalLogs(req),
      this.agents.readEntryDecisions(req),
    ]);
    return { funnel, blocks, evaluations, decisions };
  }
}
