import type { Scope } from '@/domain/connection/scope.js';
import type { ActingUser, CurrentUserResult } from './current-user.query.js';
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
  constructor(private readonly apiKey: string) {}

  async execute(): Promise<CurrentUserResult> {
    const authority: Authority = { userId: OWNER_USER_ID, accessToken: this.apiKey };
    return { kind: 'acting', authority };
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
