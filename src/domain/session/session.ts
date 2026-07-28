/**
 * A session: a signed pointer to a user, and nothing else.
 *
 * Deliberately not a container for the BattleGrid grant.
 * `connect-battlegrid-account` encrypted tokens at rest so a database dump alone
 * is not usable; putting one in a cookie would hand it to every browser, and a
 * cookie is disclosed far more easily than a database. See design W-A.
 *
 * The signature is what makes this a session rather than a suggestion. A user id
 * in an unsigned cookie is an invitation to type someone else's.
 */

export interface SessionValue {
  readonly userId: string;
  readonly issuedAt: Date;
}

/** Why a session was not accepted. Distinguished for the audit, not for the user. */
export type SessionRejection =
  | 'absent'
  | 'malformed'
  | 'bad-signature'
  | 'expired'
  | 'unknown-user';

export type SessionResult =
  | { readonly kind: 'valid'; readonly session: SessionValue }
  | { readonly kind: 'rejected'; readonly reason: SessionRejection };

/**
 * Long enough not to interrupt a working session, short enough that a leaked
 * cookie is not indefinite.
 *
 * Known limitation (W-A): a leaked cookie stays valid until it expires or the
 * connection is revoked. Acceptable because a session is only a pointer — the
 * authority it points at is revocable at BattleGrid, so a stolen session
 * survives as a pointer to a user whose connection holds nothing.
 */
export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;

export function isExpired(session: SessionValue, now: Date): boolean {
  return now.getTime() - session.issuedAt.getTime() > SESSION_TTL_SECONDS * 1000;
}

/**
 * The signed payload, as a string.
 *
 * `userId.issuedAt` — no scopes, no expiry claim about the grant, no token. A
 * session that carried the grant's scopes would be a second, staler answer to a
 * question the connection already answers.
 */
export function encodePayload(session: SessionValue): string {
  return `${session.userId}.${session.issuedAt.getTime()}`;
}

export function decodePayload(payload: string): SessionValue | null {
  const separator = payload.lastIndexOf('.');
  if (separator <= 0) return null;
  const userId = payload.slice(0, separator);
  const issuedAtMs = Number(payload.slice(separator + 1));
  if (!userId || !Number.isFinite(issuedAtMs) || issuedAtMs <= 0) return null;
  return { userId, issuedAt: new Date(issuedAtMs) };
}

/**
 * What the user is told when a session is not accepted.
 *
 * One message for every reason. They differ in cause and not in remedy: each is
 * fixed by connecting, and none is fixed by anything else the user could do.
 * Naming the difference would offer a distinction they cannot act on — the same
 * mistake as "tools/call failed with 401". See design W-C.
 */
export const NOT_CONNECTED =
  'You are not connected to BattleGrid. Connect your account to continue.';
