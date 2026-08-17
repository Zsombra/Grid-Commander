import type { Scope } from '@/domain/connection/scope.js';

/**
 * Which BattleGrid operations this product judges to commit the user's funds.
 *
 * **This is our judgement, not the platform's.** BattleGrid annotates each tool
 * with a `destructiveHint`, and on the one operation that opens a real position
 * it says `false`:
 *
 * ```
 * accept_entry_decision   destructiveHint: false   opens a position
 * cancel_entry_decision   destructiveHint: true    declines a proposal
 * ```
 *
 * Keyed to that annotation, the port's confirmation gate skipped the write that
 * spends money and stopped the one that does not. Recorded as #340, measured
 * through the real classifier and the real guard rather than argued.
 *
 * ## Why only the reachable ones are named here
 *
 * A10 (`tests/agent/wager.test.ts`) has two halves. The first forbids a
 * still-unreleased fund-committing tool name **anywhere** in `src/` or `app/` —
 * so those names cannot appear in this file, and must not be added to it. Their
 * protection is structural and stronger than a classification: **you cannot call
 * what you cannot name.** They live in `tests/support/money-tools.ts`, where the
 * guard reads them.
 *
 * The second half confines the released pair to `src/infrastructure/battlegrid/`,
 * which is where this file is. So this list holds exactly the fund-committing
 * tools the product can actually reach, and grows by one deliberate move when a
 * change releases another — the same move DL-10 of `the-approval-can-be-answered`
 * performed by hand.
 *
 * ## Why the adapter and not the domain
 *
 * `src/domain/capability/classify.ts` must name no tool: A10 half 1 forbids it,
 * and P6 ("one way in") keeps tool names inside the adapter regardless. The
 * domain reads `DiscoveredTool.declaredScope`, which is declared and was set by
 * nothing until this module existed — `classify.ts` already described this
 * mechanism as working, four months before it did.
 */
export const REACHABLE_MONEY_TOOLS: Readonly<Record<string, string>> = {
  accept_entry_decision: 'opens a position at real size with the user’s money',
  cancel_entry_decision:
    'commits nothing, but BattleGrid demands wager authority for it — which is exactly why scope is never read as a safety boundary',
} as const;

/** The authority a fund-committing operation is measured against. */
export const MONEY_SCOPE: Scope = 'mcp:wager';

/**
 * Whether this product judges an operation to commit funds.
 *
 * Deliberately a lookup and not a heuristic. A rule inferring "money" from a
 * tool's name or arguments would be guessing about someone else's account, and
 * `accept_entry_decision`'s only argument is `{decisionId}` — there is nothing
 * in the call that says money.
 */
export function commitsFunds(tool: string): boolean {
  return Object.prototype.hasOwnProperty.call(REACHABLE_MONEY_TOOLS, tool);
}

/**
 * The scope a discovered tool declares, or `undefined` to leave it inferred.
 *
 * This is the producer `DiscoveredTool.declaredScope` never had. The adapter
 * calls it while mapping `tools/list`; the domain keeps reading the field
 * exactly as it always did.
 */
export function declaredScopeFor(tool: string): Scope | undefined {
  return commitsFunds(tool) ? MONEY_SCOPE : undefined;
}
