import type { Scope } from '@/domain/connection/scope.js';
import type { ActingUser, CurrentUserResult } from './current-user.query.js';
import type { BattlegridSubject } from '@/domain/connection/subject.js';
import type { AccountPort } from '@/ports/account.js';
import type { Authority } from './resolve-authority.query.js';

/**
 * The owner, on a deployment configured with their own credential.
 *
 * There is no session to resolve and nobody to authenticate: whoever reaches
 * this deployment is treated as the person whose key it holds. That is correct
 * for a tool on one machine and wrong the moment it is reachable from anywhere
 * else, which is why `isPersonal` exists — the surface has to be able to say so.
 *
 * It resolves no session, reads no connection, and refreshes nothing. A
 * `bg_live_` key is not an OAuth access token: it does not expire on a schedule
 * and there is no refresh token to exchange. If the platform stops accepting it,
 * that surfaces as `ConnectionRevokedError` from the call itself — the same
 * remedy the delegated path already has, which is to fix the credential.
 */
export const OWNER_USER_ID = 'owner';

export class OwnerOnlyUser implements ActingUser {
  /**
   * Asked once, then remembered.
   *
   * The account behind a `bg_live_` key cannot change without the key changing,
   * and the key is fixed at boot — so this is a constant the product has to
   * discover rather than a value to re-read. Caching it keeps an identity lookup
   * off every request.
   */
  private subject: BattlegridSubject | null | undefined;

  constructor(
    private readonly apiKey: string,
    private readonly account: AccountPort,
  ) {}

  async execute(): Promise<CurrentUserResult> {
    const authority: Authority = {
      userId: OWNER_USER_ID,
      battlegridSubject: await this.battlegridSubject(),
      accessToken: this.apiKey,
    };
    return { kind: 'acting', authority };
  }

  /**
   * BattleGrid's id for this key's account, or `null`.
   *
   * `null` is cached as deliberately as a value would be: a deployment whose
   * account read is unavailable must keep working, and asking again on every
   * request would put a failing call in front of every page. The one thing that
   * must never happen is a refusal built on this being `null`.
   *
   * **This is where the tolerance lives.** The port reports why it could not
   * name the account — the call failed, or the platform named nobody — and this
   * caller deliberately does not care which. A personal deployment has an
   * identity regardless, because `userId` is the constant `'owner'`; the subject
   * is only ever used to compare against a platform-issued claim, and an unknown
   * one must read as *unknown* rather than as a mismatch. Refusing on an unknown
   * here is precisely what made `apply_strategy_plan` unreachable in every
   * deployment configuration.
   *
   * The collapsing used to happen inside the port, which made it invisible to
   * this file and binding on every other caller. `CompleteConnectionCommand`
   * needs the opposite and now gets it.
   */
  private async battlegridSubject(): Promise<BattlegridSubject | null> {
    if (this.subject !== undefined) return this.subject;
    // The `catch` stays: the port does not promise never to throw, and a
    // personal deployment must survive one that does.
    const result = await this.account.subjectFor(this.apiKey).catch(() => null);
    this.subject = result?.kind === 'subject' ? result.subject : null;
    return this.subject;
  }
}

/**
 * What a personal deployment must disclose, and what it declared.
 *
 * `scopes` is what the operator *said* the credential carries. The product
 * cannot read a `bg_live_` key's authority, so this is a declaration and not a
 * restriction the platform enforces — the distinction the spec requires be kept
 * visible rather than collapsed.
 */
export interface PersonalMode {
  readonly scopes: readonly Scope[];
}
