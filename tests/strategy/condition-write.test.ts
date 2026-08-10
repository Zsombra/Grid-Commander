import { describe, expect, it } from 'vitest';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import { ApplyPlanCommand, DescribeApplyQuery } from '@/application/use-cases/apply-plan.command.js';
import { CompilePlanCommand } from '@/application/use-cases/compile-plan.command.js';
import { DescribeConditionWriteQuery } from '@/application/use-cases/describe-condition-write.query.js';
import { listedKeys, resolveConditionEdit } from '@/domain/strategy/condition-write.js';
import { postStateDrift } from '@/domain/strategy/compiled-plan.js';
import { unresolvedReferences } from '@/domain/strategy/condition.js';
import { mapConditions } from '@/infrastructure/battlegrid/condition-mapper.js';
import type { StrategyCondition } from '@/domain/strategy/condition.js';
import { SequentialRandom } from '../support/agent-fakes.js';
import {
  aDetail,
  anApprovedPlan,
  aStrategy,
  berlinFullSendDown,
  berlinRegimeDown,
  FakeStrategiesPort,
} from '../support/strategy-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * Saving a condition — the write the try surface deliberately left out.
 *
 * What these hold, and each one is a property a later edit could quietly
 * remove:
 *
 * - the **whole list** is what is submitted and what is described, because the
 *   platform takes no smaller unit;
 * - the strategy's own conditions travel as the platform's own objects, never
 *   re-serialised out of the domain;
 * - a reference the resulting list cannot resolve is stated *before* agreement;
 * - the compiled post-state is read back, so an UPDATE that moved something
 *   this surface never offered to change is refused rather than described;
 * - the confirmation is the apply pipeline's own, bound to the compiler's
 *   digest, and a plan altered after the describe cannot spend it.
 */

const who = { userId: 'u1', battlegridSubject: null, accessToken: 'at' };

const BERLIN = [berlinFullSendDown(), berlinRegimeDown()];

/** A drafted condition the composer could have produced. */
function draft(over: Partial<StrategyCondition> = {}): StrategyCondition {
  return {
    conditionKey: 'FLOW_UP',
    name: 'Flow rising',
    verdict: 'UP',
    required: false,
    definition: {
      kind: 'compare',
      column: { sectionKey: 'includeRegimeContext', header: 'CVD_trend' },
      op: 'gt',
      value: 0,
    },
    ...over,
  };
}

/**
 * A world whose compiler answers with a post-state carrying exactly the list it
 * was given — the behaviour established live on 2026-08-06, made explicit here
 * so a test that stops honouring it fails rather than drifts.
 */
function world(over: { conditions?: readonly Record<string, unknown>[] } = {}) {
  const summary = aStrategy({ boundAgentCount: 3, revision: 5 });
  const strategies = new FakeStrategiesPort([summary]);
  const conditions = over.conditions ?? BERLIN;
  strategies.detail = { ...aDetail(summary), conditions: mapConditions(conditions) };
  strategies.conditionsAsGiven = conditions;
  strategies.compileResult = null;

  const clock = new FakeClock();
  const confirmations = new FakeConfirmationStore(clock);
  // The compiler echoes the submitted list into its post-state, and keeps the
  // tagline and sections it was never asked about.
  strategies.compilePlan = async (params: {
    request: Readonly<Record<string, unknown>>;
  }) => {
    strategies.calls.push({ op: 'compile', payload: params.request });
    const submitted = (params.request['conditions'] ?? []) as Record<string, unknown>[];
    return {
      kind: 'compiled',
      approvedPlan: anApprovedPlan({
        postState: {
          ...(anApprovedPlan()['postState'] as Record<string, unknown>),
          tagline: summary.tagline,
          sections: [],
          conditions: submitted,
        },
        bindingImpact: { boundAgentCount: 3 },
      }),
      reviewContext: { confirmationSummary: 'BattleGrid: UPDATE Midway (fork) r5 → r6.' },
      planToken: 'tok-plan',
    };
  };

  const describe = new DescribeConditionWriteQuery(
    strategies,
    new CompilePlanCommand(strategies),
    new DescribeApplyQuery(confirmations, new SequentialRandom(), clock),
  );
  return { summary, strategies, confirmations, describe };
}

