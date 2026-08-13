/** Errors the domain raises. Infrastructure converts its own failures into these. */

import type { Remedy } from './connection/remedy.js';
import { describeRemedy } from './connection/remedy.js';

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

/**
 * Capabilities could not be discovered, so only confirmed reads are permitted.
 *
 * The message used to open `Configuration changes are unavailable:` — asserting
 * a category the operation may not belong to. During the 2026-08-05 outage the
 * refusal that reached `/explorer` was for `get_agent_explorer`, a **read**:
 * with discovery down it classified as unknown, unknown fails closed as
 * destructive, and an operator trying to look at the field was told that
 * configuration changes were unavailable.
 *
 * The refusal is correct — see `Unrecognised Operations Are Treated As
 * Dangerous`. Naming what was refused is not the same as naming what it was,
 * and this only ever knew the former.
 */
export class DiscoveryUnavailableError extends DomainError {
  constructor(readonly tool: string) {
    super(
      `Grid-Commander could not confirm what "${tool}" does, so it did not call it. ` +
        'Until BattleGrid can be asked what its operations do, anything not already ' +
        'known to be a read is refused.',
    );
  }
}

/** The authorization response did not correspond to a pending request. */
export class UntrustedCallbackError extends DomainError {
  constructor(reason: string) {
    super(`Authorization response refused: ${reason}`);
  }
}

/**
 * The authorization succeeded and the account behind it could not be named.
 *
 * A connection is keyed by BattleGrid's id for the account, so without one there
 * is nothing to store the connection under — and any placeholder would collide
 * every unidentified connection on a single key, handing the second user the
 * first one's workspace. Nothing is stored, and the grant is released.
 *
 * **`released` is the second sentence a user needs.** The grant was live at the
 * moment this was raised: they consented, the code was exchanged, and BattleGrid
 * holds an active authorization. When the release also fails, authority *may*
 * still stand at BattleGrid — may, not does, because a failed revoke is not
 * proof the grant survived — and the person is owed that, plus where to withdraw
 * it. Telling them the connection simply failed would be the local-deletion
 * mistake `DisconnectCommand` exists to refuse.
 *
 * **It carries no token.** The refusal path is the one place in this product
 * where a live access token sits next to something a user will see.
 */
export class AccountUnidentifiedError extends DomainError {
  constructor(
    readonly released: boolean,
    reason: string,
  ) {
    super(
      released
        ? `BattleGrid could not tell us which account authorized this connection, so nothing was stored and the authorization was withdrawn. ${reason}`
        : `BattleGrid could not tell us which account authorized this connection, so nothing was stored. Withdrawing the authorization also failed, so it may still stand at BattleGrid. ${reason}`,
    );
  }
}

/**
 * The connection is gone or was revoked at BattleGrid.
 *
 * The diagnosis is fixed; the remedy is not. A deployment that authenticates
 * users can offer reconnection, and one acting with a configured credential
 * cannot — so the remedy is supplied rather than assumed.
 *
 * **Required, deliberately.** A default would let a construction site inherit
 * whichever deployment happened to be written first, silently, which is the
 * defect this parameter exists to remove. Passing `'reconnect'` explicitly at a
 * site that can only run on the delegated path is not ceremony: it is the site
 * saying which deployment it belongs to.
 */
export class ConnectionRevokedError extends DomainError {
  constructor(remedy: Remedy) {
    super(`Your BattleGrid connection is no longer valid. ${describeRemedy(remedy)}`);
  }
}

/**
 * The platform answered with something that is not an answer.
 *
 * This was a bare `` new Error(`${method} failed with ${res.status}`) ``, and
 * that string is what an operator read. `unreadable(err)` uses `err.message`
 * as the reason, so on 2026-08-05 — BattleGrid 502ing all day — five web
 * surfaces and every MCP tool result said:
 *
 *     Your roster could not be loaded. tools/call failed with 502
 *
 * The classification was right and the sentence was a transport artefact. A
 * person reading it cannot tell whether the fault is theirs, their key's, or
 * the platform's, which is the only question they have.
 *
 * **The status stays**, in the sentence rather than instead of it. It is what
 * makes the difference between two people describing the same outage to each
 * other and two people guessing.
 *
 * Three cases, because they have three different remedies and one of them is
 * "wait". 401 and 403 never arrive here — they are `ConnectionRevokedError`,
 * which is the fourth remedy and the only one the operator can act on today.
 */
export class PlatformUnavailableError extends DomainError {
  constructor(readonly status: number) {
    super(describeStatus(status));
  }
}

function describeStatus(status: number): string {
  // A gateway that could not reach what it fronts. Nothing about the request
  // was examined, so nothing about the request is the problem.
  if (status === 502 || status === 503 || status === 504) {
    return (
      `BattleGrid is not answering right now (HTTP ${status}). This is a fault on ` +
      'BattleGrid’s side — not with your account, your key, or anything you did. ' +
      'Nothing has changed on your account.'
    );
  }
  if (status === 429) {
    // Not a fault at all, and the only case where the remedy is a specific wait.
    return (
      `BattleGrid is limiting how often this deployment may ask (HTTP ${status}). ` +
      'Nothing is wrong; the next attempt should succeed.'
    );
  }
  if (status >= 500) {
    // It read the request and fell over. Distinct from the gateway case: here
    // the request may well be implicated.
    return (
      `BattleGrid failed while handling this request (HTTP ${status}). Nothing has ` +
      'changed on your account. If it keeps happening, it is worth reporting.'
    );
  }
  return (
    `BattleGrid refused this request (HTTP ${status}). Your connection is still ` +
    'valid — it is this particular request it would not accept.'
  );
}

/**
 * Whatever answers questions could not produce an answer at all.
 *
 * Distinct from an answer that came back incomplete. A failed read degrades an
 * answer and is named inside it; this is the case where there is no answer to
 * degrade, and the only honest thing to return is a refusal. Raised by an
 * `AssistantPort` implementation and converted at the use case, which is where
 * the refusal shape lives.
 *
 * Carries no detail from the failure. Model-provider errors are not written for
 * this user, and one of the two things that could be in them is a key.
 */
export class AssistantUnavailableError extends DomainError {
  constructor() {
    super(
      'I could not answer that just now — the assistant did not respond. ' +
        'Nothing about your account has changed, and everything I would have ' +
        'read is on the agents, strategies and activity pages.',
    );
  }
}
