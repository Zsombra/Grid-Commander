import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Agent } from '@/domain/agent/agent.js';
import type { RadarDeployment } from '@/domain/agent/deployment.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith, RenderRadarPort } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * What the two surfaces say an agent is doing, once lifecycle is joined to the
 * radar.
 *
 * The live shape of 2026-08-06, second account:
 *
 *     deployments: 15 with an ACTIVE agent, 1 with only archived agents
 *       SP500@15m  slots=Volatilis[ARCHIVED]
 *
 * `/agents/[id]` rendered *"On duty: scanning SP500 on the 15m radar."* for
 * that pair, and the roster row read "Scanning SP500 (15m)". The radar names
 * the slot identically whatever the agent's lifecycle, so both surfaces were
 * reading half the answer — and the other half of the same join, that SP500 is
 * a market nobody scans, was on no surface at all.
 *
 * Rendered rather than grepped: the sentence an operator reads is the whole
 * property, and this is the surface they use to decide whether their coverage
 * is intact.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);
const noSearch = Promise.resolve({});

const VOLATILIS = anAgent({ id: 'a1', displayName: 'Volatilis', status: 'ARCHIVED' });
const ACTIVE = anAgent({ id: 'a1', displayName: 'Volatilis', status: 'ACTIVE' });
const OTHER = anAgent({ id: 'a2', displayName: 'Contrarian', status: 'ACTIVE' });

function sp500(over: Partial<RadarDeployment> = {}): RadarDeployment {
  return {
    policyId: 'p1',
    coinTicker: 'SP500',
    revision: 4,
    timeframe: '15m',
    enabled: true,
    slotAgentIds: ['a1'],
    onDutyAgentId: 'a1',
    openPositionAgentId: null,
    ...over,
  };
}

function world(agents: readonly Agent[], deployments: readonly RadarDeployment[]) {
  const radar = new RenderRadarPort();
  radar.result = { kind: 'deployments', deployments };
  current = actingWith({ agents: new FakeAgentsPort([...agents]), radar });
}

async function agentPage(agent: Agent) {
  const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
  return rendered(await Page({ params: params({ id: agent.id }), searchParams: noSearch }));
}

async function roster() {
  const Page = (await import('../../app/(app)/agents/page.js')).default;
  return rendered(await Page());
}

beforeEach(() => {
  world([ACTIVE], []);
});

describe('an archived agent in a slot, on its own page', () => {
  it('is not described as on duty or scanning', async () => {
    world([VOLATILIS], [sp500()]);
    const r = await agentPage(VOLATILIS);
    expect(r.text).not.toContain('On duty');
    expect(r.text).not.toMatch(/scanning SP500/);
  });

  it('says it holds the slot and is not scanning it', async () => {
    world([VOLATILIS], [sp500()]);
    const r = await agentPage(VOLATILIS);
    expect(r.text).toContain('Holds the SP500 slot');
    expect(r.text).toContain('is not scanning it');
  });

  it('still offers the undeploy that would free the slot', async () => {
    // Holding a slot is a state an operator can act on, and archiving did not
    // remove the act.
    world([VOLATILIS], [sp500()]);
    const r = await agentPage(VOLATILIS);
    expect(r.links).toContain('/agents/a1/undeploy/SP500');
  });

  it('does not claim the agent is deployed nowhere', async () => {
    world([VOLATILIS], [sp500()]);
    const r = await agentPage(VOLATILIS);
    expect(r.text).not.toContain('Not deployed on the radar');
  });
});

describe('the market behind that slot', () => {
  it('is named as deployed and unscanned', async () => {
    world([VOLATILIS], [sp500()]);
    const r = await agentPage(VOLATILIS);
    expect(r.text).toContain('No active agent holds this deployment');
    // The resolver joins text nodes with spaces, so an interpolated ticker
    // arrives detached from the words either side of it.
    expect(r.text).toMatch(/SP500\s+is deployed and unscanned/);
  });

  it('says nothing of the kind while another agent in the same slots is active', async () => {
    world([VOLATILIS, OTHER], [sp500({ slotAgentIds: ['a1', 'a2'], onDutyAgentId: 'a2' })]);
    const r = await agentPage(VOLATILIS);
    expect(r.text).not.toContain('deployed and');
    expect(r.text).toContain('Holds the SP500 slot');
  });

  it('says nothing of the kind for a market its active agent is scanning', async () => {
    world([ACTIVE], [sp500()]);
    const r = await agentPage(ACTIVE);
    expect(r.text).toContain('On duty: scanning SP500 on the 15m radar.');
    expect(r.text).not.toContain('unscanned');
  });
});

