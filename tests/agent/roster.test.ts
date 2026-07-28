import { describe, expect, it } from 'vitest';
import { ListAgentsQuery } from '@/application/use-cases/list-agents.query.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

/** A1 — the roster reflects the live account. */
describe('shows_live_agents', () => {
  it('returns the agents the account holds', async () => {
    const port = new FakeAgentsPort([anAgent(), anAgent({ id: 'a2', displayName: 'Momentum' })]);
    const res = await new ListAgentsQuery(port).execute(who);

    expect(res.roster.kind).toBe('agents');
    expect(res.roster.kind === 'agents' && res.roster.agents.map((a) => a.displayName)).toEqual([
      'Volatilis',
      'Momentum',
    ]);
  });

  it('carries each agent’s binding and lifecycle state', async () => {
    const port = new FakeAgentsPort([anAgent({ status: 'ARCHIVED' })]);
    const res = await new ListAgentsQuery(port).execute(who);

    const first = res.roster.kind === 'agents' ? res.roster.agents[0] : undefined;
    expect(first?.status).toBe('ARCHIVED');
    expect(first?.binding.strategyName).toBe('Volatilis — imported');
  });
});

/** A1 — an empty account is not a failure. */
describe('empty_is_not_failure', () => {
  it('reports empty as its own state', async () => {
    const res = await new ListAgentsQuery(new FakeAgentsPort()).execute(who);
    expect(res.roster.kind).toBe('empty');
  });

  it('still offers the path to create one', async () => {
    const res = await new ListAgentsQuery(new FakeAgentsPort()).execute(who);
    expect(res.creation.kind).toBe('available');
  });
});

/**
 * A1 — a roster that could not be read must never render as "you have no
 * agents". That mistake ends with a user recreating something they already own,
 * or believing their work was deleted.
 */
describe('unreadable_is_not_empty', () => {
  const broken = () => {
    const port = new FakeAgentsPort();
    port.rosterReadable = false;
    return port;
  };

  it('reports unreadable, distinctly from empty', async () => {
    const res = await new ListAgentsQuery(broken()).execute(who);
    expect(res.roster.kind).toBe('unreadable');
    expect(res.roster.kind).not.toBe('empty');
  });

  it('says why', async () => {
    const res = await new ListAgentsQuery(broken()).execute(who);
    expect(res.roster.kind === 'unreadable' && res.roster.reason).toBeTruthy();
  });

  it('offers no create action against state it could not read', async () => {
    const res = await new ListAgentsQuery(broken()).execute(who);
    expect(res.creation.kind).toBe('unknown');
    expect(res.creation.kind).not.toBe('available');
  });
});
