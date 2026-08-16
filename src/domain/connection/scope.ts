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

/**
 * What a step-up asks for: the standing scope, plus authority to commit funds.
 *
 * Deliberately a **separate** constant rather than a widening of
 * `REQUESTED_SCOPES`. The connection default is the product's central safety
 * claim — a user who never answers a decision must never be asked for more than
 * reading and configuration — and `tests/agent/wager.test.ts` A10 reads
 * `REQUESTED_SCOPES` out of this file by regex and fails if the word `wager`
 * appears in it. Keeping the two apart is what lets the guard stay true while
 * the step-up exists at all.
 *
 * `mcp:read` is carried alongside rather than dropped: a grant replaces what the
 * connection holds, so requesting wager alone would trade away the authority
 * every other surface in the product runs on.
 */
export const STEP_UP_SCOPES: readonly Scope[] = ['mcp:read', 'mcp:wager'];

/**
 * What the fund-committing step-up permits, in the words the operator reads.
 *
 * Single source, for the same reason `describeScope` is: the requirement
 * "Fund-Committing Authority Is Granted By A Step-Up The Operator Begins"
 * obliges the surface to state which operations the authority covers and that it
 * permits committing the user's money, and a second copy of that sentence is a
 * second chance for one of them to soften.
 */
export const STEP_UP_PERMITS: readonly string[] = [
  'Accept a trade one of your agents has proposed — this opens a position with your money',
  'Cancel a trade one of your agents has proposed — this commits nothing',
];
