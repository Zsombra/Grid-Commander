import { describe, expect, it } from 'vitest';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import { TRADING_CONFIG_FIELDS } from '@/domain/agent/catalog.js';
import { applyEdit } from '@/domain/agent/trading-config.js';
import {
  anAgent,
  FakeAgentsPort,
  liveTradingConfig,
  READ_ONLY_CONFIG_FIELDS,
} from '../support/agent-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

const configured = () =>
  new FakeAgentsPort([anAgent({ revision: 3, tradingConfig: liveTradingConfig() })]);

/** A4, at the application layer. */
describe('editing an agent', () => {
  it('changes an agent-owned field', async () => {
    const port = new FakeAgentsPort([anAgent()]);
    const res = await new UpdateAgentCommand(port).execute({
      ...who,
      confirmationToken: 'confirmed',
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
      confirmationToken: 'confirmed',
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
      confirmationToken: 'confirmed',
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
      confirmationToken: 'confirmed',
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
      confirmationToken: 'confirmed',
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
      confirmationToken: 'confirmed',
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
      confirmationToken: 'confirmed',
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
      confirmationToken: 'confirmed',
      agentId: 'a1',
      changes: {},
      tradingConfigChanges: { maxLeverage: 3 },
    });
    expect(res.kind).toBe('invalid');
    expect(port.calls).toEqual([]);
  });
});

/**
 * The read is wider than the write, and that asymmetry made every edit fail.
 *
 * `get_intelligence_agent` returns twenty-three fields. `update_intelligence_agent`
 * accepts twenty and declares `additionalProperties: false`. The three extra —
 * `strategyTimeframe`, `regimeAutoDerive`, `regimeTimeframe` — are real facts
 * about an agent and are not writable.
 *
 * `applyEdit` was `{ ...current.fields, ...changes }`, so all twenty-three went
 * back and the platform rejected the whole object. Every time, for the life of
 * this product. It was never noticed because the fixture carried four fields and
 * none of them were the three that mattered.
 */
describe('what a read carries is not what a write may send', () => {
  it('never sends a field the write schema rejects', async () => {
    const port = configured();
    await new UpdateAgentCommand(port).execute({
      ...who,
      confirmationToken: 'confirmed',
      agentId: 'a1',
      changes: {},
      tradingConfigChanges: { maxLeverage: 3 },
    });

    const sent = port.agents.get('a1')?.tradingConfig?.fields ?? {};
    for (const field of READ_ONLY_CONFIG_FIELDS) {
      expect(sent, `${field} is rejected by additionalProperties: false`).not.toHaveProperty(field);
    }
  });

  it('sends exactly the twenty the write accepts', async () => {
    const port = configured();
    await new UpdateAgentCommand(port).execute({
      ...who,
      confirmationToken: 'confirmed',
      agentId: 'a1',
      changes: {},
      tradingConfigChanges: { maxLeverage: 3 },
    });

    const sent = port.agents.get('a1')?.tradingConfig?.fields ?? {};
    expect(Object.keys(sent).sort()).toEqual([...TRADING_CONFIG_FIELDS].sort());
  });

  it('says what it dropped rather than dropping it quietly', () => {
    const edit = applyEdit(liveTradingConfig(), { maxLeverage: 3 });
    expect([...edit.dropped].sort()).toEqual([...READ_ONLY_CONFIG_FIELDS].sort());
  });

  it('starts from a fixture that could actually exist', () => {
    // A four-field config is unconstructible: create requires all twenty. The
    // old fixture proved a read-modify-write preserved untouched fields — true,
    // and useless, because it omitted the three keys that made every edit fail.
    const fields = liveTradingConfig().fields;
    expect(Object.keys(fields)).toHaveLength(TRADING_CONFIG_FIELDS.length + 3);
    for (const field of READ_ONLY_CONFIG_FIELDS) expect(fields).toHaveProperty(field);
  });

  it('refuses an incomplete merge rather than resetting what it omits', async () => {
    // A partial tradingConfig does not error — it resets the fields it omits.
    // The create path has always refused one; the edit path never did.
    const short = liveTradingConfig();
    const fields = { ...short.fields };
    delete fields['maxDailyLossUsd'];
    const port = new FakeAgentsPort([anAgent({ tradingConfig: { fields } })]);

    const res = await new UpdateAgentCommand(port).execute({
      ...who,
      confirmationToken: 'confirmed',
      agentId: 'a1',
      changes: {},
      tradingConfigChanges: { maxLeverage: 3 },
    });

    expect(res.kind).toBe('invalid');
    expect(res.kind === 'invalid' && res.issues[0]?.field).toBe('maxDailyLossUsd');
    expect(port.calls, 'nothing may reach the platform').toEqual([]);
  });
});
