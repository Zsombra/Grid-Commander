import { beforeEach, describe, expect, it } from 'vitest';
import { ListAuditQuery } from '@/application/use-cases/list-audit.query.js';
import { RecordAuditCommand } from '@/application/use-cases/record-audit.command.js';
import { isUnresolved } from '@/domain/audit/audit-entry.js';
import { FakeAuditStore, FakeClock } from '../support/fakes.js';

describe('audit', () => {
  let clock: FakeClock;
  let store: FakeAuditStore;
  let record: RecordAuditCommand;

  beforeEach(() => {
    clock = new FakeClock();
    store = new FakeAuditStore(clock);
    record = new RecordAuditCommand(store);
  });

  const entry = (tool: string, destructive = false) => ({
    userId: 'u1',
    actor: 'user' as const,
    tool,
    destructive,
    platformDestructiveHint: null,
    idempotencyKey: null,
  });

  /** R8 — a successful change. */
  it('records_success', async () => {
    const id = await record.begin(entry('create_intelligence_agent'));
    await record.complete(id, 'succeeded');
    const e = store.entries[0]!;
    expect(e.outcome).toBe('succeeded');
    expect(e.tool).toBe('create_intelligence_agent');
    expect(e.completedAt).not.toBeNull();
  });

  /** R8 — a failed change. */
  it('records_failure', async () => {
    const id = await record.begin(entry('update_intelligence_agent'));
    await record.complete(id, 'failed', 'revision conflict');
    const e = store.entries[0]!;
    expect(e.outcome).toBe('failed');
    expect(e.failureReason).toBe('revision conflict');
  });

  /**
   * R8 — the crash scenario, and the reason the write is committed before the
   * call rather than sharing its transaction.
   */
  describe('interrupted_reads_as_attempted', () => {
    it('leaves evidence when the outcome is never learned', async () => {
      await record.begin(entry('rebind_intelligence_agent', true));
      // The process dies here. No complete() ever runs.
      const e = store.entries[0]!;
      expect(e.outcome).toBe('attempted');
      expect(e.completedAt).toBeNull();
      expect(isUnresolved(e)).toBe(true);
    });

    it('records the attempt even when completing it throws', async () => {
      const id = await record.begin(entry('archive_strategy', true));
      store.failOnComplete = true;
      await expect(record.complete(id, 'succeeded')).rejects.toThrow();
      // The attempt survives the failure to record its outcome.
      expect(store.entries[0]?.outcome).toBe('attempted');
    });

    it('does not report an unresolved attempt as a success', async () => {
      await record.begin(entry('apply_strategy_plan', true));
      const res = await new ListAuditQuery(store).execute({ userId: 'u1' });
      expect(res.entries[0]?.outcome).not.toBe('succeeded');
      expect(res.unresolvedCount).toBe(1);
    });
  });

  /** R8 — reading the record. */
  describe('user_reads_own_history_newest_first', () => {
    it('returns the user’s entries newest first', async () => {
      await record.begin(entry('first'));
      clock.advance(1000);
      await record.begin(entry('second'));
      clock.advance(1000);
      await record.begin(entry('third'));

      const res = await new ListAuditQuery(store).execute({ userId: 'u1' });
      expect(res.entries.map((e) => e.tool)).toEqual(['third', 'second', 'first']);
    });

    it('never returns another user’s history', async () => {
      await record.begin({ userId: 'u1', actor: 'user', tool: 'mine', destructive: false, platformDestructiveHint: null, idempotencyKey: null });
      await record.begin({ userId: 'u2', actor: 'user', tool: 'theirs', destructive: false, platformDestructiveHint: null, idempotencyKey: null });

      const res = await new ListAuditQuery(store).execute({ userId: 'u1' });
      expect(res.entries.map((e) => e.tool)).toEqual(['mine']);
    });

    it('respects the limit', async () => {
      for (let i = 0; i < 5; i++) {
        await record.begin(entry(`t${i}`));
        clock.advance(10);
      }
      const res = await new ListAuditQuery(store).execute({ userId: 'u1', limit: 2 });
      expect(res.entries).toHaveLength(2);
    });
  });

  it('marks a destructive operation as destructive in the record', async () => {
    await record.begin(entry('rebind_intelligence_agent', true));
    expect(store.entries[0]?.destructive).toBe(true);
  });

  it('finds a prior attempt by idempotency key, so a retry is not a second action', async () => {
    await record.begin({ ...entry('create_intelligence_agent'), idempotencyKey: 'k1' });
    const found = await store.findByIdempotencyKey('u1', 'k1');
    expect(found?.tool).toBe('create_intelligence_agent');
  });
});
