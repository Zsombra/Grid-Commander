import { isUsable } from '@/domain/connection/connection.js';
import type { ConnectionReader } from '@/domain/connection/connection-repository.js';
import type { HeldScopes } from '@/domain/connection/held-scopes.js';
import type { Scope } from '@/domain/connection/scope.js';

/**
 * Scopes from the grant BattleGrid actually issued.
 *
 * The delegated path's answer, and the stricter of the two: these were
 * registered, so authority beyond them is unobtainable rather than merely
 * unrequested.
 *
 * An absent or unusable connection yields none — which makes the guard refuse
 * everything, and is the correct reading. No connection is not "any scope"; it
 * is no authority at all.
 */
export class ConnectionScopes implements HeldScopes {
  constructor(private readonly connections: ConnectionReader) {}

  async forUser(userId: string): Promise<readonly Scope[]> {
    const connection = await this.connections.findByUserId(userId);
    if (!connection || !isUsable(connection)) return [];
    return connection.scopes;
  }
}
