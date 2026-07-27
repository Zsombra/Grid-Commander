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

/** CQRS: writers return void or an identifier, never an aggregate. */
export interface ConnectionWriter {
  upsert(connection: NewConnection): Promise<string>;
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
