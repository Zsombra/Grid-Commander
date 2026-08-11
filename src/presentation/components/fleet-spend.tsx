import type { FleetSpendResult } from '@/ports/agents.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * What the fleet spent on model calls, said where the fleet is.
 *
 * The number the accept-as-tuition-or-cut-volume ruling runs on (#96): model
 * spend was the account's dominant cost line at its worst, and for a day it
 * was unmeasurable. This is the platform's own total — the one figure only
 * `get_agents_hub` publishes — and deliberately not a sum of the per-agent
 * figures, which would be this product's rival opinion on an accounting it
 * does not know. The per-agent figure has its own home on each agent's
 * limits page.
 */
export function FleetSpend({ spend }: { spend: FleetSpendResult }) {
  if (spend.kind === 'unreadable') {
    return (
      <div className="space-y-1 text-sm">
        <p>What the fleet spent on model calls could not be read: {spend.reason}</p>
        <WhyNotLoaded cause={spend.cause} subject="the fleet’s model spend is" />
      </div>
    );
  }

  if (spend.totalCost24hUsd === null) {
    return (
      <p className="text-sm">
        BattleGrid reported no figure for the fleet’s model spend — not a spend of zero.
      </p>
    );
  }

  return (
    <p className="text-sm">
      {`The fleet spent $${spend.totalCost24hUsd.toFixed(2)} on model calls in the last 24 hours`}
      {spend.activeAgents === null ? '' : ` across ${spend.activeAgents} active agent${spend.activeAgents === 1 ? '' : 's'}`}
      {' — BattleGrid’s own total.'}
    </p>
  );
}
