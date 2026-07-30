import { expiryFromResponse, isUsable, needsRefresh } from '@/domain/connection/connection.js';
import type {
  ConnectionReader,
  ConnectionWriter,
} from '@/domain/connection/connection-repository.js';
import type { BattlegridSubject } from '@/domain/connection/subject.js';
import { asSubject } from '@/domain/connection/subject.js';
import { ConnectionRevokedError } from '@/domain/errors.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import type { Clock } from '@/ports/clock.js';

/** Where the encrypted token actually lives. Only this use case may read it. */
export interface TokenVault {
  read(userId: string): Promise<{ accessToken: string; refreshToken: string | null } | null>;
}

export interface Authority {
  /**
   * Which rows in **our** database. Minted here — `random.token(16)` on connect,
   * or the constant `'owner'` on a personal deployment.
   */
  readonly userId: string;
  /**
   * Which account on **BattleGrid**. Given to us, never minted.
   *
   * A separate field because it is a separate fact, and the database has said so
   * since it was written: `users.id` and `users.battlegrid_subject` are two
   * columns, with the subject commented as the natural key. One field carried both
   * jobs anyway, and the result was a plan-token check comparing BattleGrid's
   * account id against `'owner'` in one mode and a random local id in the other —
   * so applying a compiled plan was refused in every deployment configuration
   * since it was built.
   *
   * `null` means unknown, and unknown is **not** mismatched. Nothing may refuse on
   * the strength of a `null` here; the platform holds the authoritative answer.
   */
  readonly battlegridSubject: BattlegridSubject | null;
  readonly accessToken: string;
}

/**
 * The single place a BattleGrid token is obtained.
 *
 * `needsRefresh` and `expiryFromResponse` were written and tested in
 * `connect-battlegrid-account` and never called by anything. Scattering the
 * call to them across routes guarantees one route forgets, and the symptom —
 * an intermittent 401 on one screen — is miserable to diagnose. See design W-B.
 *
 * One place also gives one answer to the harder question, which is what happens
 * when a refresh fails: `ConnectionRevokedError`, which the product already
 * knows how to present, rather than a new failure mode per route.
 *
 * Every failure here names `'reconnect'`, and that is not a choice this class
 * makes — it is what this class *is*. A deployment acting with a configured
 * credential has no session to resolve and no grant to refresh, so
 * `OwnerOnlyUser` never reaches here. The remedy is fixed because the caller is.
 */
export class ResolveAuthorityQuery {
  constructor(
    private readonly connections: ConnectionReader & ConnectionWriter,
    private readonly vault: TokenVault,
    private readonly battlegrid: BattleGridPort,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<Authority> {
    const connection = await this.connections.findByUserId(userId);
    // Absent and revoked are the same outcome. They differ in cause and not in
    // remedy — both are fixed by connecting, and by nothing else. See W-C.
    if (!connection || !isUsable(connection)) throw new ConnectionRevokedError('reconnect');

    const stored = await this.vault.read(userId);
    if (!stored) throw new ConnectionRevokedError('reconnect');

    if (!needsRefresh(connection, this.clock.now())) {
      // The subject is stored on the connection — this is a wiring change here,
      // not a new fact. It has been sitting in `users.battlegrid_subject` unused by
      // anything that needed BattleGrid's identity.
      return {
        userId,
        // From the connection BattleGrid issued, which is what makes the assertion true.
        battlegridSubject: asSubject(connection.battlegridSubject),
        accessToken: stored.accessToken,
      };
    }

    if (!stored.refreshToken) {
      // Expired with nothing to refresh from. The authority is gone; saying so
      // now is better than letting the user watch a call fail.
      throw new ConnectionRevokedError('reconnect');
    }

    let grant;
    try {
      grant = await this.battlegrid.refresh(stored.refreshToken);
    } catch {
      // BattleGrid refused the refresh. Whatever the cause, the remedy is the
      // same one.
      throw new ConnectionRevokedError('reconnect');
    }

    await this.connections.updateTokens(userId, {
      accessToken: grant.accessToken,
      // A rotating refresh token must replace the old one; a non-rotating
      // server returns the same value and this is a no-op. Whether BattleGrid
      // rotates is unproven — see backlog `prove-token-lifetimes`.
      refreshToken: grant.refreshToken ?? stored.refreshToken,
      accessTokenExpiresAt: expiryFromResponse(grant.expiresIn, this.clock.now()),
    });

    return {
      userId,
      // From the connection BattleGrid issued, which is what makes the assertion true.
        battlegridSubject: asSubject(connection.battlegridSubject),
      accessToken: grant.accessToken,
    };
  }
}
