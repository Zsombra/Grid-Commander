import { describe, expect, it } from 'vitest';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

const configured = () =>
  new FakeAgentsPort([
    anAgent({
      revision: 3,
      tradingConfig: {
        fields: {
          maxLeverage: 5,
          maxDailyLossUsd: 300,
          maxStopLossPct: 1,
          maxDailyTrades: 30,
        },
      },
    }),
  ]);

/** A4, at the application layer. */
describe('editing an agent', () => {
  it('changes an agent-owned field', async () => {
    const port = new FakeAgentsPort([anAgent()]);
    const res = await new UpdateAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      changes: { displayName: 'Renamed' },
    });
    expect(res.kind).toBe('updated');
    expect(port.agents.get('a1')?.displayName).toBe('Renamed');
  });

  it('refuses a strategy-owned field without sending anything', async () => {
    const port = new FakeAgentsPort([anAgent()]);
    const res = await new UpdateAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      changes: { contextSources: { includeRsi: false } },
    });
    expect(res.kind).toBe('rejected');
    expect(port.calls).toEqual([]);
  });

  it('refuses to edit an agent the platform does not let this client edit', async () => {
    const locked = new FakeAgentsPort([
      anAgent({ permissions: { canEdit: false, canArchive: false, canEditOverlay: false } }),
    ]);
    const res = await new UpdateAgentCommand(locked).execute({
      ...who,
      agentId: 'a1',
      changes: { displayName: 'x' },
    });
    expect(res.kind).toBe('not-editable');
    expect(locked.calls).toEqual([]);
  });

  it('refuses to edit an archived agent, and says to reactivate it', async () => {
    const port = new FakeAgentsPort([anAgent({ status: 'ARCHIVED' })]);
    const res = await new UpdateAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      changes: { displayName: 'x' },
    });
    expect(res.kind === 'not-editable' && res.reason).toMatch(/reactivate/i);
  });
});

/**
 * Design D-E. `tradingConfig` is all-or-nothing on the platform: every field is
 * required once the object is present, and a partial send does not error — it
 * resets the omitted fields to the server's defaults.
 *
 * This is the bug the read-modify-write exists to prevent, and it is silent.
 */
describe('editing one limit preserves the others', () => {
  it('sends the whole config, not just the changed field', async () => {
    const port = configured();
    await new UpdateAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      changes: {},
      tradingConfigChanges: { maxLeverage: 3 },
    });

    const sent = port.agents.get('a1')?.tradingConfig?.fields ?? {};
    expect(sent['maxLeverage']).toBe(3);
    // The fields the user did not touch must survive.
    expect(sent['maxDailyLossUsd']).toBe(300);
    expect(sent['maxStopLossPct']).toBe(1);
    expect(sent['maxDailyTrades']).toBe(30);
  });

  it('validates the merged config, not only the changed field', async () => {
    const port = configured();
    const res = await new UpdateAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      tradingConfigChanges: { maxStopLossPct: 90 },
      changes: {},
    });
    expect(res.kind).toBe('invalid');
    expect(res.kind === 'invalid' && res.issues[0]?.field).toBe('maxStopLossPct');
    expect(port.calls).toEqual([]);
  });

  it('refuses a partial edit when there is no config to merge onto', async () => {
    const port = new FakeAgentsPort([anAgent({ tradingConfig: null })]);
    const res = await new UpdateAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      changes: {},
      tradingConfigChanges: { maxLeverage: 3 },
    });
    expect(res.kind).toBe('invalid');
    expect(res.kind === 'invalid' && res.issues[0]?.reason).toMatch(/in full/i);
  });

  it('will not send money limits it could not validate', async () => {
    const port = configured();
    port.catalogReadable = false;
    const res = await new UpdateAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      changes: {},
      tradingConfigChanges: { maxLeverage: 3 },
    });
    expect(res.kind).toBe('invalid');
    expect(port.calls).toEqual([]);
  });
});
