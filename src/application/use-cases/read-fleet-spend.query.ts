import type { AgentsPort, FleetSpendResult } from '@/ports/agents.js';

/**
 * What the fleet spent on model calls in the last 24 hours, as the platform
 * totals it.
 *
 * The number the operator's accept-as-tuition-or-cut-volume ruling runs on
 * (#96): model spend was the account's dominant cost line at its worst —
 * $3.39/24h against ~$0.80 of trading loss — and the ruling was blocked for a
 * day on a dead meter. The platform's own total is the only one rendered;
 * summing the per-agent figures into a rival total would be a second opinion
 * on an accounting this product does not know.
 */

export interface ReadFleetSpendRequest {
  readonly userId: string;
  readonly accessToken: string;
}

export class ReadFleetSpendQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: ReadFleetSpendRequest): Promise<FleetSpendResult> {
    return this.agents.readFleetSpend(req);
  }
}