const compiled = (strategies: FakeStrategiesPort): Record<string, unknown> =>
  (strategies.calls.find((c) => c.op === 'compile')?.payload ?? {}) as Record<string, unknown>;

describe('the list an edit produces', () => {
  const existing = mapConditions(BERLIN);

  it('adds a draft whose key the strategy does not define, and keeps the rest as given', () => {
    const result = resolveConditionEdit(existing, BERLIN, { kind: 'upsert', condition: draft() });
    if (result.kind !== 'change') throw new Error(result.kind);
    expect(result.change.standing).toBe('added');
    expect(listedKeys(result.change.conditions)).toEqual([
      'FULL_SEND_DOWN',
      'REGIME_DOWN',
      'FLOW_UP',
    ]);
    // The platform's own objects, untouched — never rebuilt out of the domain,
    // which would drop whatever the mapper read as unrecognised.
    expect(result.change.conditions[0]).toBe(BERLIN[0]);
  });

  it('stands a matching draft in the existing condition’s place, at its position', () => {
    const result = resolveConditionEdit(existing, BERLIN, {
      kind: 'upsert',
      condition: draft({ conditionKey: 'REGIME_DOWN', name: 'Redrafted' }),
    });
    if (result.kind !== 'change') throw new Error(result.kind);
    expect(result.change.standing).toBe('replaced');
    expect(listedKeys(result.change.conditions)).toEqual(['FULL_SEND_DOWN', 'REGIME_DOWN']);
    expect(result.change.resulting[1]?.name).toBe('Redrafted');
  });

  it('removes one, and says which references it leaves with nothing to resolve', () => {
    const result = resolveConditionEdit(existing, BERLIN, {
      kind: 'remove',
      conditionKey: 'REGIME_DOWN',
    });
    if (result.kind !== 'change') throw new Error(result.kind);
    expect(result.change.standing).toBe('removed');
    expect(listedKeys(result.change.conditions)).toEqual(['FULL_SEND_DOWN']);
    // Berlin's FULL_SEND_DOWN refers to REGIME_DOWN. Removing the target leaves
    // a rule nobody can evaluate, and that is the consequence a diff of the
    // condition being changed cannot show.
    expect(result.change.dangling).toContain('REGIME_DOWN');
  });

  it('does not blame the edit for a reference the strategy already could not resolve', () => {
    // Berlin's `FULL_SEND_DOWN` refers to FLOW_UP and WINDOW_OPEN, neither of
    // which this pair defines. Adding a condition changes nothing about that,
    // and listing them under "after this" would attribute to the edit a state
    // the strategy arrived in — in the one place someone is deciding whether to
    // proceed.
    const result = resolveConditionEdit(existing, BERLIN, { kind: 'upsert', condition: draft() });
    if (result.kind !== 'change') throw new Error(result.kind);
    expect(result.change.dangling).toEqual([]);
    // And the strategy's own reading surface still reports them: the set is
    // subtracted here, not hidden.
    expect(unresolvedReferences(existing)).toContain('WINDOW_OPEN');
  });

  it('refuses a removal naming a key the strategy does not define', () => {
    const result = resolveConditionEdit(existing, BERLIN, {
      kind: 'remove',
      conditionKey: 'NOT_THERE',
    });
    expect(result.kind).toBe('no-such-condition');
  });

  it('refuses a draft carrying a form this product will not write back', () => {
    const result = resolveConditionEdit(existing, BERLIN, {
      kind: 'upsert',
      condition: draft({ definition: { kind: 'unrecognised', reason: 'a XOR group' } }),
    });
    if (result.kind !== 'inexpressible') throw new Error(result.kind);
    expect(result.reasons).toEqual(['a XOR group']);
  });

  it('leaves an empty list when the only condition is removed', () => {
    const one = [berlinRegimeDown()];
    const result = resolveConditionEdit(mapConditions(one), one, {
      kind: 'remove',
      conditionKey: 'REGIME_DOWN',
    });
    if (result.kind !== 'change') throw new Error(result.kind);
    // `[]` is the composed intent of "define none". Omitting the key would be
    // the opposite request — the one that preserves them.
    expect(result.change.conditions).toEqual([]);
  });
});

