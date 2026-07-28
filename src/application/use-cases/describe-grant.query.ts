import type { Scope } from '@/domain/connection/scope.js';
import { describeScope, REQUESTED_SCOPES } from '@/domain/connection/scope.js';

export interface GrantDescription {
  readonly scopes: readonly Scope[];
  readonly permissions: readonly string[];
  /** What is deliberately NOT being asked for. */
  readonly notRequested: readonly string[];
}

/**
 * What the user is being asked to grant, in words that are true.
 *
 * The requirement "Configuration Authority Is Described Honestly" forbids
 * calling read scope read-only, because it can rebind an agent's entire
 * configuration. This query is the single source of that wording so it cannot
 * drift between screens.
 */
export class DescribeGrantQuery {
  execute(scopes: readonly Scope[] = REQUESTED_SCOPES): GrantDescription {
    const notRequested = (['mcp:wager'] as const)
      .filter((s) => !scopes.includes(s))
      .map(describeScope);
    return {
      scopes,
      permissions: scopes.map(describeScope),
      notRequested,
    };
  }
}
