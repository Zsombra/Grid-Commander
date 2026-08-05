/**
 * What a model has suggested, and nothing that can be spent.
 *
 * The MCP surface reads. It cannot write, because every write in this product
 * runs describe → confirm → perform with a token digest-bound to the values it
 * was formed against, and that design assumes a human read the consequence.
 * MCP gives that human no seat.
 *
 * A proposal is how a model participates anyway: it records an intent — which
 * operation, which target, which values — and stops. The consequence is
 * computed when a person opens it, against the world as it is then. So a
 * proposal confers no authority, and an old one is noise rather than danger.
 *
 * That last property is why the staleness horizon below is a product decision
 * rather than a safety control, and why it can be stated in hours without
 * anyone having to be careful.
 */

/**
 * The operations a proposal may name.
 *
 * Product operations, never BattleGrid tool names — the web route and the MCP
 * layer resolve the same vocabulary, so a name cannot come to mean two things
 * and a platform rename never reaches a migration.
 *
 * `applyPlan` is deliberately absent. Its describe takes a `CompiledPlan`
 * carrying a five-minute plan token, so its consequence cannot be recomputed
 * from a stored intent — and recompiling instead can legitimately return a
 * different plan, at which point the operator would be agreeing to something
 * the model never proposed. Not unsafe; unclear. See DL-1.
 */
export const PROPOSABLE = [
  'edit',
  'rebind',
  'archiveAgent',
  'deploy',
  'undeploy',
  'retuneRule',
  'archiveStrategy',
] as const;

export type ProposableOperation = (typeof PROPOSABLE)[number];

export function isProposable(operation: string): operation is ProposableOperation {
  return (PROPOSABLE as readonly string[]).includes(operation);
}

/** open until a person resolves it. Never `stale` — staleness is derived. */
export type ProposalStatus = 'open' | 'agreed' | 'declined';

export interface Proposal {
  readonly id: string;
  readonly userId: string;
  readonly operation: ProposableOperation;
  /** What it points at, in this product's terms. Shape belongs to the operation. */
  readonly target: string;
  /** The model's values, verbatim, so the page can show them beside the truth. */
  readonly proposedValues: Readonly<Record<string, unknown>>;
  readonly recordedAt: Date;
  readonly status: ProposalStatus;
  readonly resolvedAt: Date | null;
}

/**
 * How long a suggestion stays worth showing. **Not** how long an agreement
 * survives — that is `CONFIRMATION_TTL_SECONDS`, and it is 300.
 *
 * Safety does not rest on this number. A proposal holds no authority and the
 * consequence is computed fresh on open, so an eight-day-old one is not
 * dangerous. It is a signal-to-noise choice, made on three grounds: long
 * enough to cover a weekend, which 24 hours is not; short enough that the
 * queue stays read, which "never" is not; and never conflated with the
 * confirmation TTL, which would make the common path an expiry. See DL-2.
 */
export const STALE_AFTER_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Past the horizon, and therefore no longer actionable.
 *
 * Stale is not deleted. "A model suggested stopping this agent three days ago
 * and nobody looked" is exactly the thing an operator should be able to find
 * out, so a stale proposal stays visible as history.
 */
export function isStale(proposal: Proposal, now: Date): boolean {
  return now.getTime() - proposal.recordedAt.getTime() > STALE_AFTER_HOURS * HOUR_MS;
}

/** Only an open proposal inside the horizon can still be agreed to. */
export function isActionable(proposal: Proposal, now: Date): boolean {
  return proposal.status === 'open' && !isStale(proposal, now);
}

/**
 * What an operator is shown, with the horizon already applied.
 *
 * Derived here rather than in a view for the same reason `requiredSignals` is:
 * "four proposals" and "one you can act on, three that went stale" are
 * different claims, and a page computing it itself would be a second
 * implementation of the rule.
 */
export function partition(
  proposals: readonly Proposal[],
  now: Date,
): { readonly actionable: readonly Proposal[]; readonly stale: readonly Proposal[] } {
  return {
    actionable: proposals.filter((p) => isActionable(p, now)),
    stale: proposals.filter((p) => p.status === 'open' && isStale(p, now)),
  };
}