describe('the compiled post-state is read back before anyone agrees', () => {
  const expected = {
    conditionKeys: ['FULL_SEND_DOWN', 'REGIME_DOWN'],
    tagline: 'Intel-driven precision strike',
    sectionKeys: ['includeRsi'],
  };
  const planWith = (post: Record<string, unknown>): Record<string, unknown> =>
    anApprovedPlan({
      postState: {
        ...(anApprovedPlan()['postState'] as Record<string, unknown>),
        tagline: expected.tagline,
        sections: [{ kind: 'platform', sectionKey: 'includeRsi' }],
        conditions: [{ conditionKey: 'FULL_SEND_DOWN' }, { conditionKey: 'REGIME_DOWN' }],
        ...post,
      },
    });

  it('finds nothing to report when the compiler took exactly what it was given', () => {
    expect(postStateDrift(planWith({}), expected)).toEqual([]);
  });

  it('reports a condition list the compiler did not take whole', () => {
    // The failure this whole check exists for: an UPDATE that names conditions
    // and comes back with the stored ones. Nothing was written — a compile
    // writes nothing — so this is the cheapest possible place to find out.
    const drift = postStateDrift(planWith({ conditions: [{ conditionKey: 'FULL_SEND_DOWN' }] }), expected);
    expect(drift.join('\n')).toContain('FULL_SEND_DOWN, REGIME_DOWN');
    expect(drift.join('\n')).toContain('would save FULL_SEND_DOWN');
  });

  it('reports a condition list the plan does not carry at all', () => {
    const drift = postStateDrift(planWith({ conditions: null }), expected);
    expect(drift.join('\n')).toContain('no condition list at all');
  });

  it('reports a tagline the request never mentioned moving', () => {
    const drift = postStateDrift(planWith({ tagline: 'something else' }), expected);
    expect(drift.join('\n')).toContain('"something else"');
  });

  it('reports sections the request never mentioned moving', () => {
    const drift = postStateDrift(planWith({ sections: [] }), expected);
    expect(drift.join('\n')).toContain('report sections would become none');
  });

  it('reads empty and absent as one tagline, so an honest write is not refused', () => {
    // The read spells "no tagline" as null and the plan may spell it as "".
    // A check that told them apart would refuse every write on a strategy
    // without one.
    const drift = postStateDrift(planWith({ tagline: '' }), { ...expected, tagline: null });
    expect(drift).toEqual([]);
  });

  it('accepts a section order the compiler chose', () => {
    // Membership is the claim; order inside `sections` is the platform's.
    const drift = postStateDrift(
      planWith({
        sections: [
          { kind: 'platform', sectionKey: 'includeMacd' },
          { kind: 'platform', sectionKey: 'includeRsi' },
        ],
      }),
      { ...expected, sectionKeys: ['includeRsi', 'includeMacd'] },
    );
    expect(drift).toEqual([]);
  });
});

