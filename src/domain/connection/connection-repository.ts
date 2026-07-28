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
 * Which identity a connection ended up under, and which row holds it.
 *
 * `userId` is returned rather than assumed because the caller only *proposes*
 * one: for a subject that has never connected, it mints a fresh id, and two
 * callbacks racing on the same new subject both mint. Exactly one can win, and
 * the loser has to be told which id it lost to — otherwise it signs its user in
 * under an identity that holds no connection.
 */
export interface ResolvedConnection {
  readonly userId: string;
  readonly connectionId: string;
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
