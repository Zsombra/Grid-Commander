import { describe, expect, it } from 'vitest';
import {
  DELETION_UNAVAILABLE,
  DescribeArchiveQuery,
  SetLifecycleCommand,
} from '@/application/use-cases/lifecycle.command.js';
import { anAgent, FakeAgentsPort, SequentialRandom } from '../support/agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

function harness(agents: FakeAgentsPort) {
  const clock = new FakeClock();
  const confirmations = new FakeConfirmationStore(clock);
  return {
    agents,
    confirmations,
    clock,
    describe: new DescribeArchiveQuery(agents, confirmations, new SequentialRandom(), clock),
    set: new SetLifecycleCommand(agents),
  };
}

/** A6 — archiving is recoverable, and described as such. */
describe('archive_is_recoverable', () => {
  it('removes the agent from the active roster', async () => {
    const h = harness(new FakeAgentsPort([anAgent({ revision: 2 })]));
    await h.set.execute({ ...who, agentId: 'a1', to: 'ARCHIVED', expectedRevision: 2 });
    expect(h.agents.agents.get('a1')?.status).toBe('ARCHIVED');
  });

  it('tells the user it can be reactivated', async () => {
    const h = harness(new FakeAgentsPort([anAgent()]));
    const res = await h.describe.execute({ ...who, agentId: 'a1' });
    const text = res.kind === 'proposal' ? res.proposal.consequence : '';
    expect(text).toMatch(/reactivate/i);
  });

  it('says it frees a slot, which is why a user archives in the first place', async () => {
    const h = harness(new FakeAgentsPort([anAgent()]));
    const res = await h.describe.execute({ ...who, agentId: 'a1' });
    const text = res.kind === 'proposal' ? res.proposal.consequence : '';
    expect(text).toMatch(/slot/i);
  });

  it('never calls it deletion', async () => {
    const h = harness(new FakeAgentsPort([anAgent()]));
    const res = await h.describe.execute({ ...who, agentId: 'a1' });
    const text = res.kind === 'proposal' ? res.proposal.consequence : '';
    expect(text).toMatch(/not deletion/i);
    expect(text).not.toMatch(/permanently remove/i);
  });

  it('refuses to archive an agent that is already archived', async () => {
    const h = harness(new FakeAgentsPort([anAgent({ status: 'ARCHIVED' })]));
    expect((await h.describe.execute({ ...who, agentId: 'a1' })).kind).toBe('not-archivable');
  });
});

/** A6 — reactivating restores the agent. */
describe('reactivate_restores', () => {
  it('returns an archived agent to the roster', async () => {
    const h = harness(new FakeAgentsPort([anAgent({ status: 'ARCHIVED', revision: 3 })]));
    const res = await h.set.execute({ ...who, agentId: 'a1', to: 'ACTIVE', expectedRevision: 3 });
    expect(res.kind).toBe('changed');
    expect(h.agents.agents.get('a1')?.status).toBe('ACTIVE');
  });

  it('keeps its configuration', async () => {
    const configured = anAgent({
      status: 'ARCHIVED',
      revision: 3,
      displayName: 'Volatilis',
      tradingConfig: { fields: { maxLeverage: 5 } },
    });
    const h = harness(new FakeAgentsPort([configured]));
    await h.set.execute({ ...who, agentId: 'a1', to: 'ACTIVE', expectedRevision: 3 });
    const back = h.agents.agents.get('a1');
    expect(back?.displayName).toBe('Volatilis');
    expect(back?.tradingConfig?.fields).toEqual({ maxLeverage: 5 });
  });

  it('refuses to reactivate an agent that is not archived', async () => {
    const h = harness(new FakeAgentsPort([anAgent({ revision: 1 })]));
    const res = await h.set.execute({ ...who, agentId: 'a1', to: 'ACTIVE', expectedRevision: 1 });
    expect(res.kind).toBe('not-permitted');
  });
});

/**
 * A6 — a user looking for permanent deletion is told the truth.
 *
 * The live payload sets `capabilities.canDelete: true` and no delete tool
 * exists over MCP (findings-agents F-1). Offering archiving as though it were
 * the same thing would be the easy lie.
 */
describe('no_delete_affordance', () => {
  it('says Grid-Commander cannot do it', () => {
    expect(DELETION_UNAVAILABLE).toMatch(/cannot delete/i);
  });

  it('says where it can be done', () => {
    expect(DELETION_UNAVAILABLE).toMatch(/in BattleGrid itself/i);
  });

  it('does not offer archiving as though it were the same thing', () => {
    // Archiving is mentioned — usefully — but explicitly as the reversible
    // alternative, not as the answer to "delete this".
    expect(DELETION_UNAVAILABLE).toMatch(/reversible/i);
  });

  it('exposes no deletion operation on the port', async () => {
    const port = new FakeAgentsPort() as unknown as Record<string, unknown>;
    for (const name of ['deleteAgent', 'destroyAgent', 'removeAgent']) {
      expect(port[name], `${name} must not exist`).toBeUndefined();
    }
  });
});
