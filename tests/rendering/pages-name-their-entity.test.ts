import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_PAUSE_REPORTED } from '../support/fakes.js';
import type { StrategyDetail } from '@/domain/strategy/strategy.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith, notConnected, RenderRadarPort } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * A page about one thing names which one — per branch, in what actually
 * renders.
 *
 * `app-access` has required this since the walk of 2026-07-29 found four
 * pages that broke it (`/agents/[id]/limits` read "Nothing will stop this
 * agent" naming no agent). Until now the property was held by hand-walking:
 * every static form of the check is vacuous or wrong — see
 * `naming-an-entity-is-held-by-the-walk-only`, which this closes.
 *
 * Each case renders a page component against the real use-cases wired over
 * fakes (`actingWith`) and asserts on the heading of the branch it forced.
 * Branches with no entity to name — "No such agent" — are asserted for what
 * they must say instead. The mock below replaces only the request seam
 * (`acting()` reads Next's cookies); everything below it is the production
 * path.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent(); // 'Volatilis', id a1, ACTIVE

function agentWorld(over: Parameters<typeof actingWith>[0] = {}) {
  const world = actingWith({ agents: new FakeAgentsPort([AGENT]), ...over });
  current = world;
  return world;
}

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);
const noSearch = Promise.resolve({});

/** One deployment slotting the fixture agent on HYPE. */
function hypeDeployment() {
  const radar = new RenderRadarPort();
  radar.result = {
    kind: 'deployments', pause: NO_PAUSE_REPORTED,
    deployments: [
      {
        policyId: 'p1',
        coinTicker: 'HYPE',
        revision: 3,
        timeframe: '15m',
        enabled: true,
        slotAgentIds: [AGENT.id],
        onDutyAgentId: AGENT.id,
        openPositionAgentId: null,
        resolution: null,
      },
    ],
  };
  return radar;
}

beforeEach(() => {
  current = actingWith();
});

describe('agent pages name their agent, branch by branch', () => {
  it('the detail page heads with the name', async () => {
    agentWorld();
    const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: AGENT.id }) }));
    expect(r.headings[0]).toContain(AGENT.displayName);
  });

  it('an unknown id says "No such agent" and offers the roster', async () => {
    agentWorld();
    const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: 'ghost' }) }));
    expect(r.headings[0]).toBe('No such agent');
    expect(r.text).toContain('Back to your agents');
  });

  it('the limits page names the agent — the branch that once said "this agent"', async () => {
    agentWorld();
    const Page = (await import('../../app/(app)/agents/[id]/limits/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: AGENT.id }) }));
    expect(r.headings.some((h) => h.includes(AGENT.displayName))).toBe(true);
  });

  it('archiving asks about this agent by name', async () => {
    agentWorld();
    const Page = (await import('../../app/(app)/agents/[id]/archive/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: AGENT.id }), searchParams: noSearch }));
    expect(r.headings[0]).toContain(AGENT.displayName);
  });

  it('reactivating asks about this agent by name', async () => {
    const archived = anAgent({ status: 'ARCHIVED' });
    current = actingWith({ agents: new FakeAgentsPort([archived]) });
    const Page = (await import('../../app/(app)/agents/[id]/reactivate/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: archived.id }), searchParams: noSearch }));
    expect(r.headings[0]).toContain(archived.displayName);
  });

  it('the deploy chooser names who is being deployed', async () => {
    agentWorld();
    const Page = (await import('../../app/(app)/agents/[id]/deploy/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: AGENT.id }), searchParams: noSearch }));
    expect(r.headings[0]).toContain(AGENT.displayName);
  });

  it('the deploy confirmation names the agent and the market', async () => {
    agentWorld({ radar: hypeDeployment() });
    const Page = (await import('../../app/(app)/agents/[id]/deploy/page.js')).default;
    const r = await rendered(
      await Page({
        params: params({ id: AGENT.id }),
        searchParams: Promise.resolve({ coin: 'HYPE', timeframe: '15m' }),
      }),
    );
    expect(r.headings[0]).toContain(AGENT.displayName);
    expect(r.headings[0]).toContain('HYPE');
  });

  it('undeploying names the agent and the market it stops scanning', async () => {
    agentWorld({ radar: hypeDeployment() });
    const Page = (await import('../../app/(app)/agents/[id]/undeploy/[coin]/page.js')).default;
    const r = await rendered(
      await Page({ params: params({ id: AGENT.id, coin: 'HYPE' }), searchParams: noSearch }),
    );
    expect(r.headings[0]).toContain(AGENT.displayName);
    expect(r.headings[0]).toContain('HYPE');
  });

  it('an undeploy that cannot happen says why, on the surface acted from', async () => {
    agentWorld(); // no deployments at all
    const Page = (await import('../../app/(app)/agents/[id]/undeploy/[coin]/page.js')).default;
    const r = await rendered(
      await Page({ params: params({ id: AGENT.id, coin: 'HYPE' }), searchParams: noSearch }),
    );
    expect(r.headings[0]).toBe('Cannot undeploy');
    expect(r.text).toContain('no deployment');
    expect(r.text).toContain('Back to the agent');
  });
});

describe('strategy pages name their strategy, branch by branch', () => {
  const MINE = aStrategy(); // 'Midway (fork)', PRIVATE, active

  function detailOf(summary = MINE): StrategyDetail {
    return {
      summary,
      sections: [],
      marketReadText: null,
      thresholds: { minAggregateScore: null, minRequiredCount: null, minAtrPct: null },
      tradeLevelPolicy: null,
      signalRules: [],
      conditions: [],
      openPositionCount: 0,
      cadence: null,
      regimeAutoDerive: false,
      regimeTimeframe: null,
    };
  }

  it('the detail page heads with the name', async () => {
    const strategies = new FakeStrategiesPort([MINE]);
    strategies.detail = detailOf();
    current = actingWith({ strategies });
    const Page = (await import('../../app/(app)/strategies/[id]/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: MINE.id }) }));
    expect(r.headings[0]).toContain(MINE.name);
  });

  it('a missing strategy says so and offers the list', async () => {
    current = actingWith({ strategies: new FakeStrategiesPort([]) });
    const Page = (await import('../../app/(app)/strategies/[id]/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: 'ghost' }) }));
    expect(r.headings[0]).toBe('No such strategy');
    expect(r.text).toContain('Back to strategies');
  });

  it('archiving asks about this strategy by name', async () => {
    current = actingWith({ strategies: new FakeStrategiesPort([MINE]) });
    const Page = (await import('../../app/(app)/strategies/[id]/archive/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: MINE.id }), searchParams: noSearch }));
    expect(r.headings[0]).toContain(MINE.name);
  });

  it('an archive that cannot happen still names the strategy', async () => {
    const inactive = aStrategy({ isActive: false });
    current = actingWith({ strategies: new FakeStrategiesPort([inactive]) });
    const Page = (await import('../../app/(app)/strategies/[id]/archive/page.js')).default;
    const r = await rendered(
      await Page({ params: params({ id: inactive.id }), searchParams: noSearch }),
    );
    expect(r.headings[0]).toContain(inactive.name);
  });

  it('restoring asks about this strategy by name', async () => {
    const archived = aStrategy({ isActive: false });
    current = actingWith({ strategies: new FakeStrategiesPort([archived]) });
    const Page = (await import('../../app/(app)/strategies/[id]/restore/page.js')).default;
    const r = await rendered(
      await Page({ params: params({ id: archived.id }), searchParams: noSearch }),
    );
    expect(r.headings[0]).toContain(archived.name);
  });

  it('a restore that cannot happen says why and returns to the strategy', async () => {
    current = actingWith({ strategies: new FakeStrategiesPort([MINE]) }); // active → not restorable
    const Page = (await import('../../app/(app)/strategies/[id]/restore/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: MINE.id }), searchParams: noSearch }));
    expect(r.headings[0]).toBe('Cannot restore');
    expect(r.text).toContain(MINE.name);
  });
});

describe('the gate every page shares', () => {
  it('an unauthenticated request is offered the path to connect, never a 500', async () => {
    current = { app: actingWith().app, user: notConnected };
    const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
    const r = await rendered(await Page({ params: params({ id: 'a1' }) }));
    expect(r.text).toContain('connect');
  });
});
