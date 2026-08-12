import { describe, expect, it } from 'vitest';
import { DescribeRebindQuery, RebindAgentCommand } from '@/application/use-cases/rebind-agent.command.js';
import { beginGuardedCall } from '@/infrastructure/battlegrid/call-path.js';
import { ConfirmationRequiredError } from '@/domain/errors.js';
import { anAgent, FakeAgentsPort, SequentialRandom } from '../support/agent-fakes.js';
import { aDetail, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

const who = { userId: 'u1', accessToken: 'at' };
const target = { toStrategyId: 's-new' };

function harness(agents = new FakeAgentsPort([anAgent({ revision: 4 })])) {
  const clock = new FakeClock();
  const confirmations = new FakeConfirmationStore(clock);
  const audit = new FakeAuditStore(clock);
  // The destination, as the platform holds it: name and revision come from
  // this read now, never from the caller.
  const strategies = new FakeStrategiesPort();
  strategies.detail = aDetail(aStrategy({ id: 's-new', name: 'Momentum Breakout', revision: 7 }));
  return {
    agents,
    strategies,
    confirmations,
    audit,
    clock,
    propose: new DescribeRebindQuery(agents, strategies, confirmations, new SequentialRandom(), clock),
    perform: new RebindAgentCommand(agents, strategies),
  };
}

const destructive = {
  mutating: true,
  destructive: true,
  requiredScope: 'mcp:read' as const,
  basis: 'annotations' as const,
};

/** A5 — the confirmation is issued alongside the consequence, bound to the pair. */
describe('rebind proposal', () => {
  it('issues a token against the rendered consequence', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    expect(res.kind).toBe('proposal');
    if (res.kind !== 'proposal') return;

    const stored = h.confirmations.tokens.get(res.proposal.confirmationToken);
    // The wording the user was shown is what gets stored, so the audit can prove
    // what was agreed to rather than what the copy says today.
    expect(stored?.consequence).toBe(res.proposal.consequence);
  });

  it('binds it to this agent and this destination', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    const stored = h.confirmations.tokens.get(res.proposal.confirmationToken);
    expect(stored?.target).toBe('agent:a1->strategy:s-new@r7');
  });

  it('carries the revision the proposal was formed at', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    expect(res.kind === 'proposal' && res.proposal.rebind.expectedRevision).toBe(4);
  });

  it('refuses to propose a rebind to the strategy already bound', async () => {
    const h = harness();
    // The platform's answer for the destination: the strategy the agent is
    // already bound to. The no-op is decided on what was read, not claimed.
    h.strategies.detail = aDetail(
      aStrategy({ id: 's1', name: 'Volatilis — imported', revision: 3 }),
    );
    const res = await h.propose.execute({
      ...who,
      agentId: 'a1',
      toStrategyId: 's1',
    });
    expect(res.kind).toBe('no-op');
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('refuses to propose one for an agent the platform locks', async () => {
    const h = harness(
      new FakeAgentsPort([
        anAgent({ permissions: { canEdit: false, canArchive: false, canEditOverlay: false } }),
      ]),
    );
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    expect(res.kind).toBe('not-rebindable');
    expect(h.confirmations.tokens.size).toBe(0);
  });
});

/** A5, second scenario — confirmation withheld means nothing changes. */
describe('nothing_changes', () => {
  it('does not attempt a destructive call without a confirmation', async () => {
    const h = harness();
    await expect(
      beginGuardedCall(
        { audit: h.audit, confirmations: h.confirmations, heldScopes: ['mcp:read'] },
        { userId: 'u1', tool: 'rebind_intelligence_agent', classification: destructive, target: 'agent:a1->strategy:s-new@r7' },
      ),
    ).rejects.toBeInstanceOf(ConfirmationRequiredError);
  });

  it('leaves the agent exactly as it was', async () => {
    const h = harness();
    await h.propose.execute({ ...who, agentId: 'a1', ...target });
    // Proposing is not performing. The user closed the dialog.
    expect(h.agents.agents.get('a1')?.binding.strategyId).toBe('s1');
    expect(h.agents.calls).toEqual([]);
  });
});

/**
 * A5, third scenario — a confirmation issued for one pair cannot authorise
 * another. This is DL-5's token design earning its keep.
 */
