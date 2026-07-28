import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { Strategy } from '@/domain/strategy/strategy.js';
import { describeBlastRadius, isArchivable, isRestorable, mustForkToEdit } from '@/domain/strategy/strategy.js';
import type { LifecycleResult, StrategiesPort } from '@/ports/strategies.js';
import type { Clock } from '@/ports/clock.js';
import type { Randomness } from './connect.commands.js';

export interface ForkStrategyRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategy: Strategy;
}

export type ForkStrategyResult =
  | { readonly kind: 'forked'; readonly strategy: Strategy }
  | { readonly kind: 'refused'; readonly reason: string };

/**
 * A private copy is how a platform strategy is changed.
 *
 * The twelve SYSTEM personas cannot be edited, and offering an edit affordance on
 * them would promise something the platform refuses — the same mistake as a
 * delete button for an agent (AL-2).
 */
export class ForkStrategyCommand {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: ForkStrategyRequest): Promise<ForkStrategyResult> {
    const strategy = await this.strategies.forkStrategy({
      userId: req.userId,
      accessToken: req.accessToken,
      strategyId: req.strategy.id,
      // The revision the user was looking at, not "latest" — forking whatever
      // is current would copy a version they never saw.
      sourceRevision: req.strategy.revision,
    });
    return { kind: 'forked', strategy };
  }
}

export interface DescribeArchiveStrategyRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategy: Strategy;
}

export interface ArchiveStrategyProposal {
  readonly strategyId: string;
  readonly consequence: string;
  readonly confirmationToken: string;
}

export type DescribeArchiveStrategyResult =
  | { readonly kind: 'proposal'; readonly proposal: ArchiveStrategyProposal }
  | { readonly kind: 'refused'; readonly reason: string };

/**
 * Archiving accounts for what depends on the strategy.
 *
 * A strategy with four bound agents is not the same act as one with none, and
 * the count is the first thing said rather than a footnote.
 */
export class DescribeArchiveStrategyQuery {
  constructor(
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: DescribeArchiveStrategyRequest): Promise<DescribeArchiveStrategyResult> {
    const { strategy } = req;

    if (mustForkToEdit(strategy)) {
      return { kind: 'refused', reason: `"${strategy.name}" belongs to BattleGrid and cannot be archived.` };
    }
    if (!isArchivable(strategy)) {
      return { kind: 'refused', reason: `"${strategy.name}" is already archived.` };
    }

    const consequence =
      `"${strategy.name}" will be archived. ${describeBlastRadius(strategy.boundAgentCount)} ` +
      'Archiving is reversible, though BattleGrid may require the strategy to be ' +
      'rebuilt before it can be restored.';

    const confirmationToken = this.random.token(32);
    await this.confirmations.issue({
      token: confirmationToken,
      userId: req.userId,
      tool: 'archive_strategy',
      target: strategy.id,
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });

    return {
      kind: 'proposal',
      proposal: { strategyId: strategy.id, consequence, confirmationToken },
    };
  }
}

export interface SetStrategyActiveRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategy: Strategy;
  readonly active: boolean;
  readonly confirmationToken?: string | undefined;
}

export type SetStrategyActiveResult =
  | LifecycleResult
  | { readonly kind: 'refused'; readonly reason: string };

export class SetStrategyActiveCommand {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: SetStrategyActiveRequest): Promise<SetStrategyActiveResult> {
    const permitted = req.active ? isRestorable(req.strategy) : isArchivable(req.strategy);
    if (!permitted) {
      return {
        kind: 'refused',
        reason: req.active
          ? `"${req.strategy.name}" is not archived.`
          : `"${req.strategy.name}" cannot be archived.`,
      };
    }

    // `repair-required` comes back from here as its own case, not an error: the
    // strategy stays inactive and the way forward is the RESTORE arm of the
    // compile pipeline, which the user can actually do.
    return this.strategies.setActive({
      userId: req.userId,
      accessToken: req.accessToken,
      strategyId: req.strategy.id,
      active: req.active,
      confirmationToken: req.confirmationToken,
    });
  }
}

/** What to say when a restore comes back needing repair. */
export const REPAIR_REQUIRED_GUIDANCE =
  'BattleGrid cannot restore this strategy as it stands — its configuration no longer ' +
  'matches what the platform currently accepts. It stays archived. To bring it back, ' +
  'compile a RESTORE plan for it, review what would change, and apply that.';
