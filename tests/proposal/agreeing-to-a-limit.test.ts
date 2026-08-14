import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import { editArguments } from '@/presentation/form.js';
import {
  anAgent,
  FakeAgentsPort,
  liveTradingConfig,
  SequentialRandom,
} from '../support/agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * Agreeing to a proposed trading limit must merge it, not replace the config.
 *
 * `tradingConfig` is BattleGrid's one partial-is-destructive field: all twenty
 * members are required once the object is present, and a send carrying one does
 * not error — it resets the other nineteen to the platform's defaults.
 * `UpdateAgentCommand` guards that by taking the typed members as a separate
 * argument, merging them onto the agent's current config, refusing an
 * incomplete merge and validating the result against the catalog.
 *
 * `/pending/[id]` handed the whole proposed `changes` object over, so a model
 * proposing `{tradingConfig: {tradingMode: 'OFF'}}` would have had every loss
 * cap on the agent cleared as the price of stopping it. Found by walking the
 * live loop this change exists to serve — the flagship proposal is the one that
 * triggers it, and no fixture would have caught it because the fake merges the
 * same way the platform does.
 */

const who = { userId: 'owner', accessToken: 'tok' };

function harness() {
  const clock = new FakeClock();
  const agent = anAgent({ tradingConfig: liveTradingConfig({ tradingMode: 'APPROVAL_REQUIRED' }) });
  const agents = new FakeAgentsPort([agent]);
  const confirmations = new FakeConfirmationStore(clock);
  const describe = new DescribeEditQuery(agents, confirmations, new SequentialRandom(), clock);
  return { agent, agents, describe, update: new UpdateAgentCommand(agents) };
}

describe('what a proposal hands to the write', () => {
  it('separates the merged config from the fields that are replaced', () => {
    const { changes, tradingConfigChanges } = editArguments({
      displayName: 'Renamed',
      tradingConfig: { tradingMode: 'OFF' },
    });
    expect(changes).toEqual({ displayName: 'Renamed' });
    expect(tradingConfigChanges).toEqual({ tradingMode: 'OFF' });
  });

  it('reports no config at all rather than an empty one', () => {
    // Absent and empty are different intents, and the digest tells them apart.
    expect(editArguments({ displayName: 'x' }).tradingConfigChanges).toBeUndefined();
  });

  it('keeps the other fourteen limits the agent runs under', async () => {
    const { agent, agents, describe, update } = harness();
    const proposed = { tradingConfig: { tradingMode: 'OFF' } };

    // The describe the page runs when a person opens the proposal.
    const described = await describe.execute({ ...who, agentId: agent.id, changes: proposed });
    expect(described.kind).toBe('proposal');
    if (described.kind !== 'proposal') throw new Error('unreachable');

    // What the agree action submits, built the way the page builds it.
    const { changes, tradingConfigChanges } = editArguments(proposed);
    const result = await update.execute({
      ...who,
      agentId: agent.id,
      changes,
      ...(tradingConfigChanges ? { tradingConfigChanges } : {}),
      confirmationToken: described.proposal.confirmationToken,
    });

    // The token was minted against `{tradingConfig: {...}}` and spent against
    // `{changes: {}, tradingConfigChanges: {...}}`. They digest identically
    // because the target sorts keys — which is what makes the split safe to do
    // after the confirmation was formed.
    expect(result.kind, 'the agreement still authorises the write').toBe('updated');

    const after = await agents.getAgent({ agentId: agent.id });
    const fields = after.tradingConfig?.fields ?? {};
    expect(fields['tradingMode'], 'the proposed member took effect').toBe('OFF');
    expect(Object.keys(fields).length, 'the merge sent the whole config').toBeGreaterThan(14);
    expect(fields['maxDailyLossUsd'], 'the loss cap survived stopping the agent').toBe(300);
    expect(fields['maxCumulativeDrawdownUsd']).toBe(500);
  });

  it('would have cleared them had the config travelled inside changes', async () => {
    /**
     * The defect, run deliberately, so the test above is not merely asserting
     * that a fake behaves. `changes.tradingConfig` bypasses the merge entirely:
     * `partitionEdit` accepts it as an agent-owned field and the object reaches
     * the platform exactly as proposed.
     */
    const { agent, agents, describe, update } = harness();
    const proposed = { tradingConfig: { tradingMode: 'OFF' } };
    const described = await describe.execute({ ...who, agentId: agent.id, changes: proposed });
    if (described.kind !== 'proposal') throw new Error('unreachable');

    const result = await update.execute({
      ...who,
      agentId: agent.id,
      changes: proposed,
      confirmationToken: described.proposal.confirmationToken,
    });
    expect(result.kind, 'and it is accepted — nothing below the page refuses it').toBe('updated');

    const fields = (await agents.getAgent({ agentId: agent.id })).tradingConfig?.fields ?? {};
    expect(Object.keys(fields), 'one field reaches the platform, not twenty').toEqual([
      'tradingMode',
    ]);
    expect(fields['maxDailyLossUsd'], 'every cap is gone').toBeUndefined();
  });
});

/**
 * And nothing may go back to doing it by hand.
 *
 * Both server actions that perform an edit compose the same two arguments, and
 * they diverged once already — the edit form split the config inline and the
 * proposal page never learned it had to. A shared function only helps if it is
 * the one that is used.
 */
describe('every action that performs an edit uses the shared split', () => {
  const ACTIONS = [
    // The edit action lives beside its page since
    // `the-build-checks-what-next-generates`; pending's is still in-page.
    'app/(app)/agents/[id]/edit/actions.ts',
    'app/(app)/pending/[id]/page.tsx',
  ] as const;

  it('finds the actions it is checking', () => {
    for (const file of ACTIONS) {
      expect(readFileSync(file, 'utf8'), `${file} performs an edit`).toContain(
        'updateAgent.execute',
      );
    }
  });

  it('builds the arguments with editArguments rather than destructuring inline', () => {
    const offenders = ACTIONS.filter((file) => !readFileSync(file, 'utf8').includes('editArguments('));
    expect(
      offenders,
      'a hand-rolled split is how a partial tradingConfig reaches the platform whole',
    ).toEqual([]);
  });
});
