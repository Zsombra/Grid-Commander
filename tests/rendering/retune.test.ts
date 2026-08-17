import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrategyDetail } from '@/domain/strategy/strategy.js';
import { aDetail, aSignalDefinition, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The retune surface, branch by branch: the tuning form prefilled from the
 * rule, the consequence with the blast radius, the refusals — and the
 * branch the ceremony exists for: no confirm button without a describe.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function retuneRendered(id: string, signalId: string, search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/strategies/[id]/rules/[signalId]/page.js')).default;
  return rendered(
    await Page({ params: params({ id, signalId }), searchParams: Promise.resolve(search) }),
  );
}

const RULE = { signalId: 'rsi_oversold', allocation: 1, required: false, params: { threshold: 30 } };

function ruleWorld(over: Partial<StrategyDetail> = {}) {
  const summary = aStrategy({ boundAgentCount: 3, revision: 5 });
  const strategies = new FakeStrategiesPort([summary]);
  strategies.detail = { ...aDetail(summary), signalRules: [RULE], ...over };
  strategies.stageSignal(aSignalDefinition());
  current = actingWith({ strategies });
  return strategies;
}

beforeEach(() => {
  current = actingWith();
});

describe('the retune page, branch by branch', () => {
  it('the form names the rule, prefills its values, and links the signal card', async () => {
    ruleWorld();
    const r = await retuneRendered('s1', 'rsi_oversold');
    expect(r.headings[0]).toContain('rsi_oversold');
    expect(r.headings[0]).toContain('Midway (fork)');
    expect(r.text).toContain('Currently allocation');
    expect(r.text).toContain('not required');
    expect(r.text).toContain('threshold');
    expect(r.text).toContain('What this signal does');
    expect(r.text).toContain('Back to the strategy');
  });

  it('a signal the strategy does not weigh gets no form at all', async () => {
    ruleWorld();
    const r = await retuneRendered('s1', 'macd_bull_cross');
    expect(r.headings[0]).toBe("Not one of this strategy's rules");
    expect(r.text).toContain('does not weigh');
  });

  it('the describe branch shows the consequence and the confirm form', async () => {
    ruleWorld();
    const r = await retuneRendered('s1', 'rsi_oversold', {
      a: '3',
      req: '1',
      p_threshold: '25',
    });
    expect(r.headings[0]).toContain('Retune rsi_oversold');
    expect(r.text).toContain('All 3 agents');
    expect(r.text).toContain('open positions do not block');
    expect(r.text).toContain('threshold=25');
    expect(r.text).toContain('Leave things as they are');
  });

  it('a no-op is refused with the reason, not confirmed', async () => {
    ruleWorld();
    const r = await retuneRendered('s1', 'rsi_oversold', {
      a: '1',
      p_threshold: '30',
    });
    expect(r.headings[0]).toBe('Cannot retune');
    expect(r.text).toContain('Nothing would change');
  });

  it('a non-numeric parameter never reaches the describe', async () => {
    const strategies = ruleWorld();
    const r = await retuneRendered('s1', 'rsi_oversold', { a: '3', p_threshold: 'much' });
    expect(r.headings[0]).toBe('Those parameters do not read as numbers');
    expect(strategies.calls.some((c) => c.op === 'update-rule')).toBe(false);
  });

  it('a problem from the perform lands on the surface acted from', async () => {
    ruleWorld();
    const r = await retuneRendered('s1', 'rsi_oversold', {
      a: '3',
      p_threshold: '25',
      problem: 'CONFLICT: expected revision 5, actual 6',
    });
    expect(r.text).toContain('CONFLICT: expected revision 5, actual 6');
  });

  it('a missing strategy says so', async () => {
    current = actingWith({ strategies: new FakeStrategiesPort([]) });
    const r = await retuneRendered('ghost', 'rsi_oversold');
    expect(r.headings[0]).toBe('No such strategy');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await retuneRendered('s1', 'rsi_oversold');
    expect(r.text).toContain('connect');
  });
});

/**
 * A value the page was handed is checked before it is sent.
 *
 * `?a=banana` used to reach `describeRetune` as `NaN` and rely on BattleGrid to
 * refuse it. The platform refusing is a true answer to the wrong question: it
 * says the request was malformed, where this page already knew which value was.
 */
describe('the allocation is checked before anything is described', () => {
  it('names the value it could not read, and describes nothing', async () => {
    ruleWorld();
    // p_threshold supplied so the params check passes and the allocation is
    // what is actually under test.
    const r = await retuneRendered('s1', 'rsi_oversold', { a: 'banana', p_threshold: '30' });
    expect(r.text).toContain('does not read as a number');
    expect(r.text).toContain('banana');
    expect(r.text).toContain('nothing was sent to BattleGrid');
  });

  it('offers a way back that keeps the rest of the composition', async () => {
    ruleWorld();
    const r = await retuneRendered('s1', 'rsi_oversold', {
      a: 'banana',
      req: '1',
      p_threshold: '25',
    });
    const back = r.links.find((l) => l.includes('edit=1'));
    expect(back).toBeDefined();
    // What they chose survives...
    expect(back).toContain('req=1');
    expect(back).toContain('p_threshold=25');
    // ...except the value that could not be read, which would re-fill the
    // field with the thing to fix.
    expect(back).not.toContain('a=banana');
  });

  it('still describes a whole number', async () => {
    ruleWorld();
    const r = await retuneRendered('s1', 'rsi_oversold', { a: '2', p_threshold: '30' });
    expect(r.text).not.toContain('does not read as a number');
  });

  it('re-opens the composer holding what was composed', async () => {
    ruleWorld();
    // edit=1 says "show the form", so carrying values back does not re-run
    // the describe that just refused.
    const r = await retuneRendered('s1', 'rsi_oversold', {
      edit: '1',
      a: '3',
      p_threshold: '25',
    });
    expect(r.text).toContain('Retune');
    expect(r.text).not.toContain('does not read as a number');
  });
});
