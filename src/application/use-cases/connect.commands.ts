import type {
  ConnectionReader,
  ConnectionWriter,
  OAuthTransactionStore,
} from '@/domain/connection/connection-repository.js';
import { expiryFromResponse } from '@/domain/connection/connection.js';
import { REQUESTED_SCOPES } from '@/domain/connection/scope.js';
import {
  AccountUnidentifiedError,
  ConnectionRevokedError,
  UntrustedCallbackError,
} from '@/domain/errors.js';
import type { AccountPort } from '@/ports/account.js';
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

/**
 * The identity to act as, and nothing else.
 *
 * `connectionId` and `isReturningUser` were here too, and the callback route —
 * the only production caller — read neither (PG-003). `isReturningUser` was then
 * *widened*, to keep reporting a returning user when the identity race below is
 * lost, which is the worst state for an unread field to be in: the change reads
 * as having been made for a consumer, and there was none to make it for.
 *
 * Neither fact is lost. Whether a subject has connected before is a
 * `findUserIdBySubject` away, and the connection row is reachable by user — so
 * whichever surface eventually wants either can ask the store that owns it,
 * rather than inherit an answer computed for nobody a release earlier.
 */
export interface CompleteConnectionResponse {
  readonly userId: string;
}

/**
 * Finish an authorization.
 *
 * The connection is the identity: a returning user is recognised by their
 * BattleGrid subject and lands back in the same workspace.
 *
 * **The subject is asked for, not read off the grant.** BattleGrid is plain
 * OAuth 2.1 and its token response names no account — an authorization says what
 * the bearer may do, and is not obliged to say who they are. So the account is
 * established by a read performed with the authority just granted.
 */
export class CompleteConnectionCommand {
  constructor(
    private readonly battlegrid: BattleGridPort,
    private readonly account: AccountPort,
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

    // Who does this authority act as? The grant cannot say, so ask — with the
    // authority itself, which is the only credential that can answer for it.
    //
    // `grant.scopes` is passed because there is nowhere else to get it. The
    // guard that decides whether a call may go out reads a user's authority
    // from their stored connection, and this read is what *produces* that
    // connection — so the lookup finds nothing, reads it as no authority at
    // all, and refuses a call whose grant is holding exactly the scope it
    // wants. Found by the first real delegated authorization (2026-08-13);
    // invisible to every offline test, because they fake this port, and to
    // both live probes, because a personal deployment takes its scopes from
    // configuration instead.
    const identity = await this.account.subjectFor(grant.accessToken, grant.scopes);
    if (identity.kind !== 'subject') {
      // Nothing is stored without an account to store it under. A placeholder
      // would make every unidentified connection collide on one key, and the
      // second user to arrive would be recognised as the first — landing in a
      // stranger's workspace with a stranger's BattleGrid connection.
      throw await this.refuseUnidentified(grant.accessToken, identity.reason);
    }

    const existingUserId = await this.connections.findUserIdBySubject(identity.subject);

    // A proposal, not a decision. Between this read and the write below, another
    // callback for the same new subject can create the identity first — so the
    // store returns which id actually holds the connection, and that is the one
    // the session is issued for. Signing the user in under the id proposed here
    // would name a user holding nothing.
    const proposedUserId = existingUserId ?? this.random.token(16);

    const resolved = await this.connections.upsert({
      userId: proposedUserId,
      battlegridSubject: identity.subject,
      scopes: grant.scopes,
      accessToken: grant.accessToken,
      refreshToken: grant.refreshToken,
      accessTokenExpiresAt: expiryFromResponse(grant.expiresIn, now),
    });

    return { userId: resolved.userId };
  }

  /**
   * Give back the authority we cannot use.
   *
   * The grant is live at this point — the user consented, the code was
   * exchanged, and BattleGrid holds an active authorization. Dropping it locally
   * would leave them holding authority they were told was never established,
   * which is the same mistake `DisconnectCommand` refuses to make in the other
   * direction.
   *
   * A failed release is not swallowed and not retried: it changes what the user
   * must be told, so it is carried out as `released: false`.
   */
  private async refuseUnidentified(
    accessToken: string,
    reason: string,
  ): Promise<AccountUnidentifiedError> {
    let released = true;
    try {
      await this.battlegrid.revoke(accessToken);
    } catch {
      released = false;
    }
    return new AccountUnidentifiedError(released, reason);
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
    if (!connection || connection.status === 'revoked') throw new ConnectionRevokedError('reconnect');

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
