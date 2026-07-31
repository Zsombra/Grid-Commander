import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deploymentsFor } from '@/domain/agent/deployment.js';
import type { RadarDeployment } from '@/domain/agent/deployment.js';
import { deploymentsByAgent } from '@/domain/agent/deployment.js';
import { ReadDeploymentsQuery } from '@/application/use-cases/read-deployments.query.js';
import type { RadarPort, RadarReadResult } from '@/ports/radar.js';
import { mapDeployments } from '@/infrastructure/battlegrid/radar-adapter.js';

/**
 * Whether an agent is acting is stated where the agent is read.
 *
 * Established live 2026-07-31: an agent acts only where a radar deployment
 * points it at a coin. Two lifecycle-ACTIVE agents on the operator's account
 * held zero positions, absent from every slot, and nothing in this product
 * said so — the status line read ACTIVE either way. These tests pin the read
 * path (mapper → derivation → query) and the page's three distinct states.
 */

const who = { userId: 'owner', accessToken: 'tok' };

function deployment(over: Partial<RadarDeployment> = {}): RadarDeployment {
  return {
    policyId: 'p1',
    coinTicker: 'HYPE',
    revision: 3,
    timeframe: '15m',
    enabled: true,
    slotAgentIds: ['a1'],
    onDutyAgentId: 'a1',
    openPositionAgentId: null,
    ...over,
  };
}

class FakeRadarPort implements RadarPort {
  timeframes: readonly string[] = ['15m', '1h'];
  readonly upserts: Array<Record<string, unknown>> = [];
  readonly deletes: Array<Record<string, unknown>> = [];
  constructor(private readonly result: RadarReadResult) {}
  async listDeployments(): Promise<RadarReadResult> {
    return this.result;
  }
  async deploymentTimeframes(): Promise<readonly string[]> {
    return this.timeframes;
  }
  async upsertDeployment(params: Record<string, unknown>): Promise<{ revision: number }> {
    this.upserts.push(params);
    return { revision: 2 };
  }
  async deleteDeployment(params: Record<string, unknown>): Promise<{ deleted: boolean }> {
    this.deletes.push(params);
    return { deleted: true };
  }
}

describe('the mapper carries the observed shape and repairs nothing', () => {
  it('maps a live-shaped policy', () => {
    const [d] = mapDeployments([
      {
        policyId: 'p1',
        coinId: 'HYPE',
        coinTicker: 'HYPE',
        revision: 4,
        deploymentTimeframe: '15m',
        enabled: true,
        slots: [{ id: 's1', agentId: 'a1', agentDisplayName: 'VELOCITY' }],
        resolvesNow: { onDutyAgentId: 'a1', openPositionAgentId: null },
      },
    ]);
    expect(d).toEqual({
      policyId: 'p1',
      coinTicker: 'HYPE',
      revision: 4,
      timeframe: '15m',
      enabled: true,
      slotAgentIds: ['a1'],
      onDutyAgentId: 'a1',
      openPositionAgentId: null,
    });
  });

  it('refuses a policy without an id or coin — a dropped row would render its agent as idle', () => {
    expect(() => mapDeployments([{ coinTicker: 'HYPE' }])).toThrow(/policyId/);
    expect(() => mapDeployments([{ policyId: 'p2' }])).toThrow(/coinTicker/);
  });

  it('refuses a slot without its agent, and a payload that is not a list', () => {
    expect(() =>
      mapDeployments([{ policyId: 'p1', coinTicker: 'X', revision: 1, slots: [{ id: 's1' }] }]),
    ).toThrow(/agentId/);
    expect(() => mapDeployments(undefined)).toThrow(/policies/);
  });

  it('refuses a policy without its revision — a fabricated 0 would feed a blind write', () => {
    expect(() => mapDeployments([{ policyId: 'p1', coinTicker: 'X' }])).toThrow(/revision/);
  });

  it('resolvesNow is optional refinement and never fails the row', () => {
    const [d] = mapDeployments([{ policyId: 'p1', coinTicker: 'X', revision: 1 }]);
    expect(d?.onDutyAgentId).toBeNull();
    expect(d?.enabled).toBe(false);
  });
});

describe('the standing an agent holds in a deployment', () => {
  it('holding the position outranks being on duty', () => {
    const [mine] = deploymentsFor(
      [deployment({ onDutyAgentId: 'a1', openPositionAgentId: 'a1' })],
      'a1',
    );
    expect(mine?.standing).toBe('holding-position');
  });

  it('on duty when the radar resolves this agent as matched', () => {
    expect(deploymentsFor([deployment()], 'a1')[0]?.standing).toBe('on-duty');
  });

  it('in the rotation when slotted while another agent is on duty', () => {
    const d = deployment({ slotAgentIds: ['a1', 'a2'], onDutyAgentId: 'a2' });
    expect(deploymentsFor([d], 'a1')[0]?.standing).toBe('in-rotation');
  });

  it('a position holder is deployed even if it fell out of the slots', () => {
    // The radar can resolve a position to an agent a re-slotting removed.
    // Money is at stake there; membership must not hide it.
    const d = deployment({ slotAgentIds: ['a2'], onDutyAgentId: 'a2', openPositionAgentId: 'a1' });
    expect(deploymentsFor([d], 'a1')[0]?.standing).toBe('holding-position');
  });

  it('an agent in no deployment gets an empty list, not an invented row', () => {
    expect(deploymentsFor([deployment()], 'somebody-else')).toEqual([]);
  });
});

