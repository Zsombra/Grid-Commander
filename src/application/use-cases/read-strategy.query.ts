import { forkAffordance, isEditable, isRestorable } from '@/domain/strategy/strategy.js';
import type { StrategiesPort, StrategyDetailResult } from '@/ports/strategies.js';
import type { ForkAffordance, StrategyDetail } from '@/domain/strategy/strategy.js';

export interface ReadStrategyRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategyId: string;
}

/**
 * What may be done to this strategy.
 *
 * Decided here rather than on the page, the same way `StrategyListing` does it
 * for the roster. A route that asked the domain itself would be a second place
 * the rules live — and architecture policy forbids `app/` importing the domain
 * precisely so the answer cannot drift between the roster and the detail page.
 */
export interface StrategyAffordances {
  readonly editable: boolean;
  /** Withheld at capacity, with the reason — see `forkAffordance`. */
  readonly fork: ForkAffordance;
  readonly restorable: boolean;
}

export type ReadStrategyResponse =
  | { readonly kind: 'strategy'; readonly detail: StrategyDetail; readonly can: StrategyAffordances }
  | Exclude<StrategyDetailResult, { kind: 'strategy' }>;

/**
 * One strategy, whole.
 *
 * Thin by design. What the *view* needs to compute — which signals are
 * required, which carry weight — stays as domain functions on `StrategyDetail`,
 * because a presentation component may reach the domain and a route may not.
 * What the *route* needs to branch on comes back here, already decided.
 */
export class ReadStrategyQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: ReadStrategyRequest): Promise<ReadStrategyResponse> {
    /**
     * Two reads, because this page offers a fork and `get_strategy` does not
     * report the quota — only `list_strategies` does.
     *
     * The roster was the surface where twelve impossible fork controls were
     * found, and it would have been easy to gate it alone. This page offers the
     * same control for the same strategy one click away; fixing one and not the
     * other leaves the defect in place somewhere a test would not look.
     *
     * Concurrent, and the roster is allowed to fail: an unreadable roster means
     * no quota, which means *unknown*, which offers the fork rather than hiding
     * it. A second read must not be able to take a working control away.
     */
    const [result, roster] = await Promise.all([
      this.strategies.readStrategy(req),
      this.strategies.listStrategies(req),
    ]);
    if (result.kind !== 'strategy') return result;

    const { summary } = result.detail;
    return {
      kind: 'strategy',
      detail: result.detail,
      can: {
        editable: isEditable(summary),
        fork: forkAffordance(summary, roster.kind === 'strategies' ? roster.quota : null),
        restorable: isRestorable(summary),
      },
    };
  }
}
