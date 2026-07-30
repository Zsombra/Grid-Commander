import type { Scope } from '../connection/scope.js';

/**
 * What a BattleGrid tool does, as far as we can tell.
 *
 * This is the only thing in the system permitted to answer "is this safe?".
 * Scope does not answer it — see `scope.ts`.
 */
export interface ToolClass {
  /** Does invoking this change the user's account? */
  readonly mutating: boolean;
  /** Can invoking this destroy or replace something that cannot be recovered? */
  readonly destructive: boolean;
  /** The authority it needs, if any beyond a basic grant. */
  readonly requiredScope: Scope;
  /** Why it is classified this way. Carried so a refusal can explain itself. */
  readonly basis: ClassificationBasis;
}

export type ClassificationBasis =
  /** The server's own annotations said so. */
  | 'annotations'
  /** The tool was absent from the discovered set. Fail closed. */
  | 'unknown'
  /** Discovery failed; only a confirmed-read allowlist is trusted. */
  | 'degraded-allowlist';

/**
 * The shape BattleGrid reports for each tool. Every field is optional because
 * a future deployment may omit any of them, and a missing field must never be
 * read as a reassurance.
 */
export interface ToolAnnotations {
  readonly readOnlyHint?: boolean | undefined;
  readonly destructiveHint?: boolean | undefined;
  readonly idempotentHint?: boolean | undefined;
  readonly openWorldHint?: boolean | undefined;
}

export interface DiscoveredTool {
  readonly name: string;
  readonly description?: string | undefined;
  readonly annotations?: ToolAnnotations | undefined;
  /**
   * The JSON Schema the server reports for this tool's arguments.
   *
   * Carried opaquely — nothing in this product reads inside it. It exists so
   * that whatever answers questions can call a tool with the arguments the
   * server actually expects rather than with names it guessed. Optional,
   * because a deployment may stop reporting it, and a missing schema must not
   * be read as a reason to withhold the tool: the safety decision is made from
   * `annotations`, and it is made elsewhere.
   */
  readonly inputSchema?: Record<string, unknown> | undefined;
  /** Extracted from the tool's own schema/description text, when it says so. */
  readonly declaredScope?: Scope | undefined;
}

/**
 * The classification applied to anything we cannot positively identify.
 *
 * A tool missing from the discovered set may be new, and a new tool may be a
 * write. Treating the unknown as read-only would be a silent privilege
 * escalation, so the unknown is treated as the worst case. See policy P2.
 */
export const UNKNOWN_TOOL: ToolClass = {
  mutating: true,
  destructive: true,
  requiredScope: 'mcp:wager',
  basis: 'unknown',
};