describe('describing a condition write', () => {
  it('compiles the whole list, not the condition being changed', async () => {
    const { describe, strategies } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'compose', condition: draft() },
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);

    const request = compiled(strategies);
    expect(request['operation']).toBe('UPDATE');
    expect(request['expectedRevision']).toBe(5);
    expect((request['conditions'] as unknown[]).length).toBe(3);
    // The two axes this write never offers to change are absent from the
    // request, which is what makes "the compiler fills them from the stored
    // strategy" the behaviour being relied on — and it is checked, not assumed.
    expect('tagline' in request).toBe(false);
    expect('sections' in request).toBe(false);
  });

  it('states what the whole list would become, and how many agents it reaches', async () => {
    const { describe } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'compose', condition: draft() },
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);
    expect(result.proposal.listKeys).toEqual(['FULL_SEND_DOWN', 'REGIME_DOWN', 'FLOW_UP']);
    expect(result.proposal.consequence).toContain('FULL_SEND_DOWN, REGIME_DOWN, FLOW_UP');
    expect(result.proposal.consequence).toContain('takes the condition list whole');
    // The platform's own summary, kept — ours is appended, never substituted.
    expect(result.proposal.consequence).toContain('BattleGrid: UPDATE');
    expect(result.proposal.consequence).toContain('3 agents are bound');
    expect(result.proposal.boundAgentCount).toBe(3);
  });

  it('names the references a removal would leave dangling, in the stored text', async () => {
    const { describe, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'remove', conditionKey: 'REGIME_DOWN' },
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);
    expect(result.proposal.dangling).toEqual(['REGIME_DOWN']);
    // Stored with the token, not merely rendered: a warning the audit cannot
    // prove was shown is one nobody can be held to.
    const token = confirmations.tokens.get(result.proposal.confirmationToken);
    expect(token?.consequence).toContain('REGIME_DOWN');
    expect(token?.consequence).toContain('rule nobody can evaluate');
  });

  it('binds the confirmation to the plan the compiler produced', async () => {
    const { describe, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'compose', condition: draft() },
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);
    const token = confirmations.tokens.get(result.proposal.confirmationToken);
    expect(token?.tool).toBe('apply_strategy_plan');
    expect(token?.target).toBe(
      confirmationTarget.strategyPlan('s1', result.proposal.plan.intentDigest),
    );
  });

  it('refuses without minting when the compiler’s post-state moved something else', async () => {
    const { describe, strategies, confirmations } = world();
    strategies.compilePlan = async () => ({
      kind: 'compiled',
      // The list submitted is ignored and the stored one comes back — the
      // failure the 2026-08-06 finding rules out today and this check catches
      // if the platform ever changes its mind.
      approvedPlan: anApprovedPlan({
        postState: {
          ...(anApprovedPlan()['postState'] as Record<string, unknown>),
          tagline: 'Intel-driven precision strike',
          conditions: BERLIN,
        },
      }),
      reviewContext: { confirmationSummary: 'BattleGrid: UPDATE' },
      planToken: 'tok-plan',
    });
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'compose', condition: draft() },
    });
    if (result.kind !== 'drift') throw new Error(result.kind);
    expect(result.reasons.join('\n')).toContain('FLOW_UP');
    expect(confirmations.tokens.size).toBe(0);
  });

  it('refuses without minting when the draft cannot be expressed', async () => {
    const { describe, strategies, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: {
        kind: 'compose',
        condition: draft({ definition: { kind: 'unrecognised', reason: 'a XOR group' } }),
      },
    });
    if (result.kind !== 'inexpressible') throw new Error(result.kind);
    expect(result.reasons).toEqual(['a XOR group']);
    // Nothing reached the platform: an unmodelled form is refused before a
    // compile, not after one.
    expect(strategies.calls.some((c) => c.op === 'compile')).toBe(false);
    expect(confirmations.tokens.size).toBe(0);
  });

  it('carries the platform’s refusal in its own words, and mints nothing', async () => {
    const { describe, strategies, confirmations } = world();
    strategies.compilePlan = async () => ({
      kind: 'rejected',
      reason: 'CONDITION_COLUMN_UNKNOWN: no column "CVD_trend" in this report',
    });
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'compose', condition: draft() },
    });
    if (result.kind !== 'refused') throw new Error(result.kind);
    expect(result.reason).toContain('CONDITION_COLUMN_UNKNOWN');
    expect(confirmations.tokens.size).toBe(0);
  });

  it('seeds a draft from a condition the strategy carries, at its own depth', async () => {
    const { describe, strategies } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: {
        kind: 'from-existing',
        sourceKey: 'FULL_SEND_DOWN',
        conditionKey: 'FULL_SEND_UP',
        name: 'Full send — up',
        verdict: 'UP',
      },
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);
    expect(result.proposal.listKeys).toEqual([
      'FULL_SEND_DOWN',
      'REGIME_DOWN',
      'FULL_SEND_UP',
    ]);
    const sent = compiled(strategies)['conditions'] as Record<string, unknown>[];
    // The definition whole — the only way to author a condition nested deeper
    // than the composer builds.
    expect(sent[2]?.['definition']).toEqual(berlinFullSendDown()['definition']);
  });

  it('says a seeded source is gone rather than opening a blank change', async () => {
    const { describe, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: {
        kind: 'from-existing',
        sourceKey: 'GONE',
        conditionKey: null,
        name: null,
        verdict: null,
      },
    });
    if (result.kind !== 'no-such-condition') throw new Error(result.kind);
    expect(result.conditionKey).toBe('GONE');
    expect(confirmations.tokens.size).toBe(0);
  });

  it('compiles nothing at all when no edit is asked for', async () => {
    const { describe, strategies } = world();
    const result = await describe.execute({ ...who, strategyId: 's1', edit: null });
    if (result.kind !== 'listing') throw new Error(result.kind);
    expect(result.existing.map((c) => c.conditionKey)).toEqual([
      'FULL_SEND_DOWN',
      'REGIME_DOWN',
    ]);
    expect(strategies.calls.some((c) => c.op === 'compile')).toBe(false);
  });

  it('passes a failed read through as unreadable, with its cause', async () => {
    const { describe, strategies } = world();
    strategies.detailReadable = false;
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'compose', condition: draft() },
    });
    if (result.kind !== 'unreadable') throw new Error(result.kind);
    expect(result.cause).toBe('unreachable');
  });
});