describe('refuses_a_token_for_another_pair', () => {
  const guardWith = (h: ReturnType<typeof harness>, target_: string, token?: string) =>
    beginGuardedCall(
      { audit: h.audit, confirmations: h.confirmations, heldScopes: ['mcp:read'] },
      {
        userId: 'u1',
        tool: 'rebind_intelligence_agent',
        classification: destructive,
        target: target_,
        confirmationToken: token,
      },
    );

  it('accepts the token for the pair it was issued for', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    await expect(
      guardWith(h, 'agent:a1->strategy:s-new@r7', res.proposal.confirmationToken),
    ).resolves.toBeTruthy();
  });

  it('refuses it for a different agent', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    await expect(
      guardWith(h, 'agent:a2->strategy:s-new@r7', res.proposal.confirmationToken),
    ).rejects.toBeInstanceOf(ConfirmationRequiredError);
  });

  it('refuses it for a different destination strategy', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    await expect(
      guardWith(h, 'agent:a1->strategy:s-other@r7', res.proposal.confirmationToken),
    ).rejects.toBeInstanceOf(ConfirmationRequiredError);
  });

  it('refuses a second use of a token already spent', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    await guardWith(h, 'agent:a1->strategy:s-new@r7', res.proposal.confirmationToken);
    await expect(
      guardWith(h, 'agent:a1->strategy:s-new@r7', res.proposal.confirmationToken),
    ).rejects.toBeInstanceOf(ConfirmationRequiredError);
  });
});

describe('performing the rebind', () => {
  it('passes the confirmation through to the platform call', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');

    await h.perform.execute({
      ...who,
      agentId: 'a1',
      toStrategyId: 's-new',
      toStrategyRevision: res.proposal.rebind.toStrategyRevision,
      expectedRevision: res.proposal.rebind.expectedRevision,
      confirmationToken: res.proposal.confirmationToken,
    });

    expect(h.agents.calls[0]).toMatchObject({
      op: 'rebind',
      revision: 4,
      token: res.proposal.confirmationToken,
    });
    expect(h.agents.agents.get('a1')?.binding.strategyId).toBe('s-new');
  });
});

/**
 * The race this change closes: the destination moved between reading and
 * confirming. The perform re-reads it and refuses — nothing is attempted,
 * and the reason names both revisions.
 */
describe('the destination moved between reading and confirming', () => {
  it('refuses, attempts nothing, and names both revisions', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');

    // Berlin moves while the user reads.
    h.strategies.detail = aDetail(
      aStrategy({ id: 's-new', name: 'Momentum Breakout', revision: 8 }),
    );

    const result = await h.perform.execute({
      ...who,
      agentId: 'a1',
      toStrategyId: 's-new',
      toStrategyRevision: res.proposal.rebind.toStrategyRevision,
      expectedRevision: res.proposal.rebind.expectedRevision,
      confirmationToken: res.proposal.confirmationToken,
    });

    expect(result.kind).toBe('destination-moved');
    expect(result.kind === 'destination-moved' && result.reason).toContain('revision 8');
    expect(result.kind === 'destination-moved' && result.reason).toContain('revision 7');
    expect(h.agents.calls).toEqual([]);
  });

  it('a platform refusal of the perform returns as an outcome, never a throw', async () => {
    // Live-confirmed 2026-08-12: BattleGrid refuses a stale-revision rebind by
    // raising CONFLICT ("Agent was modified by another session"). Before the
    // refused arm this escaped the command and rendered a framework error page
    // — the outcome-reaches-the-person requirement's thrown-refusal scenario.
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');

    // The agent moves under the confirmation: the platform, not the
    // destination re-read, is what refuses.
    const result = await h.perform.execute({
      ...who,
      agentId: 'a1',
      toStrategyId: 's-new',
      toStrategyRevision: res.proposal.rebind.toStrategyRevision,
      expectedRevision: res.proposal.rebind.expectedRevision - 1,
      confirmationToken: res.proposal.confirmationToken,
    });

    expect(result.kind).toBe('refused');
    // The reason is the platform's own wording, not a generic failure.
    expect(result.kind === 'refused' && result.reason).toContain('revision conflict');
    expect(h.agents.agents.get('a1')?.binding.strategyId).not.toBe('s-new');
  });

  it('a destination that cannot be re-read refuses the same way', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    h.strategies.detailReadable = false;
    const result = await h.perform.execute({
      ...who,
      agentId: 'a1',
      toStrategyId: 's-new',
      toStrategyRevision: 7,
      expectedRevision: 4,
      confirmationToken: res.proposal.confirmationToken,
    });
    expect(result.kind).toBe('destination-moved');
    expect(h.agents.calls).toEqual([]);
  });
});

describe('the destination is read, not repeated', () => {
  it('the consequence carries the platform name and revision', async () => {
    const h = harness();
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    expect(res.proposal.consequence).toContain('Momentum Breakout');
    expect(res.proposal.consequence).toContain('revision 7');
    expect(res.proposal.rebind.toStrategyRevision).toBe(7);
  });

  it('an unreadable destination refuses before any token exists', async () => {
    const h = harness();
    h.strategies.detailReadable = false;
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    expect(res.kind).toBe('destination-unavailable');
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('a missing destination refuses likewise', async () => {
    const h = harness();
    h.strategies.detail = null;
    const res = await h.propose.execute({ ...who, agentId: 'a1', ...target });
    expect(res.kind).toBe('destination-unavailable');
    expect(res.kind === 'destination-unavailable' && res.reason).toContain('no strategy');
  });
});
