import { AGENT_OWNED } from '@/domain/agent/field-ownership.js';
import type { ValueDisposition } from '@/domain/proposal/difference.js';
import { changesAnything, reconcile } from '@/domain/proposal/difference.js';
import type { Proposal } from '@/domain/proposal/proposal.js';
import { isStale } from '@/domain/proposal/proposal.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { Clock } from '@/ports/clock.js';
import type { ProposalStore } from '@/ports/proposals.js';
import type { DescribeEditQuery } from './describe-edit.query.js';

/**
 * What `UpdateAgentCommand` merges rather than replaces.
 *
 * One entry, and it has to stay in step with that command: `tradingConfig` is
 * the field whose proposed value is folded onto the agent's current config
 * rather than swapped for it, so it is the one whose difference has to be read
 * member by member. Every other agent-owned field is replaced whole, and
 * comparing those whole is right.
 */
const MERGED_FIELDS = ['tradingConfig'] as const;

export interface OpenProposalRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly id: string;
}

/**
 * A proposal, described against the world as it is **now**.
 *
 * Every branch below is a reason not to offer a confirmation, and each says so
 * differently. That matters more than it looks: a page with a disabled button
 * still implies the change is available, and a page with no explanation implies
 * the product is broken.
 */
export type OpenProposalResult =
  /** Ready to agree to. `consequence` and `confirmationToken` came from a describe run just now. */
  | {
      readonly kind: 'ready';
      readonly proposal: Proposal;
      readonly consequence: string;
      readonly confirmationToken: string;
      readonly dispositions: readonly ValueDisposition[];
    }
  /** Well-formed, but agreeing would change nothing. No confirmation is offered. */
  | {
      readonly kind: 'no-op';
      readonly proposal: Proposal;
      readonly reason: string;
      readonly dispositions: readonly ValueDisposition[];
    }
  /** The target is gone, ineligible, or the whole change is refused. */
  | { readonly kind: 'not-possible'; readonly proposal: Proposal; readonly reason: string }
  /** Already agreed to or declined. */
  | { readonly kind: 'resolved'; readonly proposal: Proposal }
  /** Open, but past the horizon. History. */
  | { readonly kind: 'stale'; readonly proposal: Proposal }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'unreadable'; readonly reason: string };

/**
 * Opening a proposal is where the ceremony begins — not where it is bypassed.
 *
 * The describe runs **here**, at open time, against the target read fresh. That
 * is the whole design: what a person agrees to is bound to the values in force
 * when they agree, not to a sentence computed when a model suggested it.
 *
 * Only `edit` is wired. The other operations in `PROPOSABLE` each need their own
 * describe, and offering a proposal that cannot be opened would be the "row a
 * human opens to find unusable" that `RecordProposalCommand` refuses to create.
 * They are absent from the MCP surface until their describe is wired here.
 */
export class OpenProposalQuery {
  constructor(
    private readonly proposals: ProposalStore,
    private readonly agents: AgentsPort,
    private readonly describeEdit: DescribeEditQuery,
    private readonly clock: Clock,
  ) {}

  async execute(req: OpenProposalRequest): Promise<OpenProposalResult> {
    let proposal: Proposal | null;
    try {
      proposal = await this.proposals.get({ userId: req.userId, id: req.id });
    } catch (error) {
      return {
        kind: 'unreadable',
        reason: error instanceof Error ? error.message : 'the proposal store did not answer',
      };
    }

    // Not-found covers another account's proposal too: the store scopes by
    // user, so "someone else's" and "no such thing" are the same answer here,
    // and that is the right one to give.
    if (!proposal) return { kind: 'not-found' };
    if (proposal.status !== 'open') return { kind: 'resolved', proposal };
    if (isStale(proposal, this.clock.now())) return { kind: 'stale', proposal };

    const changes = (proposal.proposedValues['changes'] ?? {}) as Readonly<Record<string, unknown>>;

    // Read the agent now. This is what makes the comparison honest — and what
    // makes a target that has since been archived say so instead of offering a
    // confirmation for a change that cannot happen.
    let current: Readonly<Record<string, unknown>>;
    try {
      const agent = await this.agents.getAgent({
        userId: req.userId,
        accessToken: req.accessToken,
        agentId: proposal.target,
      });
      current = Object.fromEntries(
        AGENT_OWNED.map((f) => [
          f,
          // `tradingConfig` is unwrapped to the fields themselves. The domain
          // holds it as `{ fields: {...} }`, and comparing a proposed
          // `{tradingMode: 'OFF'}` against that wrapper can only ever report a
          // change — including for an agent that is already off.
          f === 'tradingConfig'
            ? agent.tradingConfig?.fields
            : (agent as unknown as Record<string, unknown>)[f],
        ]),
      );
    } catch (error) {
      return {
        kind: 'not-possible',
        proposal,
        reason:
          error instanceof Error
            ? `This agent could not be read, so what the change would do cannot be established: ${error.message}`
            : 'This agent could not be read.',
      };
    }

    const described = await this.describeEdit.execute({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: proposal.target,
      changes,
    });

    if (described.kind === 'not-editable') {
      return { kind: 'not-possible', proposal, reason: described.reason };
    }

    if (described.kind === 'rejected') {
      const dispositions = reconcile({
        proposed: changes,
        current,
        refused: described.rejected,
        merged: MERGED_FIELDS,
      });
      return {
        kind: 'no-op',
        proposal,
        reason:
          'None of what was proposed can be applied to this agent. Every field is owned ' +
          'elsewhere or is not one this agent has.',
        dispositions,
      };
    }

    if (described.kind === 'no-op') {
      return {
        kind: 'no-op',
        proposal,
        reason: described.reason,
        dispositions: reconcile({ proposed: changes, current, refused: [], merged: MERGED_FIELDS }),
      };
    }

    const dispositions = reconcile({
      proposed: changes,
      current,
      refused: [],
      merged: MERGED_FIELDS,
    });

    /**
     * Described, but nothing in it would move.
     *
     * `describeEdit` returns a sentence for any `tradingConfig` present at all —
     * it compares against the agent's *name*, not against its config — so
     * "stop this agent", proposed for an agent already stopped, arrived here as
     * a perfectly good proposal with a confirmation attached.
     *
     * The page would then have shown a button to agree and, directly beneath
     * it, "nothing here would change the account". `changesAnything` existed to
     * catch exactly that and was consulted only by the component, which could
     * contradict the control above it but not remove it.
     */
    if (!changesAnything(dispositions)) {
      return {
        kind: 'no-op',
        proposal,
        reason:
          'Everything this proposal asks for is already the case. Agreeing would ' +
          'send a change that changes nothing.',
        dispositions,
      };
    }

    return {
      kind: 'ready',
      proposal,
      consequence: described.proposal.consequence,
      confirmationToken: described.proposal.confirmationToken,
      dispositions,
    };
  }
}
