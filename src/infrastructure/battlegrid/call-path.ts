import type { AuditWriter } from '@/domain/audit/audit-repository.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import type { ToolClass } from '@/domain/capability/tool-class.js';
import type { Scope } from '@/domain/connection/scope.js';
import {
  ConfirmationRequiredError,
  DiscoveryUnavailableError,
  RevisionConflictError,
  ScopeUnavailableError,
} from '@/domain/errors.js';

/**
 * The sequence every mutating call goes through, in one place.
 *
 * Extracted from the adapter so it can be tested without an MCP client, and so
 * there is exactly one implementation of the order these checks happen in.
 * The order matters: classification comes before the scope check, because scope
 * is not a safety boundary and must never be the thing that decides.
 */
export interface CallPathDeps {
  readonly audit: AuditWriter;
  readonly confirmations: ConfirmationStore;
  readonly heldScopes: readonly Scope[];
}

export interface GuardedCall {
  readonly userId: string;
  readonly tool: string;
  readonly classification: ToolClass;
  readonly confirmationToken?: string | undefined;
  readonly target?: string | undefined;
  readonly idempotencyKey?: string | undefined;
}

/**
 * Run the guards and open an audit record. Returns the audit entry id, which
 * the caller MUST complete.
 *
 * Throws before any audit row is written when a guard refuses — a refused
 * operation was never attempted, and recording it as attempted would be a lie
 * in the other direction.
 */
export async function beginGuardedCall(
  deps: CallPathDeps,
  call: GuardedCall,
): Promise<string> {
  const { classification: cls } = call;

  // 1. Discovery failed and we cannot say what this does.
  if (cls.basis === 'degraded-allowlist' && cls.mutating) {
    throw new DiscoveryUnavailableError(call.tool);
  }
  if (cls.basis === 'unknown' && cls.mutating) {
    // Unknown tools classify as destructive; refusing here is what "fail
    // closed" means in practice.
    throw new DiscoveryUnavailableError(call.tool);
  }

  // 2. Authority we do not hold. Refused BEFORE the attempt, per R3.
  if (!deps.heldScopes.includes(cls.requiredScope)) {
    throw new ScopeUnavailableError(call.tool, cls.requiredScope);
  }

  // 3. Destructive operations need evidence a human saw the consequence.
  if (cls.destructive) {
    if (!call.confirmationToken || !call.target) {
      throw new ConfirmationRequiredError(call.tool, 'no confirmation was supplied');
    }
    const confirmed = await deps.confirmations.consume(
      call.confirmationToken,
      call.userId,
      call.tool,
      call.target,
    );
    if (!confirmed) {
      throw new ConfirmationRequiredError(
        call.tool,
        'the confirmation was invalid, expired, already used, or issued for something else',
      );
    }
  }

  // 4. Record the attempt and commit, before anything is tried.
  return deps.audit.begin({
    userId: call.userId,
    tool: call.tool,
    destructive: cls.destructive,
    idempotencyKey: call.idempotencyKey ?? null,
  });
}

/** BattleGrid's way of saying the state moved on. */
const CONFLICT_MARKERS = ['expectedrevision', 'revision mismatch', 'revision drift', 'conflict'];

/**
 * Convert an infrastructure failure into a domain error.
 *
 * A revision conflict becomes `RevisionConflictError`, which carries no retry
 * affordance — see policy P4. Nothing in this file retries anything.
 */
export function toDomainError(err: unknown, resource: string, expectedRevision?: number): Error {
  const message = err instanceof Error ? err.message : String(err);
  const lowered = message.toLowerCase();
  if (CONFLICT_MARKERS.some((m) => lowered.includes(m))) {
    // Null, not a sentinel. The production call path carries no revision, and a
    // fabricated one would put a number the system never expected in front of
    // the user. See PG-003.
    return new RevisionConflictError(resource, expectedRevision ?? null, null);
  }
  return err instanceof Error ? err : new Error(message);
}
