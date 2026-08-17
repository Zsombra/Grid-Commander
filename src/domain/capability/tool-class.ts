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
  /**
   * Does this carry a consequence a person must agree to before it happens?
   *
   * **This product's judgement, not the platform's.** It is true when the
   * operation can destroy something unrecoverable *or* when it commits the
   * user's funds. BattleGrid annotates the one write that opens a real position
   * as *not* destructive, and keying the guard to that annotation is how the
   * confirmation came to be skipped on the only operation that spends money
   * (#340).
   *
   * The tool is deliberately not named here. A10 forbids a fund-committing tool
   * name anywhere outside `src/infrastructure/battlegrid/`, and the guard is
   * blunt on purpose — a name is the first step toward a call, and DL-7 of
   * `the-approval-can-be-answered` already ruled that weakening it for a comment
   * spends the guard for nothing. It caught this comment on the first run.
   *
   * Named `destructive` still, because it is what the audit column and every
   * caller already say. What changed is who decides it.
   */
  readonly destructive: boolean;
  /**
   * What BattleGrid said about the same question, kept as evidence.
   *
   * Recorded rather than obeyed. It has been measured wrong on five tools, and
   * a record of the disagreement is worth more than a field that silently
   * agrees. `undefined` where the platform offered no opinion.
   */
  readonly platformDestructiveHint?: boolean | undefined;
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
  /**
   * The authority this operation requires, when something can say.
   *
   * **BattleGrid publishes no per-tool scope** — a discovered tool carries
   * `annotations`, `description`, `execution`, `inputSchema`, `name`,
   * `outputSchema` and `title`, and none of them names an authority. So this is
   * set by the adapter from this product's own judgement
   * (`money-tools.ts`), which is the only place permitted to know tool names.
   *
   * It was declared and read here for four months with nothing setting it, while
   * a comment in `classify.ts` described it as already working. That is why
   * every known tool classified as `mcp:read` and the port's wager gate never
   * fired (#340).
   */
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
