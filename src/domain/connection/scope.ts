/**
 * BattleGrid advertises exactly two scopes.
 *
 * Scope is NOT a safety boundary. `mcp:read` is write-capable: it can create
 * agents, rebind them to a different strategy, archive them, and apply strategy
 * plans that reach every bound agent immediately. Eleven of BattleGrid's 110
 * tools mutate on read scope alone; six of those are destructive.
 *
 * Nothing in this codebase may decide an operation is safe by inspecting scope.
 * See architecture policy P1.
 */
export const SCOPES = ['mcp:read', 'mcp:wager'] as const;
export type Scope = (typeof SCOPES)[number];

/** What Grid-Commander requests. Wager authority is never requested. */
export const REQUESTED_SCOPES: readonly Scope[] = ['mcp:read'];

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}

/**
 * Human-readable description of what a grant permits.
 *
 * Requirement "Configuration Authority Is Described Honestly" forbids calling
 * read scope read-only. If this wording is ever softened to sound friendlier,
 * that is a spec violation, not a copy change.
 */
export function describeScope(scope: Scope): string {
  switch (scope) {
    case 'mcp:read':
      return 'View your BattleGrid account, and create and change your agents and strategies';
    case 'mcp:wager':
      return 'Commit your funds — place entries and open trades';
  }
}
