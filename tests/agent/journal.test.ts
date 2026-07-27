import { describe, expect, it } from 'vitest';
import { ListAuditQuery } from '@/application/use-cases/list-audit.query.js';
import { ReadAgentJournalQuery } from '@/application/use-cases/read-agent-journal.query.js';
import { RecordAuditCommand } from '@/application/use-cases/record-audit.command.js';
import { FakeAgentsPort } from '../support/agent-fakes.js';
import { FakeAuditStore, FakeClock } from '../support/fakes.js';

const who = { userId: 'u1', accessToken: 'at', agentId: 'a1' };

/** A9 — an agent's reasoning is readable. */
describe('reads_agent_record', () => {
  it('returns the entries BattleGrid recorded', async () => {
    const port = new FakeAgentsPort();
    port.journalEntries = {
      kind: 'entries',
      entries: [
        {
          at: new Date('2026-07-27T10:00:00Z'),
          kind: 'THOUGHT',
          summary: 'BTC volatility expanding',
          detail: 'ATR up 40% on the 1h',
        },
      ],
    };
    const res = await new ReadAgentJournalQuery(port).execute(who);
    expect(res.journal.kind).toBe('entries');
    expect(res.journal.kind === 'entries' && res.journal.entries[0]?.summary).toContain('BTC');
  });

  it('distinguishes a silent agent from an unreadable one', async () => {
    const quiet = new FakeAgentsPort();
    quiet.journalEntries = { kind: 'empty' };
    expect((await new ReadAgentJournalQuery(quiet).execute(who)).journal.kind).toBe('empty');

    const broken = new FakeAgentsPort();
    broken.journalEntries = { kind: 'unreadable', reason: 'BattleGrid did not respond' };
    expect((await new ReadAgentJournalQuery(broken).execute(who)).journal.kind).toBe('unreadable');
  });
});

/**
 * A9, second scenario — the two records answer different questions and must not
 * be mistaken for one another.
 *
 * The journal answers "what did my agent think?". The audit log answers "what
 * did *this product* do to my account?". A user who conflates them either
 * mistrusts their agent for something we did, or trusts us for something we
 * did not.
 */
describe('journal_is_not_the_audit_log', () => {
  it('the journal says whose record it is', async () => {
    const res = await new ReadAgentJournalQuery(new FakeAgentsPort()).execute(who);
    expect(res.recordOf).toBe('agent');
    expect(res.heading).toMatch(/this agent thought and did/i);
  });

  it('the two carry different content for the same period', async () => {
    const clock = new FakeClock();
    const auditStore = new FakeAuditStore(clock);
    const record = new RecordAuditCommand(auditStore);
    const id = await record.begin({
      userId: 'u1',
      tool: 'update_intelligence_agent',
      destructive: false,
      idempotencyKey: null,
    });
    await record.complete(id, 'succeeded');

    const port = new FakeAgentsPort();
    port.journalEntries = {
      kind: 'entries',
      entries: [
        { at: clock.now(), kind: 'THOUGHT', summary: 'considered a long on SOL', detail: null },
      ],
    };

    const journal = await new ReadAgentJournalQuery(port).execute(who);
    const audit = await new ListAuditQuery(auditStore).execute({ userId: 'u1' });

    // The agent's record holds a thought; ours holds a tool call. Neither
    // contains the other's entry.
    const journalText = journal.journal.kind === 'entries' ? journal.journal.entries[0]?.summary : '';
    expect(journalText).toContain('SOL');
    expect(audit.entries[0]?.tool).toBe('update_intelligence_agent');
    expect(journalText).not.toContain('update_intelligence_agent');
  });

  it('the journal is not sourced from the audit log', async () => {
    // A journal backed by our own audit rows would answer the wrong question
    // while looking correct.
    const port = new FakeAgentsPort();
    port.journalEntries = { kind: 'empty' };
    const res = await new ReadAgentJournalQuery(port).execute(who);
    expect(res.journal.kind).toBe('empty');
  });
});
