import type { Connection } from './connection.js';
import type { Scope } from './scope.js';

/** CQRS: readers return domain objects. */
export interface ConnectionReader {
  findByUserId(userId: string): Promise<Connection | null>;
  findUserIdBySubject(subject: string): Promise<string | null>;
}

export interface NewConnection {
  readonly userId: string;
  readonly battlegridSubject: string;
  readonly scopes: readonly Scope[];
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly accessTokenExpiresAt: Date | null;
}

/**
 * Which identity a connection ended up under.
 *
 * `userId` is returned rather than assumed because the caller only *proposes*
 * one: for a subject that has never connected, it mints a fresh id, and two
 * callbacks racing on the same new subject both mint. Exactly one can win, and
 * the loser has to be told which id it lost to — otherwise it signs its user in
 * under an identity that holds no connection.
 *
 * It carried `connectionId` as well, and that one was dropped rather than
 * repaired. Nothing read it, and the value was wrong exactly where a reader
 * would have relied on it: the Drizzle writer returned the id it minted for the
 * insert, but the insert upserts on the unique index over `user_id` without
 * setting `id`, so on every reconnection the surviving row kept its own key and
 * the id handed back named nothing. A connection is reachable by user, which is
 * how every caller already finds one.
 */
export interface ResolvedConnection {
  readonly userId: string;
}

/** CQRS: writers return void or an identifier, never an aggregate. */
export interface ConnectionWriter {
  upsert(connection: NewConnection): Promise<ResolvedConnection>;
  markRevoked(userId: string): Promise<void>;
  updateTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken: string | null; accessTokenExpiresAt: Date | null },
  ): Promise<void>;
}

/** A pending authorization. Single-use, bound to the browser that started it. */
export interface OAuthTransaction {
  readonly state: string;
  readonly codeVerifier: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

export interface OAuthTransactionStore {
  create(tx: OAuthTransaction): Promise<void>;
  /** Consuming is destructive by design: a state may be redeemed exactly once. */
  consume(state: string): Promise<OAuthTransaction | null>;
}
