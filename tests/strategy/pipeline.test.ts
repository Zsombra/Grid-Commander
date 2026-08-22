import { describe, expect, it } from 'vitest';
import { ApplyPlanCommand, DescribeApplyQuery } from '@/application/use-cases/apply-plan.command.js';
import { CompilePlanCommand } from '@/application/use-cases/compile-plan.command.js';
import { FIELDS_APPLY_REJECTS } from '@/domain/strategy/compiled-plan.js';
import { anApprovedPlan, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { digestOf } from '@/domain/capability/digest.js';
import { asSubject } from '@/domain/connection/subject.js';

const USER = 'u1';
/**
 * `userId` is the product's local row id; `battlegridSubject` is BattleGrid's.
 *
 * The plan token's `userId` claim is BattleGrid's, so `USER` — which the token
 * fixture also uses — belongs in `battlegridSubject`. It used to be passed as
 * `userId`, which agreed by construction and hid that nothing ever supplies a
 * comparable value.
 */
const who = { userId: 'local-row-id', battlegridSubject: asSubject(USER), accessToken: 'at' };
const INTENT = { operation: 'UPDATE', strategyId: 's1', tagline: 'Changed' };

/** A token whose claims match the fixtures, valid at the fake clock's now. */
function planToken(overrides: Record<string, unknown> = {}): string {
  const claims = {
    userId: USER,
    strategyId: 's1',
    operation: 'UPDATE',
    expectedRevision: 1,
    proposedRevision: 2,
    expiresAtEpochMs: new Date('2026-07-27T12:05:00Z').getTime(),
    ...overrides,
  };
  return `bgsp1.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;
}

function harness(plan = anApprovedPlan(), token = planToken()) {
  const clock = new FakeClock();
  const port = new FakeStrategiesPort([aStrategy()]);
  port.compileResult = {
    kind: 'compiled',
    approvedPlan: plan,
    reviewContext: {
      confirmationSummary:
        "UPDATE strategy 'Midway (fork)' as revision 2; changed axes: IDENTITY; 0 bound agent(s) and 0 open position(s) observed.",
    },
    planToken: token,
  };
  const confirmations = new FakeConfirmationStore(clock);
  return {
    port,
    clock,
    confirmations,
    compile: new CompilePlanCommand(port),
    describe: new DescribeApplyQuery(confirmations, new SequentialRandom(), clock),
    apply: new ApplyPlanCommand(port),
  };
}

/** Compiling changes nothing and says so. */
describe('compiling is free of effect', () => {
  it('returns what would happen without changing anything', async () => {
    const h = harness();
    const before = h.port.strategies[0]?.revision;

    const result = await h.compile.execute({ ...who, request: INTENT });
    expect(result.kind).toBe('review');
    if (result.kind !== 'review') return;

    expect(result.review.viable).toBe(true);
    expect(result.review.changedAxes).toEqual(['IDENTITY']);
    expect(result.review.proposedRevision).toBe(2);
    // Nothing moved.
    expect(h.port.strategies[0]?.revision).toBe(before);
    expect(h.port.calls.map((c) => c.op)).toEqual(['compile']);
  });

  it('abandoning after compiling leaves nothing behind', async () => {
    const h = harness();
    await h.compile.execute({ ...who, request: INTENT });
    // The user closed the tab.
    expect(h.port.calls.some((c) => c.op === 'apply')).toBe(false);
    expect(h.port.strategies[0]?.revision).toBe(1);
  });

  it('shows the platform’s concerns without blocking on them', async () => {
    const result = await harness().compile.execute({ ...who, request: INTENT });
    if (result.kind !== 'review') throw new Error('expected a review');
    // Two facts at once: there ARE concerns, and the plan is still viable.
    expect(result.review.concerns).toHaveLength(1);
    expect(result.review.viable).toBe(true);
  });

  it('carries the blast radius from the platform', async () => {
    const h = harness(anApprovedPlan({ bindingImpact: { boundAgentCount: 5 } }));
    const result = await h.compile.execute({ ...who, request: INTENT });
    expect(result.kind === 'review' && result.review.boundAgentCount).toBe(5);
  });

  it('reports a compiler rejection rather than inventing a review', async () => {
    const h = harness();
    h.port.compileResult = {
      kind: 'rejected',
      reason: 'At least one updatable field is required',
      refusal: null,
    };
    const result = await h.compile.execute({ ...who, request: INTENT });
    expect(result.kind).toBe('rejected');
  });
});

/** What is applied is what was reviewed. */
describe('applying sends the projection, never the compiled result', () => {
  async function readyToApply(h = harness()) {
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');
    return { h, plan: compiled.review.plan };
  }

  it('sends a plan carrying none of the fields apply rejects', async () => {
    const { h, plan } = await readyToApply();
    await h.apply.execute({ ...who, strategyId: 's1', plan, confirmationToken: 'tok' });

    const sent = h.port.calls.find((c) => c.op === 'apply')?.payload ?? {};
    for (const field of FIELDS_APPLY_REJECTS) {
      expect(sent, `apply rejects "${field}"`).not.toHaveProperty(field);
    }
    expect(sent).toHaveProperty('strategyId', 's1');
    expect(sent).toHaveProperty('rules');
  });

  it('sends the compiler’s values, not recomputed ones', async () => {
    const { h, plan } = await readyToApply();
    await h.apply.execute({ ...who, strategyId: 's1', plan, confirmationToken: 'tok' });
    const sent = h.port.calls.find((c) => c.op === 'apply')?.payload ?? {};
    expect(sent['tagline']).toBe('Changed');
    expect(sent['expiresAt']).toBe('2026-07-28T01:08:50.257Z');
  });
});

/**
 * S-E. The plan is bound to the intent that produced it. Without this a user
 * compiles A, edits the form to B, and applies — and A lands, because the token
 * is bound to A's post-state. The server accepts it; it is a valid plan. It is
 * just not the one on screen.
 */
describe('a plan is bound to the intent that produced it', () => {
  it('proposes an apply while the intent is unchanged', async () => {
    const h = harness();
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');

    const result = await h.describe.execute({
      ...who,
      strategyId: 's1',
      plan: compiled.review.plan,
      currentIntent: INTENT,
    });
    expect(result.kind).toBe('proposal');
  });

  it('refuses once the intent has moved', async () => {
    const h = harness();
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');

    const result = await h.describe.execute({
      ...who,
      strategyId: 's1',
      plan: compiled.review.plan,
      currentIntent: { ...INTENT, tagline: 'Changed again' },
    });
    expect(result.kind).toBe('refused');
    expect(result.kind === 'refused' && result.reason).toMatch(/compile again/i);
  });

  it('is not fooled by key order', async () => {
    // A re-render that rebuilds the object must not discard a good plan.
    expect(digestOf({ a: 1, b: 2 })).toBe(digestOf({ b: 2, a: 1 }));
    expect(digestOf({ a: 1 })).not.toBe(digestOf({ a: 2 }));
  });
});

/** An unusable plan is refused before it is sent. */
describe('refusing locally, before anything is sent', () => {
  const propose = async (h: ReturnType<typeof harness>, currentRevision?: number) => {
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');
    return h.describe.execute({
      ...who,
      strategyId: 's1',
      plan: compiled.review.plan,
      currentIntent: INTENT,
      currentRevision,
    });
  };

  it('refuses an expired plan and issues no confirmation', async () => {
    const h = harness(anApprovedPlan(), planToken({ expiresAtEpochMs: 1 }));
    const result = await propose(h);
    expect(result.kind).toBe('refused');
    expect(result.kind === 'refused' && result.reason).toMatch(/expired/i);
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('refuses a plan compiled for someone else', async () => {
    const h = harness(anApprovedPlan(), planToken({ userId: 'someone-else' }));
    expect((await propose(h)).kind).toBe('refused');
  });

  it('refuses a plan whose strategy has moved on', async () => {
    const result = await propose(harness(), 7);
    expect(result.kind).toBe('refused');
    expect(result.kind === 'refused' && result.reason).toMatch(/revision/i);
  });

  it('refuses an unviable plan', async () => {
    const h = harness(anApprovedPlan({ viability: { viable: false } }));
    const result = await propose(h);
    expect(result.kind).toBe('refused');
    expect(result.kind === 'refused' && result.reason).toMatch(/not viable/i);
  });

  it('submits a plan it has no reason to refuse', async () => {
    expect((await propose(harness(), 1)).kind).toBe('proposal');
  });

  /**
   * S-B. The token parser can subtract confidence and never add it — so a token
   * it cannot read is submitted, and the server judges.
   */
  it('does not refuse on the strength of a token it could not read', async () => {
    const h = harness(anApprovedPlan(), 'not-a-recognisable-token');
    expect((await propose(h, 1)).kind).toBe('proposal');
  });
});

/** Applying requires confirmation naming the blast radius. */
describe('the confirmation carries the platform’s account and the blast radius', () => {
  it('uses the server’s summary verbatim', async () => {
    const h = harness();
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');
    const result = await h.describe.execute({
      ...who,
      strategyId: 's1',
      plan: compiled.review.plan,
      currentIntent: INTENT,
    });
    if (result.kind !== 'proposal') throw new Error('expected a proposal');

    expect(result.proposal.consequence).toContain("UPDATE strategy 'Midway (fork)' as revision 2");
    expect(result.proposal.consequence).toContain('changed axes: IDENTITY');
    // Stored as shown, so the audit can prove what was agreed to.
    expect(h.confirmations.tokens.get(result.proposal.confirmationToken)?.consequence).toBe(
      result.proposal.consequence,
    );
  });

  it('repeats the blast radius prominently rather than leaving it in a sentence', async () => {
    const h = harness(anApprovedPlan({ bindingImpact: { boundAgentCount: 5 } }));
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');
    const result = await h.describe.execute({
      ...who,
      strategyId: 's1',
      plan: compiled.review.plan,
      currentIntent: INTENT,
    });
    if (result.kind !== 'proposal') throw new Error('expected a proposal');
    expect(result.proposal.consequence).toMatch(/5 agents are bound/i);
    expect(result.proposal.consequence).toMatch(/reconfigured immediately/i);
    expect(result.proposal.boundAgentCount).toBe(5);
  });

  it('binds the confirmation to this plan, not merely to this strategy', async () => {
    const h = harness();
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');
    const result = await h.describe.execute({
      ...who,
      strategyId: 's1',
      plan: compiled.review.plan,
      currentIntent: INTENT,
    });
    if (result.kind !== 'proposal') throw new Error('expected a proposal');

    const stored = h.confirmations.tokens.get(result.proposal.confirmationToken);
    expect(stored?.target).toContain('strategy:s1');
    // Two plans for one strategy are two different acts.
    expect(stored?.target).toContain(compiled.review.plan.intentDigest);
  });

  it('refuses rather than composing its own description when the server gave none', async () => {
    const h = harness();
    h.port.compileResult = {
      kind: 'compiled',
      approvedPlan: anApprovedPlan(),
      reviewContext: {},
      planToken: planToken(),
    };
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');
    const result = await h.describe.execute({
      ...who,
      strategyId: 's1',
      plan: compiled.review.plan,
      currentIntent: INTENT,
    });
    expect(result.kind).toBe('refused');
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('withholding confirmation changes nothing', async () => {
    const h = harness();
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');
    await h.describe.execute({ ...who, strategyId: 's1', plan: compiled.review.plan, currentIntent: INTENT });
    // Proposing is not applying.
    expect(h.port.calls.some((c) => c.op === 'apply')).toBe(false);
    expect(h.port.strategies[0]?.revision).toBe(1);
  });
});

/**
 * The token the proposal issued is the token the apply can spend.
 *
 * **This was a fifth dead write path, and nothing had ever noticed.**
 * `DescribeApplyQuery` issued against `strategy:<id>#<intentDigest>`;
 * `McpStrategyAdapter.applyPlan` composed its own `strategy:<id>` and spent
 * against that. `consume` matches the target, so it never matched — and
 * `apply_strategy_plan`, the call that reconfigures every agent bound to a
 * strategy, was refused by the product before it reached BattleGrid.
 *
 * Every test passed the whole time, because `FakeStrategiesPort.applyPlan` does
 * not go through `enforce()`. The two ends were checked separately and never
 * against each other. This checks them against each other.
 */
describe('what was issued is what can be spent', () => {
  async function readyToApply(h = harness()) {
    const compiled = await h.compile.execute({ ...who, request: INTENT });
    if (compiled.kind !== 'review') throw new Error('expected a review');
    return { h, plan: compiled.review.plan };
  }

  it('spends the apply token against the target it was issued for', async () => {
    const { h, plan } = await readyToApply();

    const proposal = await h.describe.execute({
      ...who,
      strategyId: 's1',
      plan,
      currentIntent: INTENT,
    });
    if (proposal.kind !== 'proposal') throw new Error(`expected a proposal, got ${proposal.kind}`);

    await h.apply.execute({
      ...who,
      strategyId: 's1',
      plan,
      confirmationToken: proposal.proposal.confirmationToken,
    });

    const boundTo = h.port.calls.find((c) => c.op === 'apply')?.target;
    // The store's own matching, which is what `enforce()` calls in production.
    const spent = await h.confirmations.consume(
      proposal.proposal.confirmationToken,
      who.userId,
      'apply_strategy_plan',
      boundTo ?? '(the write bound nothing)',
    );

    expect(spent, 'a token no apply can spend means every apply is refused').not.toBeNull();
    // And it is the plan's target, not the strategy's: two plans for one strategy
    // are two acts, and one must not authorise the other.
    expect(boundTo).toMatch(/^strategy:s1#.+/);
  });

  it('does not let a token for one plan authorise another', async () => {
    const { h, plan } = await readyToApply();
    const proposal = await h.describe.execute({
      ...who,
      strategyId: 's1',
      plan,
      currentIntent: INTENT,
    });
    if (proposal.kind !== 'proposal') throw new Error('expected a proposal');

    const spent = await h.confirmations.consume(
      proposal.proposal.confirmationToken,
      who.userId,
      'apply_strategy_plan',
      // The bare strategy id — what the adapter used to compose. If this were
      // ever accepted again, the binding would be back to naming the strategy.
      'strategy:s1',
    );
    expect(spent, 'the strategy alone must not authorise a plan').toEqual({ kind: 'rejected', reason: 'mismatched' });
  });
});
