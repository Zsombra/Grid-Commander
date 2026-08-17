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
 * Who this request acts for.
 *
 * An interface rather than a class, because there are two answers and they are
 * reached differently: a delegated deployment resolves a session and refreshes a
 * grant; a personal one already holds the owner's credential and has nobody to
 * authenticate. Two implementations chosen at the composition root, exactly as
 * `AssistantPort` is — never a branch inside one of them, which is the runtime
 * dual-path the architecture review forbids.
 */
export interface ActingUser {
  execute(): Promise<CurrentUserResult>;
}

/**
 * Who this request acts for, and with what.
 *
 * The one gate between an HTTP request and everything else. Every route calls
 * it; nothing else resolves a session or a token.
 *
 * A session naming a user with no record is refused — not treated as a first
 * visit, and not discarded here: this runs during render, and a read must not
 * mutate cookies. A signed cookie is evidence of a previous session, not
 * evidence of a BattleGrid grant, and identity in this product comes only
 * from BattleGrid confirming one. See design W-G.
 */
export class CurrentUserQuery implements ActingUser {
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
      /**
       * The session points at nobody: refused, and nothing more. This used to
       * clear the cookie here — and clearing is a *write*, which Next.js
       * forbids during a server-component render, so every page 500'd for
       * anyone holding a stale cookie. Found by check-serving's authenticated
       * probe on its first run. The cookie identifies no one, costs one
       * indexed lookup per request until its TTL, and is replaced or cleared
       * by the flows that may write cookies: completing a connection,
       * disconnecting.
       */
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
