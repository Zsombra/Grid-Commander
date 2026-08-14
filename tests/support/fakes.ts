import type { AuditEntry, AuditOutcome } from '@/domain/audit/audit-entry.js';
import type { AuditReader, AuditWriter, NewAuditEntry } from '@/domain/audit/audit-repository.js';
import type {
  ConfirmationRefusalCause,
  ConfirmationStore,
  ConfirmationToken,
} from '@/domain/capability/confirmation.js';
import type { Connection } from '@/domain/connection/connection.js';
import type {
  ConnectionReader,
  ConnectionWriter,
  NewConnection,
  OAuthTransaction,
  OAuthTransactionStore,
  ResolvedConnection,
} from '@/domain/connection/connection-repository.js';
import { DuplicateIdempotencyKeyError } from '@/domain/errors.js';
import type { Clock } from '@/ports/clock.js';

/**
 * In-memory doubles for every port.
 *
 * These exist so the whole surface is testable without a live BattleGrid
 * account, a database, or a network — which is the point of putting the
 * platform behind a port in the first place.
 */

export class FakeClock implements Clock {
  constructor(private current = new Date('2026-07-27T12:00:00Z')) {}
  now(): Date {
    return new Date(this.current);
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
  set(d: Date): void {
    this.current = new Date(d);
  }
}

export class FakeAuditStore implements AuditReader, AuditWriter {
  readonly entries: AuditEntry[] = [];
  private seq = 0;
  /** Set to true to simulate the process dying between begin() and complete(). */
  failOnComplete = false;

  constructor(private readonly clock: Clock) {}

  async begin(entry: NewAuditEntry): Promise<string> {
    // Mirrors the real repository's partial unique index: at most one
    // non-failed entry per (user, key). A failed attempt released its key.
    if (entry.idempotencyKey !== null) {
      const live = await this.findByIdempotencyKey(entry.userId, entry.idempotencyKey);
      if (live) {
        throw new DuplicateIdempotencyKeyError(
          entry.tool,
          live.outcome === 'succeeded' ? 'succeeded' : 'attempted',
        );
      }
    }
    const id = `audit-${++this.seq}`;
    this.entries.push({
      id,
      userId: entry.userId,
      actor: entry.actor,
      tool: entry.tool,
      destructive: entry.destructive,
      outcome: 'attempted',
      createdAt: this.clock.now(),
      completedAt: null,
      failureReason: null,
      idempotencyKey: entry.idempotencyKey,
    });
    return id;
  }

  async complete(
    id: string,
    outcome: Exclude<AuditOutcome, 'attempted'>,
    failureReason?: string,
  ): Promise<void> {
    if (this.failOnComplete) throw new Error('process died before the outcome was recorded');
    const i = this.entries.findIndex((e) => e.id === id);
    if (i === -1) throw new Error(`no audit entry ${id}`);
    const existing = this.entries[i]!;
    this.entries[i] = {
      ...existing,
      outcome,
      completedAt: this.clock.now(),
      failureReason: failureReason ?? null,
    };
  }

  async listForUser(userId: string, limit: number): Promise<readonly AuditEntry[]> {
    return this.entries
      .filter((e) => e.userId === userId)
      .sort(
        // Same tiebreak as the real repository: stable within one millisecond.
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
      )
      .slice(0, limit);
  }

  async findByIdempotencyKey(userId: string, key: string): Promise<AuditEntry | null> {
    // The live entry, per the port contract: failed attempts released the key.
    return (
      this.entries.find(
        (e) => e.userId === userId && e.idempotencyKey === key && e.outcome !== 'failed',
      ) ?? null
    );
  }
}

export class FakeConfirmationStore implements ConfirmationStore {
  readonly tokens = new Map<string, ConfirmationToken>();
  constructor(private readonly clock: Clock) {}

