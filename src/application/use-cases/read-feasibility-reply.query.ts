import { isShowable } from '@/domain/agent/feasibility-reply.js';
import type { FeasibilityReply, FeasibilityReplyPort } from '@/ports/feasibility-reply.js';
import type { Clock } from '@/ports/clock.js';

/**
 * What BattleGrid said about this agent's tradeable coins on the way here.
 *
 * The advisory arrives on the reply to an agent edit and on no read, so this
 * asks nothing of the platform — it collects what the apply action set down a
 * redirect ago, and decides whether it is still worth showing.
 *
 * Two conditions, both refusals, both here rather than in the surface:
 *
 * - **Right agent.** A signature proves this product wrote the reply. It does
 *   not prove the reader is looking at the agent it was written about, and one
 *   agent's tradeable universe under another agent's name is a false statement
 *   that verifies perfectly.
 * - **Recent enough.** The advisory reads live volatility at the instant of the
 *   write. Age is measured here against the injected clock, never in the
 *   component — `boundaries.test.ts` holds that rule for rendering, and this is
 *   exactly the figure it was written about.
 *
 * `null` for all of it: absent, tampered, wrong agent, stale. The surface has
 * one nothing to render, because four slightly different nothings is what four
 * distinguishable empty states become.
 */
export class ReadFeasibilityReplyQuery {
  constructor(
    private readonly replies: FeasibilityReplyPort,
    private readonly clock: Clock,
  ) {}

  execute(req: { agentId: string }): FeasibilityReply | null {
    const reply = this.replies.read();
    if (!reply) return null;
    return isShowable(reply, req.agentId, this.clock.now()) ? reply : null;
  }
}