describe('what is applied is what was agreed to', () => {
  it('spends the token the describe minted, against the same target', async () => {
    const { describe, strategies, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'compose', condition: draft() },
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);

    await new ApplyPlanCommand(strategies).execute({
      ...who,
      strategyId: 's1',
      plan: result.proposal.plan,
      confirmationToken: result.proposal.confirmationToken,
    });

    const apply = strategies.calls.find((c) => c.op === 'apply');
    // `FakeStrategiesPort` records the target and does not enforce it — the
    // guard lives in the adapter — so the agreement is driven through the
    // store's own consume, the way `edit-binding.test.ts` does.
    expect(apply?.target).toBe(
      confirmationTarget.strategyPlan('s1', result.proposal.plan.intentDigest),
    );
    const spent = await confirmations.consume(
      result.proposal.confirmationToken,
      who.userId,
      'apply_strategy_plan',
      apply?.target ?? '',
    );
    expect(spent, 'the target the write composed must be the one that was agreed to').not.toBeNull();
    // And the projected plan carries the list, because `apply_strategy_plan`
    // requires it — the sixth dead write path was its absence.
    expect((apply?.payload?.['conditions'] as unknown[]).length).toBe(3);
  });

  it('cannot be spent by a plan altered after the describe', async () => {
    const { describe, confirmations } = world();
    const result = await describe.execute({
      ...who,
      strategyId: 's1',
      edit: { kind: 'compose', condition: draft() },
    });
    if (result.kind !== 'proposal') throw new Error(result.kind);
    const tampered = confirmationTarget.strategyPlan('s1', 'a-different-digest');
    const spent = await confirmations.consume(
      result.proposal.confirmationToken,
      who.userId,
      'apply_strategy_plan',
      tampered,
    );
    expect(spent, 'a plan whose digest moved must not spend the agreement').toBeNull();
  });
});
