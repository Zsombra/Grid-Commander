import { describe, expect, it } from 'vitest';
import { OpenProposalQuery } from '@/application/use-cases/open-proposal.query.js';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { FakeProposalStore, aProposal } from '../support/proposal-fakes.js';
import { FakeAgentsPort, anAgent } from '../support/agent-fakes.js';
import { FakeConfirmationStore } from '../support/fakes.js';
import { FakeClock } from '../support/fakes.js';

/**
 * Opening a proposal is where the ceremony begins, not where it is bypassed.
 *
 * Every branch below is a reason not to offer a confirmation, and each must say
 * something different. A disabled control implies the change is available; no
 * explanation implies the product is broken.
 */

const NOW = new Date('2026-08-05T09:00:00Z');
const who = { userId: 'owner', accessToken: 'tok' };

function subject(rows = [aProposal({ userId: 'owner' })], agent = anAgent()) {
  const proposals = new FakeProposalStore();
  proposals.rows = rows;
  const agents = new FakeAgentsPort([agent]);
  const clock = new FakeClock(NOW);
  const query = new OpenProposalQuery(
    proposals,
    agents,
    new DescribeEditQuery(agents, new FakeConfirmationStore(clock), { token: () => 'c1', codeChallengeS256: () => '' }, clock),
    clock,
  );
  return { proposals, agents, query };
}

describe('opening a proposal describes it against the world as it is now', () => {
  it('offers a confirmation minted just now, not one stored earlier', async () => {
    const { query } = subject([
      aProposal({
        userId: 'owner',
        target: anAgent().id,
        proposedValues: { changes: { displayName: 'Renamed' } },
        recordedAt: NOW,
      }),
    ]);
    const r = await query.execute({ ...who, id: 'p1' });
    expect(r.kind).toBe('ready');
    if (r.kind !== 'ready') throw new Error('unreachable');
    // The confirmation exists because a describe ran during this call.
    expect(r.confirmationToken).toBeTruthy();
    expect(r.consequence).toBeTruthy();
    expect(r.dispositions.map((d) => d.kind)).toEqual(['will-change']);
  });

  it('is not found for another account', async () => {
    // The store scopes by user, so "someone else's" and "no such thing" are the
    // same answer — and that is the right one to give.
    const { query } = subject([aProposal({ userId: 'someone-else' })]);
    expect((await query.execute({ ...who, id: 'p1' })).kind).toBe('not-found');
  });

  it('will not reopen one already agreed or declined', async () => {
    const { query } = subject([aProposal({ userId: 'owner', status: 'agreed' })]);
    expect((await query.execute({ ...who, id: 'p1' })).kind).toBe('resolved');
  });

  it('will not open one past the horizon', async () => {
    const { query } = subject([
      aProposal({ userId: 'owner', recordedAt: new Date('2026-07-01T09:00:00Z') }),
    ]);
    expect((await query.execute({ ...who, id: 'p1' })).kind).toBe('stale');
  });

  it('says the agent could not be read rather than offering a confirmation', async () => {
    const { query, agents } = subject();
    agents.getAgent = async () => {
      throw new Error('BattleGrid did not answer');
    };
    const r = await query.execute({ ...who, id: 'p1' });
    expect(r.kind).toBe('not-possible');
    if (r.kind !== 'not-possible') throw new Error('unreachable');
    expect(r.reason).toContain('BattleGrid did not answer');
  });

  it('says the store could not be read, distinctly from not-found', async () => {
    const { query, proposals } = subject();
    proposals.listFails = 'x';
    proposals.get = async () => {
      throw new Error('the database refused');
    };
    const r = await query.execute({ ...who, id: 'p1' });
    expect(r.kind).toBe('unreadable');
    expect(r.kind === 'unreadable' && r.reason).toContain('the database refused');
  });

  it('offers no confirmation when every proposed field is owned elsewhere', async () => {
    const { query } = subject([
      aProposal({
        userId: 'owner',
        target: anAgent().id,
        // signalRules belongs to the bound strategy.
        proposedValues: { changes: { signalRules: [] } },
        recordedAt: NOW,
      }),
    ]);
    const r = await query.execute({ ...who, id: 'p1' });
    expect(r.kind).toBe('no-op');
    if (r.kind !== 'no-op') throw new Error('unreachable');
    // And the refusal is shown per field rather than summarised away.
    expect(r.dispositions.map((d) => d.kind)).toEqual(['refused']);
  });
});
