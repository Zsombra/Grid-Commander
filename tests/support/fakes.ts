import type { AuditEntry, AuditOutcome } from '@/domain/audit/audit-entry.js';
import type { AuditReader, AuditWriter, NewAuditEntry } from '@/domain/audit/audit-repository.js';
import type { ConfirmationStore, ConfirmationToken } from '@/domain/capability/confirmation.js';
import type { Connection } from '@/domain/connection/connection.js';
import type {
  ConnectionReader,
  ConnectionWriter,
  NewConnection,
  OAuthTransaction,
  OAuthTransactionStore,
  ResolvedConnection,
} from '@/domain/connection/connection-repository.js';
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async findByIdempotencyKey(userId: string, key: string): Promise<AuditEntry | null> {
    return this.entries.find((e) => e.userId === userId && e.idempotencyKey === key) ?? null;
  }
}

export class FakeConfirmationStore implements ConfirmationStore {
  readonly tokens = new Map<string, ConfirmationToken>();
  constructor(private readonly clock: Clock) {}

  async issue(token: ConfirmationToken): Promise<void> {
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
    return { userId, connectionId: id };
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
