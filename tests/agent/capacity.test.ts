import { describe, expect, it } from 'vitest';
import { CreateAgentCommand } from '@/application/use-cases/create-agent.command.js';
import { ListAgentsQuery } from '@/application/use-cases/list-agents.query.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

const validCreate = {
  ...who,
  displayName: 'New Agent',
  brain: { kind: 'preset', preset: 'ROMMEL' } as const,
  strategyId: 's1',
  tradingConfig: null,
};

function full(): FakeAgentsPort {
  const port = new FakeAgentsPort([anAgent(), anAgent({ id: 'a2' }), anAgent({ id: 'a3' })]);
  port.slots = { limit: 3, used: 3, remaining: 0, rankName: 'Recruit III' };
  return port;
}

/** A3 — capacity is explained before the form, not after submission. */
describe('refuses_before_the_form', () => {
  it('does not offer creation when no slots remain', async () => {
    const res = await new ListAgentsQuery(full()).execute(who);
    expect(res.creation.kind).toBe('at-capacity');
  });

  it('explains what governs the limit, not merely that there is one', async () => {
    const res = await new ListAgentsQuery(full()).execute(who);
    const explanation = res.creation.kind === 'at-capacity' ? res.creation.explanation : '';
    // "No slots left" is unhelpful; "Recruit III allows 3" is actionable.
    expect(explanation).toContain('Recruit III');
    expect(explanation).toContain('3');
  });

  it('offers a way out', async () => {
    const res = await new ListAgentsQuery(full()).execute(who);
    const explanation = res.creation.kind === 'at-capacity' ? res.creation.explanation : '';
    expect(explanation).toMatch(/archiv/i);
  });

  it('refuses a create that reaches the command anyway, before attempting it', async () => {
    const port = full();
    const res = await new CreateAgentCommand(port).execute(validCreate);
    expect(res.kind).toBe('at-capacity');
    // Nothing was sent. A refusal is not an attempt.
    expect(port.calls).toEqual([]);
  });

  it('permits creation when a slot remains', async () => {
    const port = new FakeAgentsPort([anAgent()]);
    const res = await new CreateAgentCommand(port).execute(validCreate);
    expect(res.kind).toBe('created');
  });
});