describe('the same pair on the roster', () => {
  it('reads as holding the slot, not as scanning', async () => {
    world([VOLATILIS], [sp500()]);
    const r = await roster();
    expect(r.text).toContain('Holds the SP500 slot');
    expect(r.text).not.toContain('Scanning SP500');
  });

  it('names the unscanned market there too', async () => {
    // "15 deployments" on a roster reads as fifteen covered markets. One of
    // them was not.
    world([VOLATILIS], [sp500()]);
    const r = await roster();
    expect(r.text).toMatch(/No active agent holds the\s+SP500\s+deployment/);
    expect(r.text).toContain('deployed and unscanned');
  });

  it('leaves an active agent’s row exactly as it was', async () => {
    world([ACTIVE], [sp500()]);
    const r = await roster();
    expect(r.text).toContain('Scanning SP500');
    expect(r.text).not.toContain('unscanned');
  });

  it('an unreadable radar still claims nothing about any row', async () => {
    const radar = new RenderRadarPort();
    radar.result = { kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' };
    current = actingWith({ agents: new FakeAgentsPort([VOLATILIS]), radar });
    const r = await roster();
    expect(r.text).toContain('could not be read');
    expect(r.text).not.toContain('Holds the SP500 slot');
    expect(r.text).not.toContain('unscanned');
  });
});

describe('an archived agent the radar says is holding a position', () => {
  it('is still reported as holding it', async () => {
    /**
     * The one case lifecycle must not override. An archive is not evidence the
     * position closed, and this is the only line on the page that can still
     * cost the operator money.
     */
    world([VOLATILIS], [sp500({ openPositionAgentId: 'a1' })]);
    const r = await agentPage(VOLATILIS);
    expect(r.text).toContain('Holding the position on SP500');
  });
});

describe('the fleet spend line, where the fleet is', () => {
  /** The fleet world, with the agents port in hand so spend can be scripted. */
  function fleetWorld() {
    const agents = new FakeAgentsPort([ACTIVE]);
    const radar = new RenderRadarPort();
    radar.result = { kind: 'deployments', deployments: [] };
    current = actingWith({ agents, radar });
    return agents;
  }

  it('renders the platform’s own total beside the active count', async () => {
    // The fake mirrors the live read of 2026-08-11: $1.34 across 3 active.
    fleetWorld();
    const r = await roster();
    expect(r.text).toContain('$1.34 on model calls in the last 24 hours');
    expect(r.text).toContain('across 3 active agents');
    expect(r.text).toContain('BattleGrid’s own total');
  });

  it('says a missing figure is not a spend of zero', async () => {
    const agents = fleetWorld();
    agents.fleetSpend = { kind: 'spend', totalCost24hUsd: null, activeAgents: 3 };
    const r = await roster();
    expect(r.text).toContain('reported no figure');
    expect(r.text).toContain('not a spend of zero');
    expect(r.text).not.toContain('$0.00');
  });

  it('loses only the line when the hub will not answer', async () => {
    const agents = fleetWorld();
    agents.fleetSpend = { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    const r = await roster();
    expect(r.text).toContain('could not be read');
    expect(r.text).toContain('This does not mean');
    // The roster still stands.
    expect(r.headings[0]).toBe('Agents');
  });

  it('renders the line even when the roster itself cannot be read', async () => {
    const agents = fleetWorld();
    agents.rosterReadable = false;
    const r = await roster();
    // Both directions of independence: the one number the spend ruling runs
    // on does not vanish because the roster read failed.
    expect(r.text).toContain('$1.34 on model calls');
  });
});
