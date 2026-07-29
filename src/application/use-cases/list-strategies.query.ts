import type { Strategy, StrategyQuota } from '@/domain/strategy/strategy.js';
import { describeBlastRadius, hasCapacity, isEditable, mustForkToEdit } from '@/domain/strategy/strategy.js';
import type { StrategiesPort, StrategyListResult } from '@/ports/strategies.js';

export interface StrategyListing {
  readonly strategy: Strategy;
  /** Stated for zero as plainly as for five — see `describeBlastRadius`. */
  readonly governs: string;
  readonly editable: boolean;
  readonly forkToEdit: boolean;
}

export type ForkAvailability =
  | { readonly kind: 'available'; readonly remaining: number }
  | { readonly kind: 'at-capacity'; readonly explanation: string }
  | { readonly kind: 'unknown' };

export interface ListStrategiesResponse {
  readonly result: StrategyListResult;
  readonly listings: readonly StrategyListing[];
  readonly forking: ForkAvailability;
}

export class ListStrategiesQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: { userId: string; accessToken: string }): Promise<ListStrategiesResponse> {
    const result = await this.strategies.listStrategies(req);
    if (result.kind === 'unreadable') {
      return { result, listings: [], forking: { kind: 'unknown' } };
    }

    // An empty catalog and an unreadable one both produce no listings, and they
    // are different facts about the account — the surface is handed which one it
    // is rather than inferring it from a length.
    //
    // `forking` is `unknown` here rather than `available`: the platform reported
    // no strategies, so it reported no quota either, and inventing a remaining
    // count would be the fabrication this product refuses everywhere else.
    if (result.kind === 'empty') {
      return { result, listings: [], forking: { kind: 'unknown' } };
    }

    return {
      result,
      listings: result.strategies.map((strategy) => ({
        strategy,
        governs: describeBlastRadius(strategy.boundAgentCount),
        editable: isEditable(strategy),
        forkToEdit: mustForkToEdit(strategy),
      })),
      forking: availability(result.quota),
    };
  }
}

function availability(quota: StrategyQuota | null): ForkAvailability {
  if (quota === null) return { kind: 'unknown' };
  if (hasCapacity(quota)) return { kind: 'available', remaining: quota.remaining };
  return {
    kind: 'at-capacity',
    explanation:
      `You have all ${quota.limit} of your strategies. Archive one to make room, ` +
      'or edit a strategy you already own.',
  };
}
