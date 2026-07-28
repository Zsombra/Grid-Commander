/** Errors the domain raises. Infrastructure converts its own failures into these. */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * The underlying state moved on since the intent was formed.
 *
 * Deliberately carries no retry affordance. A blind retry would apply an intent
 * formed against a state that no longer exists — which is how an agent gets
 * rebound to a strategy its owner never saw. See architecture policy P4.
 */
export class RevisionConflictError extends DomainError {
  constructor(
    readonly resource: string,
    /** Null when the caller did not carry one. Never substituted with a sentinel. */
    readonly expectedRevision: number | null,
    readonly actualRevision: number | null,
  ) {
    super(
      `${resource} changed since you loaded it${revisionClause(expectedRevision, actualRevision)}.` +
        ' Your change was not applied.',
    );
  }
}

/**
 * Name the revisions only when they are known.
 *
 * An unknown expected revision used to render as `-1`, which told the user a
 * specific expectation the system never held. Saying less is honest; saying a
 * number that was invented is not.
 */
function revisionClause(expected: number | null, actual: number | null): string {
  if (expected === null && actual === null) return '';
  const parts: string[] = [];
  if (expected !== null) parts.push(`expected revision ${expected}`);
  if (actual !== null) parts.push(`now ${actual}`);
  return ` (${parts.join(', ')})`;
}

/** The connection does not hold the authority an operation needs. */
export class ScopeUnavailableError extends DomainError {
  constructor(readonly tool: string, readonly requiredScope: string) {
    super(
      `"${tool}" requires ${requiredScope} authority, which Grid-Commander does not request.`,
    );
  }
}

/** A destructive operation was attempted without a valid confirmation. */
export class ConfirmationRequiredError extends DomainError {
  constructor(readonly tool: string, readonly consequence: string) {
    super(`"${tool}" is destructive and needs confirmation: ${consequence}`);
  }
}

/** Capabilities could not be discovered, so only confirmed reads are permitted. */
export class DiscoveryUnavailableError extends DomainError {
  constructor(readonly tool: string) {
    super(
      `Configuration changes are unavailable: Grid-Commander could not confirm what "${tool}" does.`,
    );
  }
}

/** The authorization response did not correspond to a pending request. */
export class UntrustedCallbackError extends DomainError {
  constructor(reason: string) {
    super(`Authorization response refused: ${reason}`);
  }
}

/** The connection is gone or was revoked at BattleGrid. */
export class ConnectionRevokedError extends DomainError {
  constructor() {
    super('Your BattleGrid connection is no longer valid. Reconnect to continue.');
  }
}