describe('the query answers with one of three distinct states', () => {
  it('deployed, with each market and standing', async () => {
    const q = new ReadDeploymentsQuery(
      new FakeRadarPort({
        kind: 'deployments',
        deployments: [deployment(), deployment({ policyId: 'p2', coinTicker: 'PURR', slotAgentIds: ['a1'], onDutyAgentId: 'a9' })],
      }),
    );
    const res = await q.execute({ ...who, agentId: 'a1' });
    expect(res.kind).toBe('deployed');
    if (res.kind !== 'deployed') return;
    expect(res.deployments.map((d) => `${d.coinTicker}:${d.standing}`)).toEqual([
      'HYPE:on-duty',
      'PURR:in-rotation',
    ]);
  });

  it('not-deployed when the radar answered and this agent is nowhere', async () => {
    const q = new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'deployments', deployments: [deployment()] }),
    );
    expect((await q.execute({ ...who, agentId: 'zz' })).kind).toBe('not-deployed');
  });

  it('unreadable is carried through, never collapsed into not-deployed', async () => {
    // The load-bearing distinction: a radar hiccup must not tell a deployed
    // agent's owner that it is idle.
    const q = new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'unreadable', reason: 'no usable answer', cause: 'unreachable' }),
    );
    const res = await q.execute({ ...who, agentId: 'a1' });
    expect(res.kind).toBe('unreadable');
  });
});

describe('the page renders the three states distinctly', () => {
  const page = readFileSync('app/(app)/agents/[id]/page.tsx', 'utf8');

  it('reads the result and branches on all three kinds', () => {
    expect(page).toMatch(/const radar = await app\.readDeployments\.execute/);
    expect(page).toMatch(/radar\.kind === 'deployed'/);
    expect(page).toMatch(/radar\.kind === 'not-deployed'/);
  });

  it('offers the deploy act where the agent is idle — it lives here now', () => {
    expect(page).toMatch(/not\s+scanning any market/);
    // The copy used to point at battlegrid.trade's Radar. Deploying is the
    // product's own act since `deploy-and-undeploy-are-offered`.
    expect(page).toMatch(/\/deploy/);
    expect(page).toMatch(/\/undeploy\//);
  });

  it('an unreadable radar admits it instead of claiming idle', () => {
    expect(page).toMatch(/could not be read/);
  });

  it('stays out of the domain', () => {
    expect(page, 'app/ may not import the domain').not.toMatch(/@\/domain\//);
  });
});

describe('the platform record backs the read', () => {
  const surface = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as {
    tools: Array<{
      name: string;
      classification: string;
      input_required: string[];
      declared_output: string[];
    }>;
  };
  const tool = surface.tools.find((t) => t.name === 'list_radar_deployments');

  it('list_radar_deployments is a read taking nothing, returning policies', () => {
    expect(tool?.classification).toBe('read');
    expect(tool?.input_required).toEqual([]);
    expect(tool?.declared_output).toContain('policies');
  });
});

describe('the roster asks for everyone at once', () => {
  it('deploymentsByAgent agrees with deploymentsFor, for every involved agent', () => {
    const ds = [
      deployment(),
      deployment({ policyId: 'p2', coinTicker: 'PURR', slotAgentIds: ['a2'], onDutyAgentId: 'a2', openPositionAgentId: 'a3' }),
    ];
    const byAgent = deploymentsByAgent(ds);
    expect(Object.keys(byAgent).sort()).toEqual(['a1', 'a2', 'a3']);
    for (const id of ['a1', 'a2', 'a3']) {
      expect(byAgent[id]).toEqual(deploymentsFor(ds, id));
    }
  });

  it('summary answers with the map, or carries unreadable through', async () => {
    const ok = await new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'deployments', deployments: [deployment()] }),
    ).summary(who);
    expect(ok.kind).toBe('summary');
    if (ok.kind === 'summary') expect(ok.byAgent['a1']?.[0]?.standing).toBe('on-duty');

    const bad = await new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'unreadable', reason: 'nope', cause: 'unreachable' }),
    ).summary(who);
    expect(bad.kind).toBe('unreadable');
  });
});

describe('the roster renders the deployment line honestly', () => {
  const component = readFileSync('src/presentation/components/agent-roster.tsx', 'utf8');
  const page = readFileSync('app/(app)/agents/page.tsx', 'utf8');

  it('the page fetches the summary and hands it to the roster', () => {
    expect(page).toMatch(/await app\.readDeployments\.summary/);
    expect(page).toMatch(/deployments=\{deployments\}/);
  });

  it('a row says acting or waiting, in the detail page\'s words', () => {
    expect(component).toMatch(/Scanning \$\{d\.coinTicker\}/);
    expect(component).toMatch(/Holding the position on/);
    expect(component).toMatch(/Not deployed — scanning no market/);
  });

  it('unreadable is one notice, and then no row claims either way', () => {
    expect(component).toMatch(/could not be read/);
    expect(component).toMatch(/deployments\.kind === 'summary' &&/);
  });
});
