import type { AgentsPort } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';
import type { ExposureTotals, OpenPosition, PositionsPort } from '@/ports/positions.js';

/**
 * What one agent has at stake, and what it tried to stake and could not.
 *
 * Two questions on one surface because an operator asks them together: *is my
 * money in the market right now*, and *is this agent actually able to get it
 * there*. Both were answerable from reads this product already had, and
 * neither was shown.
 */

/**
 * Entries that never became an order.
 *
 * Derived from the funnel the pipeline page already renders — no new read.
 * What changes is that a count becomes a statement: `/pipeline` shows
 * "27 executed · 28 failed · 5 expired" in a row of figures, which is where 28
 * looks like a number rather than half of everything the agent decided.
 */
export interface FillFailures {
  readonly failed: number;
  readonly executed: number;
  /** How many entries were decided in total, which is what makes it mean something. */
  readonly decided: number;
  /**
   * More failed than succeeded.
   *
   * The platform's own two counts set against each other, rather than a
   * threshold this product picked. On the account this was built against:
   * 28 failed, 27 executed.
   */
  readonly dominant: boolean;
  /**
   * The platform's own fill rate, carried separately and labelled as theirs.
   *
   * Deliberately not reconciled with the counts: BattleGrid reported
   * `fillRatePercent: 63` where 27 of 60 is 45%, so the two are computed
   * differently and this product does not know how. Showing them as one figure
   * would invent an agreement that does not exist.
   */
  readonly platformFillRatePercent: number | null;
}

export type ExposureView =
  | {
      readonly kind: 'holding';
      readonly positions: readonly OpenPosition[];
      /** Account-wide, so a single agent's page can say what else is at risk. */
      readonly totals: ExposureTotals;
    }
  | { readonly kind: 'flat' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export interface AgentExposure {
  readonly exposure: ExposureView;
  /** Null when the funnel could not be read, or the agent decided nothing. */
  readonly fills: FillFailures | null;
}

export class ReadExposureQuery {
  constructor(
    private readonly positions: PositionsPort,
    private readonly agents: AgentsPort,
  ) {}

  async execute(req: {
    readonly userId: string;
    readonly accessToken: string;
    readonly agentId: string;
  }): Promise<AgentExposure> {
    // Independent reads, kept independent: an unreadable funnel must not blank
    // a position that answered, and vice versa. The pipeline page's rule, one
    // surface out.
    const [active, funnel] = await Promise.all([
      this.positions.readActivePositions(req),
      this.agents.readOwnFunnel(req),
    ]);

    return { exposure: view(active, req.agentId), fills: fills(funnel) };
  }
}

function view(
  active: Awaited<ReturnType<PositionsPort['readActivePositions']>>,
  agentId: string,
): ExposureView {
  if (active.kind === 'unreadable') {
    return { kind: 'unreadable', reason: active.reason, cause: active.cause };
  }
  // The platform answered with nothing open anywhere on the account, so this
  // agent is flat. Distinct from a read that failed.
  if (active.kind === 'none') return { kind: 'flat' };

  const mine = active.exposure.positions.filter((p) => p.agentId === agentId);
  if (mine.length === 0) return { kind: 'flat' };
  return { kind: 'holding', positions: mine, totals: active.exposure.totals };
}

function fills(funnel: Awaited<ReturnType<AgentsPort['readOwnFunnel']>>): FillFailures | null {
  if (funnel.kind !== 'funnel') return null;
  const { failed, executed, enterDecisions, fillRatePercent } = funnel.funnel;
  // An agent that has decided no entries has no fill record — reporting
  // "0 of 0 failed" would be a finding about nothing.
  if (failed === null || executed === null || enterDecisions === null) return null;
  if (enterDecisions === 0) return null;
  return {
    failed,
    executed,
    decided: enterDecisions,
    dominant: failed >= executed && failed > 0,
    platformFillRatePercent: fillRatePercent,
  };
}
