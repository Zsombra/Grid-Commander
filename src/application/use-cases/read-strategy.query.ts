import { isEditable, isRestorable, mustForkToEdit } from '@/domain/strategy/strategy.js';
import type { StrategiesPort, StrategyDetailResult } from '@/ports/strategies.js';
import type { StrategyDetail } from '@/domain/strategy/strategy.js';

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
  readonly forkToEdit: boolean;
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
    const result = await this.strategies.readStrategy(req);
    if (result.kind !== 'strategy') return result;

    const { summary } = result.detail;
    return {
      kind: 'strategy',
      detail: result.detail,
      can: {
        editable: isEditable(summary),
        forkToEdit: mustForkToEdit(summary),
        restorable: isRestorable(summary),
      },
    };
  }
}
