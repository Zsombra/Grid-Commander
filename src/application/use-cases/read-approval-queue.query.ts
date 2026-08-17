import type { FailureCause } from '@/ports/failure.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { Clock } from '@/ports/clock.js';
import type { PendingDecisionView } from './read-pending-decisions.query.js';
import { ReadPendingDecisionsQuery } from './read-pending-decisions.query.js';

/**
 * Every decision awaiting an answer, across all of the user's agents.
 *
 * BattleGrid has **no account-wide read** for entry decisions:
 * `list_entry_decisions` requires an agent id, so the account-wide question has
 * to be asked one agent at a time. That is the whole reason this query exists
 * separately from `ReadPendingDecisionsQuery` rather than being a flag on it —
 * the fan-out, and the partial failure it makes possible, are a different
 * problem from reading one agent's queue.
 *
 * It composes that query rather than re-reading the port itself, so the
 * answerable filter, the expiry derivation and the no-currency guarantee have
 * exactly one implementation.
 */

/**
 * One agent's waiting decisions, under the name the operator knows it by.
 *
 * The agent is carried **here** rather than on the view, deliberately.
 * `PendingDecisionView` is asserted to hold exactly `decision` and
 * `msRemaining` (`read-pending-decisions.test.ts`) — a guard whose point is that
 * there is nowhere on it for a currency amount to appear. Grouping keeps that
 * assertion exactly as strong while still letting the queue say who proposed
 * what, which the requirement obliges it to.
 */
export interface ApprovalQueueGroup {
  readonly agentId: string;
  readonly agentName: string;
  readonly decisions: readonly PendingDecisionView[];
}

/** An agent whose queue could not be read, and the platform's own reason. */
export interface UnreadableAgentQueue {
  readonly agentId: string;
  readonly agentName: string;
  readonly reason: string;
  readonly cause: FailureCause;
}

/**
 * Partial failure is a first-class answer, not an error and not an empty queue.
 *
 * With one read per agent, the common failure is that *some* of them answer. An
 * operator shown four agents' decisions and told nothing about the fifth would
 * reasonably conclude the fifth proposed nothing — on the one surface where
 * that mistake means a real trade expires unanswered. So every result carries
 * the agents that could not be read, including the results that also carry
 * decisions.
 *
 * `unreadable` at the top level is different again: it means the **roster**
 * could not be read, so the product cannot even name which agents it failed to
 * ask.
 */
export type ApprovalQueueResult =
  | {
      readonly kind: 'waiting';
      readonly groups: readonly ApprovalQueueGroup[];
      readonly unreadable: readonly UnreadableAgentQueue[];
    }
  | { readonly kind: 'none'; readonly unreadable: readonly UnreadableAgentQueue[] }
  | { readonly kind: 'no-agents' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export class ReadApprovalQueueQuery {
  private readonly perAgent: ReadPendingDecisionsQuery;

  constructor(
    private readonly agents: AgentsPort,
    clock: Clock,
  ) {
    this.perAgent = new ReadPendingDecisionsQuery(agents, clock);
  }

  async execute(req: { userId: string; accessToken: string }): Promise<ApprovalQueueResult> {
    const roster = await this.agents.listAgents(req);

    if (roster.kind === 'unreadable')
      return { kind: 'unreadable', reason: roster.reason, cause: roster.cause };
    if (roster.kind === 'empty') return { kind: 'no-agents' };

    const groups: ApprovalQueueGroup[] = [];
    const unreadable: UnreadableAgentQueue[] = [];

    // Sequential rather than concurrent: every one of these is a call against
    // the operator's own rate limit at BattleGrid, and a queue read is not worth
    // spending a burst on. The roster is small by construction — the platform
    // caps agent slots.
    for (const agent of roster.agents) {
      const result = await this.perAgent.execute({ ...req, agentId: agent.id });

      if (result.kind === 'unreadable') {
        unreadable.push({
          agentId: agent.id,
          agentName: agent.displayName,
          reason: result.reason,
          cause: result.cause,
        });
        continue;
      }
      if (result.kind === 'none') continue;

      groups.push({
        agentId: agent.id,
        agentName: agent.displayName,
        decisions: result.decisions,
      });
    }

    return groups.length === 0 ? { kind: 'none', unreadable } : { kind: 'waiting', groups, unreadable };
  }
}
