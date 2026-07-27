import type { Scope } from './scope.js';

/**
 * A user's delegated authority over their BattleGrid account.
 *
 * The connection IS the identity — there is no separate Grid-Commander
 * password. `battlegridSubject` is the natural key.
 */
export interface Connection {
  readonly id: string;
  readonly userId: string;
  readonly battlegridSubject: string;
  readonly scopes: readonly Scope[];
  readonly status: ConnectionStatus;
  /** Absolute expiry of the access token, or null when the server did not say. */
  readonly accessTokenExpiresAt: Date | null;
  readonly createdAt: Date;
}

export type ConnectionStatus = 'active' | 'revoked';

/** A grant is usable only while it is active. Expiry alone is recoverable by refresh. */
export function isUsable(connection: Connection): boolean {
  return connection.status === 'active';
}

export function holdsScope(connection: Connection, scope: Scope): boolean {
  return connection.scopes.includes(scope);
}

/**
 * When the server omits `expires_in`, treat the token as expiring almost
 * immediately and refresh eagerly.
 *
 * Token lifetimes are unproven (decision DL-8 — completing an authorization
 * needs a human in a browser). Assuming a comfortable hour and being wrong
 * means every call fails until the user reconnects; assuming the shortest safe
 * window costs one refresh and is never wrong in a damaging direction.
 */
export const UNKNOWN_EXPIRY_FALLBACK_SECONDS = 60;

export function expiryFromResponse(expiresIn: number | undefined, now: Date): Date {
  const seconds = expiresIn ?? UNKNOWN_EXPIRY_FALLBACK_SECONDS;
  return new Date(now.getTime() + seconds * 1000);
}

/** Refresh before the token actually lapses, so a call never races expiry. */
const REFRESH_MARGIN_MS = 30_000;

export function needsRefresh(connection: Connection, now: Date): boolean {
  if (connection.accessTokenExpiresAt === null) return true;
  return connection.accessTokenExpiresAt.getTime() - now.getTime() <= REFRESH_MARGIN_MS;
}
