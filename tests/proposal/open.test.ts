import { describe, expect, it } from 'vitest';
import { OpenProposalQuery } from '@/application/use-cases/open-proposal.query.js';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { FakeProposalStore, aProposal } from '../support/proposal-fakes.js';
import { FakeAgentsPort, anAgent, liveTradingConfig } from '../support/agent-fakes.js';
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

/**
 * A proposed trading limit, read against the config it will be merged into.
 *
 * The agent holds `tradingConfig` as `{ fields: {...} }` and a proposal names
 * members of it. Comparing the two whole reports a change every time — so
 * "stop this agent", proposed against an agent already stopped, would offer a
 * confirmation for nothing and tell the operator it was doing something.
 */
describe('a proposal that names members of the trading config', () => {
  const target = anAgent().id;
  const proposing = (mode: string) =>
    aProposal({
      userId: 'owner',
      target,
      proposedValues: { changes: { tradingConfig: { tradingMode: mode } } },
      recordedAt: NOW,
    });

  it('names the member, not the object, when it would change', async () => {
    const { query } = subject(
      [proposing('OFF')],
      anAgent({ tradingConfig: liveTradingConfig({ tradingMode: 'APPROVAL_REQUIRED' }) }),
    );
    const r = await query.execute({ ...who, id: 'p1' });
    expect(r.kind).toBe('ready');
    if (r.kind !== 'ready') throw new Error('unreachable');
    expect(r.dispositions).toEqual([
      {
        key: 'tradingConfig.tradingMode',
        kind: 'will-change',
        proposed: 'OFF',
        current: 'APPROVAL_REQUIRED',
      },
    ]);
  });

  it('says already-true for an agent that is already stopped', async () => {
    const { query } = subject(
      [proposing('OFF')],
      anAgent({ tradingConfig: liveTradingConfig({ tradingMode: 'OFF' }) }),
    );
    const r = await query.execute({ ...who, id: 'p1' });
    /**
     * `no-op`, and therefore no confirmation.
     *
     * `describeEdit` returns a sentence for any `tradingConfig` present — it
     * compares against the agent's name, not its config — so this arrived as a
     * ready proposal with a token attached, and the page showed a button to
     * agree directly above the words "nothing here would change the account".
     */
    expect(r.kind).toBe('no-op');
    if (r.kind !== 'no-op') throw new Error('unreachable');
    expect(r.dispositions).toEqual([
      { key: 'tradingConfig.tradingMode', kind: 'already-true', proposed: 'OFF' },
    ]);
    expect(r.reason).toContain('already the case');
    expect(r, 'no confirmation is offered at all').not.toHaveProperty('confirmationToken');
  });
});
