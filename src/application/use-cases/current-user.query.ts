import type { ConnectionReader } from '@/domain/connection/connection-repository.js';
import { NOT_CONNECTED } from '@/domain/session/session.js';
import type { SessionPort } from '@/ports/session.js';
import type { Authority } from './resolve-authority.query.js';
import type { ResolveAuthorityQuery } from './resolve-authority.query.js';
import { ConnectionRevokedError } from '@/domain/errors.js';

export type CurrentUserResult =
  | { readonly kind: 'acting'; readonly authority: Authority }
  | { readonly kind: 'not-connected'; readonly message: string };

/**
 * Who this request acts for, and with what.
 *
 * The one gate between an HTTP request and everything else. Every route calls
 * it; nothing else resolves a session or a token.
 *
 * A session naming a user with no record is refused and the session discarded —
 * not treated as a first visit. A signed cookie is evidence of a previous
 * session, not evidence of a BattleGrid grant, and identity in this product
 * comes only from BattleGrid confirming one. See design W-G.
 */
export class CurrentUserQuery {
  constructor(
    private readonly sessions: SessionPort,
    private readonly connections: ConnectionReader,
    private readonly authority: ResolveAuthorityQuery,
  ) {}

  async execute(): Promise<CurrentUserResult> {
    const result = await this.sessions.read();
    if (result.kind === 'rejected') return notConnected();

    const connection = await this.connections.findByUserId(result.session.userId);
    if (!connection) {
      // The session points at nobody. Discard it rather than leaving a cookie
      // that will be re-presented and re-rejected on every request.
      await this.sessions.clear();
      return notConnected();
    }

    try {
      return { kind: 'acting', authority: await this.authority.execute(result.session.userId) };
    } catch (err) {
      if (err instanceof ConnectionRevokedError) return notConnected();
      throw err;
    }
  }
}

/**
 * One outcome, one message, however the authority was lost — absent session,
 * forged cookie, unknown user, revoked connection, unrefreshable token, or a
 * 401 from BattleGrid. See design W-C.
 */
function notConnected(): CurrentUserResult {
  return { kind: 'not-connected', message: NOT_CONNECTED };
}
