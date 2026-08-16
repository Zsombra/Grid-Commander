import type { Scope } from '../connection/scope.js';
import type { DiscoveredTool, ToolClass } from './tool-class.js';
import { UNKNOWN_TOOL } from './tool-class.js';

/**
 * The small set of BattleGrid tools we are willing to call when discovery has
 * failed and we cannot ask the server what anything does.
 *
 * Architecture policy P2 forbids hard-coded tool lists, and this is the single
 * declared exception — permitted because it can only ever **deny**. It never
 * grants anything the live list would not have granted; it is a floor beneath
 * which we refuse, not a source of authority. Every entry is an unambiguous
 * getter whose name has been stable since the surface was first mapped.
 *
 * If a future change uses this list to permit a write, that is a violation.
 */
const DEGRADED_READ_ALLOWLIST: ReadonlySet<string> = new Set([
  'get_account_state',
  'get_leaderboard',
  'list_intelligence_agents',
  'list_strategies',
  'list_market_grid_sessions',
]);

/**
 * Classify a tool from what the server said about it.
 *
 * Pure, and deliberately so: every dangerous decision in this system funnels
 * through here, which is why it can be tested exhaustively without a network,
 * a database, or an account.
 */
export function classifyTool(tool: DiscoveredTool | undefined): ToolClass {
  if (!tool) return UNKNOWN_TOOL;

  const a = tool.annotations;

  // No annotations at all means the server told us nothing. That is not the
  // same as telling us it is safe.
  if (!a || a.readOnlyHint === undefined) return UNKNOWN_TOOL;

  const mutating = a.readOnlyHint === false;

  // destructiveHint is only meaningful for something that mutates. Where it is
  // absent on a mutating tool, assume the worst rather than the convenient.
  const platformSaysDestructive = mutating && (a.destructiveHint ?? true);

  // An operation requiring fund-committing authority carries a consequence a
  // person must agree to, whatever the platform says about it. BattleGrid
  // annotates the one write that opens a real position as *not* destructive,
  // and keying the gate to that annotation is how the confirmation came to be
  // skipped on the only operation that spends money (#340).
  //
  // The authority comes from `declaredScope`, which the adapter sets from this
  // product's own judgement — the domain names no tool.
  const commitsFunds = tool.declaredScope === 'mcp:wager';

  return {
    mutating,
    destructive: platformSaysDestructive || commitsFunds,
    platformDestructiveHint: a.destructiveHint,
    requiredScope: tool.declaredScope ?? defaultScope(),
    basis: 'annotations',
  };
}

/**
 * The authority assumed for an operation that declares none.
 *
 * **This used to claim more than it did.** It read: *"tools that genuinely need
 * wager authority say so, and are caught by `declaredScope`"* — describing a
 * mechanism with no producer. Nothing set `declaredScope`, so every known tool
 * classified as `mcp:read` and the port's wager gate could fire only on the
 * fail-closed unknown path. The comment is why that survived four months of
 * being read (#340).
 *
 * `declaredScope` now has a producer (`money-tools.ts`, via the adapter), so
 * this is the honest remainder: a tool nobody has judged to commit funds is
 * measured against the basic grant. It does not infer, and it never guesses
 * upward — guessing wager here would make the product refuse operations it is
 * entitled to perform. Unknown tools are a different case and still fail closed
 * through `UNKNOWN_TOOL`.
 */
function defaultScope(): Scope {
  return 'mcp:read';
}

/** Build a lookup from a discovered tool list. */
export function buildClassificationMap(
  tools: readonly DiscoveredTool[],
): ReadonlyMap<string, ToolClass> {
  const map = new Map<string, ToolClass>();
  for (const tool of tools) map.set(tool.name, classifyTool(tool));
  return map;
}

/**
 * Classify when discovery has failed.
 *
 * Anything on the allowlist is treated as a plain read. Everything else — which
 * is to say everything that could possibly change something — is refused.
 */
export function classifyDegraded(name: string): ToolClass {
  if (DEGRADED_READ_ALLOWLIST.has(name)) {
    return { mutating: false, destructive: false, requiredScope: 'mcp:read', basis: 'degraded-allowlist' };
  }
  return UNKNOWN_TOOL;
}

/** Exposed for the audit: the allowlist must be inspectable, not folklore. */
export function degradedAllowlist(): readonly string[] {
  return [...DEGRADED_READ_ALLOWLIST].sort();
}
