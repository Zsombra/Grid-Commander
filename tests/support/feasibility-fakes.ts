import type { FeasibilityAdvisory } from '@/domain/agent/feasibility.js';
import type { FeasibilityReply, FeasibilityReplyPort } from '@/ports/feasibility-reply.js';
import type { Clock } from '@/ports/clock.js';

/**
 * The carried reply, without the cookie.
 *
 * A page test is about what an operator reads, not about HMAC — the signing is
 * proved against the real adapter in `tests/agent/feasibility-reply.test.ts`,
 * where a tampered payload is an actual tampered payload rather than a fake
 * pretending to reject one. A double that re-implemented verification would be
 * a second answer to "is this trustworthy", and the second answer is always the
 * one nobody keeps current.
 *
 * What it does model faithfully is the two things a page depends on: a reply is
 * about one agent, and it was issued at a knowable moment. The staleness and
 * agent checks live in `ReadFeasibilityReplyQuery`, so they are exercised over
 * this fake exactly as they are over the cookie.
 */
export class InMemoryFeasibilityReplies implements FeasibilityReplyPort {
  private held: FeasibilityReply | null = null;

  constructor(private readonly clock?: Clock) {}

  issue(params: { agentId: string; advisory: FeasibilityAdvisory }): void {
    this.held = {
      agentId: params.agentId,
      issuedAt: this.clock?.now() ?? new Date(0),
      advisory: params.advisory,
      coinsCarried: true,
    };
  }

  read(): FeasibilityReply | null {
    return this.held;
  }

  /**
   * Plant a reply as it would arrive, including the two shapes an `issue` cannot
   * produce: one from another agent, and one whose coins did not fit.
   */
  plant(reply: FeasibilityReply): void {
    this.held = reply;
  }
}
