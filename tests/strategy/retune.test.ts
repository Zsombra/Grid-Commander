import { describe, expect, it } from 'vitest';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import { DescribeRetuneQuery, RetuneRuleCommand } from '@/application/use-cases/retune-rule.command.js';
import { SequentialRandom } from '../support/agent-fakes.js';
import { aDetail, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The scorecard write, behind the ceremony. What these tests hold: the
 * consequence carries the real blast radius and the platform's propagation
 * wording; the token binds strategy, revision, signal, and the exact
 * values; nothing is minted for a signal the strategy does not weigh or a
 * change that changes nothing; and the perform recomputes the target from
 * what was submitted, so a tampered field dies in the guard.
 */

const who = { userId: 'u1', accessToken: 'at' };
const RULE = { signalId: 'rsi_oversold', allocation: 1, required: false, params: { threshold: 30 } };

function world(over: Partial<Parameters<typeof aStrategy>[0]> = {}) {
  const summary = aStrategy({ boundAgentCount: 3, revision: 5, ...over });
  const strategies = new FakeStrategiesPort([summary]);
  strategies.detail = { ...aDetail(summary), signalRules: [RULE] };
  const clock = new FakeClock();
  const confirmations = new FakeConfirmationStore(clock);
  const describe = new DescribeRetuneQuery(strategies, confirmations, new SequentialRandom(), clock);
  return { summary, strategies, confirmations, describe };
}

const INTENT = { allocation: 3, required: true, ruleParams: { threshold: 25 } };

describe('describing a retune', () => {
  it('names the blast radius and the platform’s propagation terms', async () => {
    const { describe } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      signalId: 'rsi_oversold',
      intent: INTENT,
    });
    expect(result.kind).toBe('proposal');
    if (result.kind !== 'proposal') return;
    expect(result.proposal.consequence).toContain('rsi_oversold');
    expect(result.proposal.consequence).toContain('allocation 3');
    expect(result.proposal.consequence).toContain('required');
    expect(result.proposal.consequence).toContain('All 3 agents');
    expect(result.proposal.consequence).toContain('immediately');
    expect(result.proposal.consequence).toContain('open positions do not block');
    expect(result.proposal.expectedRevision).toBe(5);
  });

  it('binds the token to strategy, revision, signal, and the exact values', async () => {
    const { describe, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      signalId: 'rsi_oversold',
      intent: INTENT,
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);
    const issued = [...confirmations.tokens.values()][0];
    expect(issued?.tool).toBe('update_strategy_signal_rule');
    expect(issued?.target).toBe(
      confirmationTarget.strategyRule('s1', 5, 'rsi_oversold', {
        allocation: 3,
        required: true,
        params: { threshold: 25 },
      }),
    );
    // Stored as shown: the audit can prove what was agreed to.
    expect(issued?.consequence).toBe(result.proposal.consequence);
  });

  it('zero bound agents is said plainly, not skipped', async () => {
    const { describe } = world({ boundAgentCount: 0 });
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      signalId: 'rsi_oversold',
      intent: INTENT,
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);
    expect(result.proposal.consequence).toContain('No agents are bound');
    expect(result.proposal.consequence).toContain('next bound agent inherits');
  });

  it('a signal the strategy does not weigh mints nothing', async () => {
    const { describe, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      signalId: 'macd_bull_cross',
      intent: INTENT,
    });
    expect(result.kind).toBe('not-a-rule');
    expect(confirmations.tokens.size).toBe(0);
  });

  it('a change that changes nothing mints nothing', async () => {
    const { describe, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      signalId: 'rsi_oversold',
      intent: { allocation: 1, required: false, ruleParams: { threshold: 30 } },
    });
    expect(result.kind).toBe('no-op');
    expect(confirmations.tokens.size).toBe(0);
  });

  it('a missing or unreadable strategy mints nothing', async () => {
    const { describe, strategies, confirmations } = world();
    strategies.detail = null;
    expect(
      (await describe.execute({ ...who, strategyId: 'ghost', signalId: 'rsi_oversold', intent: INTENT }))
        .kind,
    ).toBe('strategy-missing');
    strategies.detailReadable = false;
    expect(
      (await describe.execute({ ...who, strategyId: 's1', signalId: 'rsi_oversold', intent: INTENT }))
        .kind,
    ).toBe('unreadable');
    expect(confirmations.tokens.size).toBe(0);
  });
});

describe('performing a retune', () => {
  it('sends exactly the described values with the recomputed target', async () => {
    const { strategies } = world();
    const result = await new RetuneRuleCommand(strategies).execute({
      ...who,
      strategyId: 's1',
      signalId: 'rsi_oversold',
      expectedRevision: 5,
      intent: INTENT,
      confirmationToken: 'tok-1',
    });
    expect(result).toEqual({ kind: 'retuned' });
    const call = strategies.calls.find((c) => c.op === 'update-rule');
    expect(call?.payload).toEqual({
      strategyId: 's1',
      expectedRevision: 5,
      signalId: 'rsi_oversold',
      allocation: 3,
      required: true,
      params: { threshold: 25 },
    });
    expect(call?.target).toBe(
      confirmationTarget.strategyRule('s1', 5, 'rsi_oversold', {
        allocation: 3,
        required: true,
        params: { threshold: 25 },
      }),
    );
  });

  it('a tampered value produces a different target than the mint', async () => {
    const { describe } = world();
    const minted = await describe.execute({
      ...who,
      strategyId: 's1',
      signalId: 'rsi_oversold',
      intent: { allocation: 1, required: true, ruleParams: { threshold: 30 } },
    });
    if (minted.kind !== 'proposal') throw new Error(minted.kind);
    const mintedTarget = confirmationTarget.strategyRule('s1', 5, 'rsi_oversold', {
      allocation: 1,
      required: true,
      params: { threshold: 30 },
    });
    // The perform recomputes from submitted values; allocation tampered 1→3.
    const tampered = confirmationTarget.strategyRule('s1', 5, 'rsi_oversold', {
      allocation: 3,
      required: true,
      params: { threshold: 30 },
    });
    expect(tampered).not.toBe(mintedTarget);
    // And a tampered expectedRevision changes the target too (DL-1).
    const staleRevision = confirmationTarget.strategyRule('s1', 4, 'rsi_oversold', {
      allocation: 1,
      required: true,
      params: { threshold: 30 },
    });
    expect(staleRevision).not.toBe(mintedTarget);
  });

  it('a platform refusal comes back as a reason, not a throw', async () => {
    const { strategies } = world();
    strategies.ruleWriteRefusal = 'CONFLICT: expected revision 5, actual 6';
    const result = await new RetuneRuleCommand(strategies).execute({
      ...who,
      strategyId: 's1',
      signalId: 'rsi_oversold',
      expectedRevision: 5,
      intent: INTENT,
      confirmationToken: 'tok-1',
    });
    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    expect(result.reason).toContain('CONFLICT');
  });

  it('params are omitted from the wire when the signal declares none', async () => {
    const { strategies } = world();
    await new RetuneRuleCommand(strategies).execute({
      ...who,
      strategyId: 's1',
      signalId: 'rsi_oversold',
      expectedRevision: 5,
      intent: { allocation: 2, required: false, ruleParams: undefined },
      confirmationToken: 'tok-1',
    });
    const call = strategies.calls.find((c) => c.op === 'update-rule');
    expect(call?.payload).not.toHaveProperty('params');
  });
});
