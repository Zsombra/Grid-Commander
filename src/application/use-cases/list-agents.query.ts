import type { SlotUsage } from '@/domain/agent/agent.js';
import { hasCapacity } from '@/domain/agent/agent.js';
import type { AgentsPort, RosterResult } from '@/ports/agents.js';

export interface ListAgentsRequest {
  readonly userId: string;
  readonly accessToken: string;
}

export interface ListAgentsResponse {
  readonly roster: RosterResult;
  /**
   * Whether a create action should be offered at all, and what to say if not.
   *
   * Answered here rather than in the view, because the answer is a rule — the
   * limit is a function of rank and level — and a view that recomputed it would
   * be a second opinion on the platform's own number.
   */
  readonly creation: CreationAvailability;
}

export type CreationAvailability =
  | { readonly kind: 'available'; readonly remaining: number }
  | { readonly kind: 'at-capacity'; readonly explanation: string }
  | { readonly kind: 'unknown' };

export class ListAgentsQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: ListAgentsRequest): Promise<ListAgentsResponse> {
    const roster = await this.agents.listAgents(req);
    return { roster, creation: availability(roster) };
  }
}

function availability(roster: RosterResult): CreationAvailability {
  // A roster we could not read tells us nothing about capacity. Offering
  // creation would be a guess; refusing it would be a different guess. Say so.
  if (roster.kind === 'unreadable') return { kind: 'unknown' };
  // Same for a roster that came back without a capacity block. Unknown is not
  // at-capacity, and must not be rendered as one.
  if (roster.slots === null) return { kind: 'unknown' };
  return fromSlots(roster.slots);
}

/**
 * "No slots left" is unhelpful. "Recruit III allows 3" is actionable, and the
 * platform hands us the rank in the same response as the roster
 * (findings-agents F-4).
 */
function fromSlots(slots: SlotUsage): CreationAvailability {
  if (hasCapacity(slots)) return { kind: 'available', remaining: slots.remaining };
  return {
    kind: 'at-capacity',
    explanation:
      `You are using all ${slots.limit} of your agent slots. ` +
      `${slots.rankName} allows ${slots.limit}; ranking up raises the limit. ` +
      `Archiving an agent frees a slot.`,
  };
}
