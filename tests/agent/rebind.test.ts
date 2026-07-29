import { describe, expect, it } from 'vitest';
import type { Agent } from '@/domain/agent/agent.js';
import { describeRebind, isNoOp, planRebind, rebindTarget } from '@/domain/agent/rebind.js';

const agent: Agent = {
  id: 'a1',
  revision: 6,
  displayName: 'Volatilis',
  status: 'ACTIVE',
  binding: {
    strategyId: 's-old',
    strategyName: 'Volatilis — imported',
    strategyRevision: 1,
    state: 'BOUND',
  },
  brain: { kind: 'preset', preset: 'ROMMEL' },
  tradingConfig: null,
  arenaChallengeEnabled: false,
  overlayText: null,
  performance: null,
  permissions: { canEdit: true, canArchive: true, canEditOverlay: true },
};

const target = { id: 's-new', name: 'Momentum Breakout' };

/** A5 — rebinding states that it replaces, not merges. */
describe('names_the_replacement', () => {
  const text = describeRebind(planRebind(agent, target));

  it('names the agent and both strategies', () => {
    expect(text).toContain('Volatilis');
    expect(text).toContain('Volatilis — imported');
    expect(text).toContain('Momentum Breakout');
  });

  it('says replaced, and says not merged', () => {
    expect(text).toMatch(/replaced/i);
    expect(text).toMatch(/not merged/i);
  });

  /**
   * The wording is the product surface. "Change strategy" is what a user
   * expects to be reversible; "replaced, not merged" is what actually happens.
   */
  it('never describes it as merely a change of strategy', () => {
    expect(text).not.toMatch(/simply chang/i);
    expect(text).not.toMatch(/just chang/i);
  });

  it('names what is being replaced, not only that something is', () => {
    for (const inherited of ['context sources', 'signal rules', 'prose', 'timeframe']) {
      expect(text.toLowerCase()).toContain(inherited);
    }
  });

  it('says what survives, so the warning is not read as total loss', () => {
    expect(text).toMatch(/name, brain and money limits are not affected/i);
  });

  it('carries the revision the intent was formed against', () => {
    expect(planRebind(agent, target).expectedRevision).toBe(6);
  });
});

/** A5 — a confirmation issued for one pair cannot be used for another. */
describe('refuses_a_token_for_another_pair', () => {
  it('binds the target to both the agent and the destination strategy', () => {
    const t = rebindTarget(planRebind(agent, target));
    expect(t).toContain('a1');
    expect(t).toContain('s-new');
  });

  it('produces a different target for a different agent', () => {
    const other = rebindTarget(planRebind({ ...agent, id: 'a2' }, target));
    expect(other).not.toBe(rebindTarget(planRebind(agent, target)));
  });

  it('produces a different target for a different destination', () => {
    const elsewhere = rebindTarget(planRebind(agent, { id: 's-other', name: 'Other' }));
    expect(elsewhere).not.toBe(rebindTarget(planRebind(agent, target)));
  });

  it('is not merely the verb', () => {
    // A token identified as "rebind" would carry consent about one agent onto
    // any other. That is the failure the token design exists to prevent.
    expect(rebindTarget(planRebind(agent, target))).not.toBe('rebind');
  });
});

describe('rebinding to the strategy already bound', () => {
  it('is recognised as a no-op', () => {
    expect(isNoOp(planRebind(agent, { id: 's-old', name: 'Volatilis — imported' }), agent)).toBe(true);
  });

  it('is not confused with a real move', () => {
    expect(isNoOp(planRebind(agent, target), agent)).toBe(false);
  });
});
