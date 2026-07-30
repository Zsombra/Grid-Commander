import { describe, expect, it } from 'vitest';
import { ListAuditQuery } from '@/application/use-cases/list-audit.query.js';
import { ReadAgentJournalQuery } from '@/application/use-cases/read-agent-journal.query.js';
import { RecordAuditCommand } from '@/application/use-cases/record-audit.command.js';
import { mapRecord } from '@/infrastructure/battlegrid/agent-mapper.js';
import { FakeAgentsPort } from '../support/agent-fakes.js';
import { FakeAuditStore, FakeClock } from '../support/fakes.js';
import { ACTIVE_JOURNAL, STARVED_JOURNAL } from '../support/journal-payloads.js';

const who = { userId: 'u1', accessToken: 'at', agentId: 'a1' };

/**
 * A9 — an agent's reasoning is readable.
 *
 * **Fed from a recorded payload, not from a hand-built result.** Every test
 * below used to assign `port.journalEntries` a value it had invented and then
 * assert the query returned it, which proves the query forwards a field. The
 * mapper stayed untested for the life of the page, and it was reading a key the
 * platform does not send — so the whole suite was green while the product told
 * every user that every agent had recorded nothing.
 */
describe('reads_agent_record', () => {
  it('returns what BattleGrid recorded', async () => {
    const port = new FakeAgentsPort();
    port.journalEntries = { kind: 'record', record: mapRecord(ACTIVE_JOURNAL) };

    const res = await new ReadAgentJournalQuery(port).execute(who);
    expect(res.journal.kind).toBe('record');
    if (res.journal.kind !== 'record') return;
    expect(res.journal.happenings[0]?.kind).toBe('Skipped a round');
    expect(res.journal.reasonings[0]?.entry.reasoning).toContain('risk-off');
    expect(res.journal.submissions[0]?.settled).toBe(false);
  });

  it('surfaces why an agent is not trading', async () => {
    const port = new FakeAgentsPort();
    port.journalEntries = { kind: 'record', record: mapRecord(STARVED_JOURNAL) };

    const res = await new ReadAgentJournalQuery(port).execute(who);
    expect(res.journal.kind === 'record' && res.journal.happenings[0]?.sentence).toContain(
      'Deposit USDC',
    );
  });

  it('distinguishes a silent agent from an unreadable one', async () => {
    const quiet = new FakeAgentsPort();
    quiet.journalEntries = { kind: 'empty' };
    expect((await new ReadAgentJournalQuery(quiet).execute(who)).journal.kind).toBe('none');

    const broken = new FakeAgentsPort();
    broken.journalEntries = { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
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
      actor: 'user',
      tool: 'update_intelligence_agent',
      destructive: false,
      idempotencyKey: null,
    });
    await record.complete(id, 'succeeded');

    const port = new FakeAgentsPort();
    port.journalEntries = { kind: 'record', record: mapRecord(ACTIVE_JOURNAL) };

    const journal = await new ReadAgentJournalQuery(port).execute(who);
    const audit = await new ListAuditQuery(auditStore).execute({ userId: 'u1' });

    // The agent's record holds its own reasoning; ours holds a tool call.
    // Neither contains the other's entry.
    const journalText =
      journal.journal.kind === 'record' ? (journal.journal.reasonings[0]?.entry.reasoning ?? '') : '';
    expect(journalText).toContain('VWAP');
    expect(audit.entries[0]?.tool).toBe('update_intelligence_agent');
    expect(journalText).not.toContain('update_intelligence_agent');
  });

  it('the journal is not sourced from the audit log', async () => {
    // A journal backed by our own audit rows would answer the wrong question
    // while looking correct.
    const port = new FakeAgentsPort();
    port.journalEntries = { kind: 'empty' };
    const res = await new ReadAgentJournalQuery(port).execute(who);
    expect(res.journal.kind).toBe('none');
  });
});
