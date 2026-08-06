import type { BlockSummary } from '@/domain/agent/blocks.js';
import { summariseBlocks } from '@/domain/agent/blocks.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';

/**
 * What keeps stopping this agent.
 *
 * `ReadPipelineQuery` reads the ten most recent blocks as one of three stages,
 * which answers *what happened lately*. This answers *what is wrong*, which is
 * a different question with a different shape: the same ten rows summarised
 * say "INSUFFICIENT_EQUITY, ten times" and the list does not.
 *
 * Three outcomes, and the third is the one the type exists for. `none` means
 * the platform answered and nothing has stopped this agent — genuinely good
 * news. `unreadable` means no claim either way is honest, and reporting it as
 * `none` would tell someone their agent is fine on the strength of a failed
 * read.
 */
export type StoppageResult =
  | { readonly kind: 'summary'; readonly summary: BlockSummary }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * How many blocks to fold.
 *
 * The platform's own page maximum. Deliberately not paged to exhaustion: the
 * account carries agents with 118 and 122 blocks going back to April, and
 * walking all of them to count a reason that is obvious from the first hundred
 * spends the operator's rate limit on precision nobody asked for. The summary
 * carries `total` so the window is admitted rather than implied.
 */
const WINDOW = 100;

export class ReadStoppagesQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: {
    readonly userId: string;
    readonly accessToken: string;
    readonly agentId: string;
  }): Promise<StoppageResult> {
    const blocks = await this.agents.readGateBlocks({ ...req, limit: WINDOW });
    if (blocks.kind === 'unreadable') {
      return { kind: 'unreadable', reason: blocks.reason, cause: blocks.cause };
    }
    if (blocks.kind === 'none') return { kind: 'none' };
    return { kind: 'summary', summary: summariseBlocks(blocks.entries, blocks.total) };
  }
}
