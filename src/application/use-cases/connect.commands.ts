import type {
  ConnectionReader,
  ConnectionWriter,
  OAuthTransactionStore,
} from '@/domain/connection/connection-repository.js';
import { expiryFromResponse } from '@/domain/connection/connection.js';
import { REQUESTED_SCOPES } from '@/domain/connection/scope.js';
import { ConnectionRevokedError, UntrustedCallbackError } from '@/domain/errors.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import type { Clock } from '@/ports/clock.js';

/** How long a half-finished authorization stays redeemable. */
const TRANSACTION_TTL_MS = 10 * 60 * 1000;

export interface StartConnectionResponse {
  readonly authorizationUrl: string;
  readonly state: string;
}

/** Randomness is injected so tests are deterministic without stubbing globals. */
export interface Randomness {
  /** URL-safe random string. */
  token(bytes: number): string;
  /** RFC 7636 S256 challenge for a verifier. */
  codeChallengeS256(verifier: string): string;
}

/**
 * Begin an authorization.
 *
 * Nothing about the user is created here. A connection exists only once
 * BattleGrid has confirmed the grant — so an abandoned or failed flow leaves
 * nothing behind.
 */
export class StartConnectionCommand {
  constructor(
    private readonly battlegrid: BattleGridPort,
    private readonly transactions: OAuthTransactionStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<StartConnectionResponse> {
    const state = this.random.token(32);
    const codeVerifier = this.random.token(64);
    const now = this.clock.now();

    await this.transactions.create({
      state,
      codeVerifier,
      createdAt: now,
      expiresAt: new Date(now.getTime() + TRANSACTION_TTL_MS),
    });

    return {
      authorizationUrl: this.battlegrid.buildAuthorizationUrl({
        state,
        codeChallenge: this.random.codeChallengeS256(codeVerifier),
        scopes: REQUESTED_SCOPES,
      }),
      state,
    };
  }
}

export interface CompleteConnectionRequest {
  readonly state: string;
  readonly code: string;
}

export interface CompleteConnectionResponse {
  readonly userId: string;
  readonly connectionId: string;
  readonly isReturningUser: boolean;
}

/**
 * Finish an authorization.
 *
 * The connection is the identity: a returning user is recognised by their
 * BattleGrid subject and lands back in the same workspace.
 */
export class CompleteConnectionCommand {
  constructor(
    private readonly battlegrid: BattleGridPort,
    private readonly transactions: OAuthTransactionStore,
    private readonly connections: ConnectionReader & ConnectionWriter,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: CompleteConnectionRequest): Promise<CompleteConnectionResponse> {
    // A response that does not match a pending request initiated by this user
    // is refused, and nothing is stored.
    const tx = await this.transactions.consume(req.state);
    if (!tx) throw new UntrustedCallbackError('no pending authorization matches this response');

    const now = this.clock.now();
    if (tx.expiresAt.getTime() <= now.getTime()) {
      throw new UntrustedCallbackError('the authorization took too long and has expired');
    }

    // If this throws — BattleGrid unreachable, code rejected — we have already
    // consumed the transaction and created nothing. No partial connection.
    const grant = await this.battlegrid.exchangeCode({
      code: req.code,
      codeVerifier: tx.codeVerifier,
    });

    const existingUserId = await this.connections.findUserIdBySubject(grant.subject);
    const userId = existingUserId ?? this.random.token(16);

    const connectionId = await this.connections.upsert({
      userId,
      battlegridSubject: grant.subject,
      scopes: grant.scopes,
      accessToken: grant.accessToken,
      refreshToken: grant.refreshToken,
      accessTokenExpiresAt: expiryFromResponse(grant.expiresIn, now),
    });

    return { userId, connectionId, isReturningUser: existingUserId !== null };
  }
}

/**
 * Relinquish authority at BattleGrid, not merely locally.
 *
 * Local deletion alone would leave a live grant the user believes they revoked.
 */
export class DisconnectCommand {
  constructor(
    private readonly battlegrid: BattleGridPort,
    private readonly connections: ConnectionReader & ConnectionWriter,
    private readonly tokens: TokenSource,
  ) {}

  async execute(userId: string): Promise<void> {
    const connection = await this.connections.findByUserId(userId);
    if (!connection || connection.status === 'revoked') throw new ConnectionRevokedError();

    const accessToken = await this.tokens.accessTokenFor(userId);
    // Revoke upstream first. If it fails, the local record stays active and
    // honest rather than claiming a revocation that did not happen.
    await this.battlegrid.revoke(accessToken);
    await this.connections.markRevoked(userId);
  }
}

/** Reading a decrypted token is an infrastructure concern; the use case asks for it. */
export interface TokenSource {
  accessTokenFor(userId: string): Promise<string>;
}