  async issue(token: ConfirmationToken): Promise<void> {
    /**
     * A token is issued once. Overwriting an unconsumed one is not a store
     * behaviour to imitate — it is the store losing an outstanding agreement.
     *
     * This was a plain `Map.set`, so a fixture minting a duplicate id replaced
     * the earlier entry and **retargeted an agreement someone still held**. It
     * cost five days of `live-write-probe-confirmation-flake`: two consecutive
     * runs failing at different consumptions, no product defect anywhere, and
     * nothing in the failure pointing at the fake.
     *
     * A real store keys on 32 random bytes and will never see this. If it
     * somehow did, silently discarding the first is the worst of the available
     * behaviours — so the fake refuses instead of modelling something the
     * platform cannot do.
     */
    const held = this.tokens.get(token.token);
    // Outstanding means **still spendable** — unconsumed *and* unexpired, the
    // same pair `consume` checks. A stricter rule than that refuses honest
    // re-use: `call-path.test.ts` walks each refusal cause by re-issuing one id
    // as expired, then consumed, then mismatched, and nothing is lost by
    // overwriting a token no one could spend.
    const spendable = held && held.consumedAt === null && held.expiresAt.getTime() > this.clock.now().getTime();
    if (spendable) {
      throw new Error(
        `confirmation "${token.token}" is already outstanding for ${held.tool} on ${held.target}; ` +
          'issuing it again would silently retarget an agreement someone still holds',
      );
    }
    this.tokens.set(token.token, token);
  }

  async consume(
    token: string,
    userId: string,
    tool: string,
    target: string,
  ): Promise<ConfirmationToken | null> {
    const found = this.tokens.get(token);
    if (!found) return null;
    if (found.consumedAt !== null) return null;
    if (found.expiresAt.getTime() <= this.clock.now().getTime()) return null;
    // Binding: a confirmation issued for one action cannot authorise another.
    if (found.userId !== userId || found.tool !== tool || found.target !== target) return null;
    const consumed = { ...found, consumedAt: this.clock.now() };
    this.tokens.set(token, consumed);
    return consumed;
  }

  async diagnose(
    token: string,
    userId: string,
    tool: string,
    target: string,
  ): Promise<ConfirmationRefusalCause> {
    const found = this.tokens.get(token);
    if (!found) return 'unknown';
    if (found.userId !== userId || found.tool !== tool || found.target !== target) {
      return 'mismatched';
    }
    if (found.consumedAt !== null) return 'already-used';
    if (found.expiresAt.getTime() <= this.clock.now().getTime()) return 'expired';
    return 'already-used';
  }
}

export class FakeConnectionStore implements ConnectionReader, ConnectionWriter {
  readonly connections = new Map<string, Connection>();
  readonly secrets = new Map<string, { accessToken: string; refreshToken: string | null }>();
  private seq = 0;

  constructor(private readonly clock: Clock) {}

  async findByUserId(userId: string): Promise<Connection | null> {
    return this.connections.get(userId) ?? null;
  }

  async findUserIdBySubject(subject: string): Promise<string | null> {
    for (const [userId, c] of this.connections) {
      if (c.battlegridSubject === subject) return userId;
    }
    return null;
  }

  /**
   * Models the invariant the unique index on `battlegrid_subject` enforces:
   * one BattleGrid account resolves to one identity, whatever id the caller
   * proposed. A fake that keyed on the proposed id alone would agree with the
   * code and disagree with the database.
   */
  async upsert(c: NewConnection): Promise<ResolvedConnection> {
    const userId = (await this.findUserIdBySubject(c.battlegridSubject)) ?? c.userId;
    const id = `conn-${++this.seq}`;
    this.connections.set(userId, {
      id,
      userId,
      battlegridSubject: c.battlegridSubject,
      scopes: c.scopes,
      status: 'active',
      accessTokenExpiresAt: c.accessTokenExpiresAt,
      createdAt: this.clock.now(),
    });
    this.secrets.set(userId, { accessToken: c.accessToken, refreshToken: c.refreshToken });
    return { userId };
  }

  async markRevoked(userId: string): Promise<void> {
    const existing = this.connections.get(userId);
    if (existing) this.connections.set(userId, { ...existing, status: 'revoked' });
    this.secrets.delete(userId);
  }

  async updateTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken: string | null; accessTokenExpiresAt: Date | null },
  ): Promise<void> {
    const existing = this.connections.get(userId);
    if (!existing) throw new Error('no connection');
    this.connections.set(userId, { ...existing, accessTokenExpiresAt: tokens.accessTokenExpiresAt });
    this.secrets.set(userId, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  }
}

export class FakeTransactionStore implements OAuthTransactionStore {
  readonly transactions = new Map<string, OAuthTransaction>();

  async create(tx: OAuthTransaction): Promise<void> {
    this.transactions.set(tx.state, tx);
  }

  /** Single-use: consuming removes it, so a replayed state finds nothing. */
  async consume(state: string): Promise<OAuthTransaction | null> {
    const tx = this.transactions.get(state);
    if (!tx) return null;
    this.transactions.delete(state);
    return tx;
  }
}
