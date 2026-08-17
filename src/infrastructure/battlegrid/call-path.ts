import type { AuditActor } from '@/domain/audit/audit-entry.js';
import type { AuditWriter } from '@/domain/audit/audit-repository.js';
import type {
  ConfirmationRefusalCause,
  ConfirmationStore,
} from '@/domain/capability/confirmation.js';
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
  /** Defaults to the user; the assistant marks its own reads. */
  readonly actor?: AuditActor | undefined;
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
    const { confirmationToken, target } = call;
    const confirmed = await deps.confirmations.consume(
      confirmationToken,
      call.userId,
      call.tool,
      target,
    );
    if (!confirmed) {
      /**
       * Which way it failed, because each cause has a different next step.
       * One composite sentence stood here for four situations, and the most
       * informative thing the page could say — "the values changed since you
       * agreed" — was unavailable. The diagnosis is a read-only post-mortem;
       * `consume` above stays the single atomic spender.
       */
      const cause = await deps.confirmations.diagnose(
        confirmationToken,
        call.userId,
        call.tool,
        target,
      );
      throw new ConfirmationRequiredError(call.tool, CONFIRMATION_REFUSALS[cause]);
    }
  }

  // 4. Record the attempt and commit, before anything is tried.
  return deps.audit.begin({
    userId: call.userId,
    actor: call.actor ?? 'user',
    tool: call.tool,
    destructive: cls.destructive,
    // Both facts, side by side. `cls.destructive` is what this product
    // concluded and is what the surface renders; the hint is what BattleGrid
    // claimed about the same operation, and on the write that opens a real
    // position the two disagree (#340). Recording the disagreement is worth
    // more than a row that silently agrees.
    platformDestructiveHint: cls.platformDestructiveHint ?? null,
    idempotencyKey: call.idempotencyKey ?? null,
  });
}

/** What to say for each way a confirmation can fail — each names a next step. */
const CONFIRMATION_REFUSALS: Readonly<Record<ConfirmationRefusalCause, string>> = {
  expired:
    'the confirmation expired — nothing is wrong; review the change and agree to it again',
  'already-used':
    'this confirmation was already used — the change may have landed; check its state before retrying',
  mismatched:
    'what was submitted is not what was agreed to — the values changed since the consequence was read; review it again',
  unknown: 'the confirmation is not recognised — start the change again',
};

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
