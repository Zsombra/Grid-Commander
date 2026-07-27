import { and, eq, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Connection, ConnectionStatus } from '@/domain/connection/connection.js';
import type {
  ConnectionReader,
  ConnectionWriter,
  NewConnection,
  OAuthTransaction,
  OAuthTransactionStore,
} from '@/domain/connection/connection-repository.js';
import { isScope } from '@/domain/connection/scope.js';
import type { Cipher } from '@/infrastructure/crypto/envelope.js';
import type { TokenVault } from '@/application/use-cases/resolve-authority.query.js';
import type { Clock } from '@/ports/clock.js';
import { connections, oauthTransactions, users } from '../schema/index.js';

type Db = NodePgDatabase<Record<string, never>>;

/**
 * Connections, users and the tokens they hold.
 *
 * Tokens are encrypted on the way in and decrypted only here, on the way to
 * `ResolveAuthorityQuery`. Nothing else in the product sees ciphertext or
 * plaintext — a database dump alone must not be enough to use someone's
 * BattleGrid account.
 */
export class DrizzleConnectionRepository
  implements ConnectionReader, ConnectionWriter, TokenVault
{
  constructor(
    private readonly db: Db,
    private readonly cipher: Cipher,
    private readonly newId: () => string,
  ) {}

  async findByUserId(userId: string): Promise<Connection | null> {
    const [row] = await this.db.select().from(connections).where(eq(connections.userId, userId));
    return row ? toDomain(row) : null;
  }

  async findUserIdBySubject(subject: string): Promise<string | null> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.battlegridSubject, subject));
    return row?.id ?? null;
  }

  async upsert(connection: NewConnection): Promise<string> {
    const id = this.newId();

    await this.db
      .insert(users)
      .values({ id: connection.userId, battlegridSubject: connection.battlegridSubject })
      .onConflictDoNothing();

    await this.db
      .insert(connections)
      .values({
        id,
        userId: connection.userId,
        battlegridSubject: connection.battlegridSubject,
        accessTokenEncrypted: this.cipher.encrypt(connection.accessToken),
        refreshTokenEncrypted:
          connection.refreshToken === null ? null : this.cipher.encrypt(connection.refreshToken),
        accessTokenExpiresAt: connection.accessTokenExpiresAt,
        scopes: [...connection.scopes],
        status: 'active',
      })
      .onConflictDoUpdate({
        target: connections.userId,
        set: {
          battlegridSubject: connection.battlegridSubject,
          accessTokenEncrypted: this.cipher.encrypt(connection.accessToken),
          refreshTokenEncrypted:
            connection.refreshToken === null ? null : this.cipher.encrypt(connection.refreshToken),
          accessTokenExpiresAt: connection.accessTokenExpiresAt,
          scopes: [...connection.scopes],
          // Reconnecting after a revocation is a fresh grant, not a resurrection
          // of the old one — but the audit history stays, keyed by user.
          status: 'active',
        },
      });

    return id;
  }

  /**
   * Discard the authority; keep the record that it existed.
   *
   * The tokens are nulled rather than the row deleted. R2 requires the user's
   * history to survive a disconnect, and the history is keyed by the user the
   * connection identifies.
   */
  async markRevoked(userId: string): Promise<void> {
    await this.db
      .update(connections)
      .set({
        status: 'revoked' satisfies ConnectionStatus,
        accessTokenEncrypted: '',
        refreshTokenEncrypted: null,
        accessTokenExpiresAt: null,
      })
      .where(eq(connections.userId, userId));
  }

  async updateTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken: string | null; accessTokenExpiresAt: Date | null },
  ): Promise<void> {
    await this.db
      .update(connections)
      .set({
        accessTokenEncrypted: this.cipher.encrypt(tokens.accessToken),
        refreshTokenEncrypted:
          tokens.refreshToken === null ? null : this.cipher.encrypt(tokens.refreshToken),
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      })
      // Only an active connection gets refreshed tokens. Writing them to a
      // revoked one would quietly restore authority the user gave up.
      .where(and(eq(connections.userId, userId), eq(connections.status, 'active')));
  }

  /** The only decryption point in the product. See design W-B. */
  async read(userId: string): Promise<{ accessToken: string; refreshToken: string | null } | null> {
    const [row] = await this.db.select().from(connections).where(eq(connections.userId, userId));
    if (!row || row.status !== 'active' || row.accessTokenEncrypted === '') return null;
    return {
      accessToken: this.cipher.decrypt(row.accessTokenEncrypted),
      refreshToken:
        row.refreshTokenEncrypted === null ? null : this.cipher.decrypt(row.refreshTokenEncrypted),
    };
  }
}

function toDomain(row: typeof connections.$inferSelect): Connection {
  return {
    id: row.id,
    userId: row.userId,
    battlegridSubject: row.battlegridSubject,
    // A scope the domain does not recognise is dropped rather than carried as a
    // string: an unrecognised scope cannot be checked against, and silently
    // widening the held set is the one direction that must never happen.
    scopes: row.scopes.filter(isScope),
    status: row.status === 'revoked' ? 'revoked' : 'active',
    accessTokenExpiresAt: row.accessTokenExpiresAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleTransactionStore implements OAuthTransactionStore {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
  ) {}

  async create(tx: OAuthTransaction): Promise<void> {
    await this.db.insert(oauthTransactions).values({
      state: tx.state,
      codeVerifier: tx.codeVerifier,
      createdAt: tx.createdAt,
      expiresAt: tx.expiresAt,
    });
  }

  /**
   * Single-use, enforced by the delete rather than by a flag.
   *
   * A returned row is one that existed and has now been removed, so a replayed
   * state finds nothing. Expired rows are swept on the way past — there is no
   * background job, and an unswept table of dead states is a slow leak.
   */
  async consume(state: string): Promise<OAuthTransaction | null> {
    const now = this.clock.now();
    await this.db.delete(oauthTransactions).where(lt(oauthTransactions.expiresAt, now));

    const [row] = await this.db
      .delete(oauthTransactions)
      .where(eq(oauthTransactions.state, state))
      .returning();
    if (!row) return null;
    if (row.expiresAt.getTime() <= now.getTime()) return null;

    return {
      state: row.state,
      codeVerifier: row.codeVerifier,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  }
}
