import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deploymentsFor, deploymentsNaming } from '@/domain/agent/deployment.js';
import type { AgentLifecycle, RadarDeployment } from '@/domain/agent/deployment.js';
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
 *
 * The converse arrived on 2026-08-06 from the second account: `SP500@15m`
 * holding one slot, and the agent in it — `Volatilis` — ARCHIVED. The radar
 * reports that slot exactly as it reports an active agent's, so the same
 * derivation that once said "ACTIVE hides idle" was saying "slotted means
 * scanning". Standing is now computed from the pair, and the tests below carry
 * both halves of it.
 */

const who = { userId: 'owner', accessToken: 'tok' };

const active = (id: string): AgentLifecycle => ({ id, status: 'ACTIVE' });
const archived = (id: string): AgentLifecycle => ({ id, status: 'ARCHIVED' });

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
  const roster = [active('a1'), active('a2'), active('a3')];

  it('holding the position outranks being on duty', () => {
    const [mine] = deploymentsFor(
      [deployment({ onDutyAgentId: 'a1', openPositionAgentId: 'a1' })],
      active('a1'),
      roster,
    );
    expect(mine?.standing).toBe('holding-position');
  });

  it('on duty when the radar resolves this agent as matched', () => {
    expect(deploymentsFor([deployment()], active('a1'), roster)[0]?.standing).toBe('on-duty');
  });

  it('in the rotation when slotted while another agent is on duty', () => {
    const d = deployment({ slotAgentIds: ['a1', 'a2'], onDutyAgentId: 'a2' });
    expect(deploymentsFor([d], active('a1'), roster)[0]?.standing).toBe('in-rotation');
  });

  it('a position holder is deployed even if it fell out of the slots', () => {
    // The radar can resolve a position to an agent a re-slotting removed.
    // Money is at stake there; membership must not hide it.
    const d = deployment({ slotAgentIds: ['a2'], onDutyAgentId: 'a2', openPositionAgentId: 'a1' });
    expect(deploymentsFor([d], active('a1'), roster)[0]?.standing).toBe('holding-position');
  });

  it('an agent in no deployment gets an empty list, not an invented row', () => {
    expect(deploymentsFor([deployment()], active('somebody-else'), roster)).toEqual([]);
  });
});

describe('lifecycle joins the radar, because the radar cannot see it', () => {
  it('an agent that is not ACTIVE holds its slot and is not on duty', () => {
    /**
     * The live shape of 2026-08-06: `SP500@15m slots=Volatilis[ARCHIVED]`,
     * with the radar naming it on duty exactly as it would an active agent.
     */
    const sp500 = deployment({ coinTicker: 'SP500', slotAgentIds: ['a1'], onDutyAgentId: 'a1' });
    const [mine] = deploymentsFor([sp500], archived('a1'), [archived('a1')]);
    expect(mine?.standing).toBe('slot-held-not-scanning');
  });

  it('an archived agent waiting in a rotation is not called in-rotation either', () => {
    // "In the rotation" says its turn is coming. It is not.
    const d = deployment({ slotAgentIds: ['a1', 'a2'], onDutyAgentId: 'a2' });
    const [mine] = deploymentsFor([d], archived('a1'), [archived('a1'), active('a2')]);
    expect(mine?.standing).toBe('slot-held-not-scanning');
  });

  it('a position the radar attributes to it survives the lifecycle', () => {
    /**
     * The one place lifecycle must not win. An archive is not evidence that a
     * position closed, and hiding it would drop the only thing on the row that
     * can still cost the operator money.
     */
    const d = deployment({ openPositionAgentId: 'a1', onDutyAgentId: 'a2', slotAgentIds: ['a2'] });
    const [mine] = deploymentsFor([d], archived('a1'), [archived('a1'), active('a2')]);
    expect(mine?.standing).toBe('holding-position');
  });

  it('an ACTIVE agent reads exactly as it did before the join', () => {
    expect(deploymentsFor([deployment()], active('a1'), [active('a1')])[0]?.standing).toBe(
      'on-duty',
    );
  });
});

describe('whether the market has anyone active at all', () => {
  it('says no active agent when every agent it names is archived', () => {
    const sp500 = deployment({ coinTicker: 'SP500', slotAgentIds: ['a1'], onDutyAgentId: 'a1' });
    expect(deploymentsFor([sp500], archived('a1'), [archived('a1')])[0]?.occupancy).toBe(
      'no-active-agent',
    );
  });

  it('claims nothing when one of the others is still active', () => {
    const d = deployment({ slotAgentIds: ['a1', 'a2'], onDutyAgentId: 'a2' });
    expect(deploymentsFor([d], archived('a1'), [archived('a1'), active('a2')])[0]?.occupancy).toBe(
      'active-agent-present',
    );
  });

  it('an active agent holding the position keeps the market from reading unscanned', () => {
    // Not a scanner, but "nobody active is here" is the strongest sentence on
    // this row and it must not be said over an agent with money on the market.
    const d = deployment({ slotAgentIds: ['a1'], onDutyAgentId: 'a1', openPositionAgentId: 'a2' });
    expect(deploymentsFor([d], archived('a1'), [archived('a1'), active('a2')])[0]?.occupancy).toBe(
      'active-agent-present',
    );
  });

  it('is unknown when a slot names an agent whose lifecycle was not read', () => {
    // The claim is about *every* agent in the policy. One unread lifecycle and
    // there is no honest negative to state.
    const d = deployment({ slotAgentIds: ['a1', 'ghost'], onDutyAgentId: 'a1' });
    expect(deploymentsFor([d], archived('a1'), [archived('a1')])[0]?.occupancy).toBe('unknown');
  });

  it('is unknown for every deployment when no lifecycles were read at all', () => {
    const d = deployment({ openPositionAgentId: 'a1' });
    expect(deploymentsFor([d], archived('a1'), [])[0]?.occupancy).toBe('unknown');
  });
});

describe('membership is asked for separately from standing', () => {
  it('names every deployment an agent is in, whatever it is doing there', () => {
    const held = deployment({ coinTicker: 'SP500', slotAgentIds: ['a1'], onDutyAgentId: 'a1' });
    const other = deployment({ policyId: 'p2', coinTicker: 'PURR', slotAgentIds: ['a2'], onDutyAgentId: 'a2' });
    expect(deploymentsNaming([held, other], 'a1').map((d) => d.coinTicker)).toEqual(['SP500']);
  });

  it('carries the policy itself, so callers that need a revision still have one', () => {
    // `describeUndeploy` reads it to decide whether there is anything to
    // remove, and an archived agent's slot is still removable.
    expect(deploymentsNaming([deployment()], 'a1')[0]?.revision).toBe(3);
    expect(deploymentsNaming([deployment()], 'nobody')).toEqual([]);
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
    const res = await q.execute({ ...who, agent: active('a1'), roster: [active('a1'), active('a9')] });
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
    expect(
      (await q.execute({ ...who, agent: active('zz'), roster: [active('a1')] })).kind,
    ).toBe('not-deployed');
  });

  it('an archived agent in a slot is deployed, not not-deployed', async () => {
    /**
     * It holds the slot, the operator can still undeploy it, and the market is
     * still occupied. Folding this into `not-deployed` would replace one false
     * sentence with another.
     */
    const q = new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'deployments', deployments: [deployment()] }),
    );
    const res = await q.execute({ ...who, agent: archived('a1'), roster: [archived('a1')] });
    expect(res.kind).toBe('deployed');
    if (res.kind !== 'deployed') return;
    expect(res.deployments[0]?.standing).toBe('slot-held-not-scanning');
    expect(res.deployments[0]?.occupancy).toBe('no-active-agent');
  });

  it('unreadable is carried through, never collapsed into not-deployed', async () => {
    // The load-bearing distinction: a radar hiccup must not tell a deployed
    // agent's owner that it is idle.
    const q = new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'unreadable', reason: 'no usable answer', cause: 'unreachable' }),
    );
    const res = await q.execute({ ...who, agent: active('a1'), roster: [active('a1')] });
    expect(res.kind).toBe('unreadable');
  });
});

describe('the page renders the three states distinctly', () => {
  const page = readFileSync('app/(app)/agents/[id]/page.tsx', 'utf8');

  it('reads the result and branches on all three kinds', () => {
    /**
     * Matches the *call*, not the assignment around it. This was pinned to
     * `const radar = await app.readDeployments.execute` and broke the day the
     * page started reading the radar and the stoppage summary together in one
     * `Promise.all` — a change that touched nothing this test protects.
     *
     * The three branch assertions below are the property. They survive any
     * shape of the read, which is what a source-text check should be tied to.
     */
    expect(page).toMatch(/app\.readDeployments\.execute/);
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

  it('sends the lifecycle to the read that needs it', () => {
    // `agentId` alone is the shape that produced "On duty: scanning SP500" for
    // an archived agent — the radar cannot answer the question without it.
    expect(page).toMatch(/agent,/);
    expect(page).toMatch(/roster: roster\.kind === 'agents' \? roster\.agents : \[\]/);
  });

  it('renders the fourth standing and the market behind it', () => {
    expect(page).toMatch(/slot-held-not-scanning/);
    expect(page).toMatch(/is not scanning it/);
    expect(page).toMatch(/deployed and\s*\n?\s*unscanned/);
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
  it('deploymentsByAgent agrees with deploymentsFor, for every agent it was given', () => {
    const ds = [
      deployment(),
      deployment({ policyId: 'p2', coinTicker: 'PURR', slotAgentIds: ['a2'], onDutyAgentId: 'a2', openPositionAgentId: 'a3' }),
    ];
    const roster = [active('a1'), archived('a2'), active('a3')];
    const byAgent = deploymentsByAgent(ds, roster);
    expect(Object.keys(byAgent).sort()).toEqual(['a1', 'a2', 'a3']);
    for (const agent of roster) {
      expect(byAgent[agent.id]).toEqual(deploymentsFor(ds, agent, roster));
    }
  });

  it('keys the map by the roster, not by whoever the radar names', () => {
    /**
     * An agent in a slot and absent from the roster has no lifecycle to judge
     * its standing against, and the roster looks this map up by the rows it is
     * about to render — which are exactly the agents passed in. Inventing an
     * entry for `ghost` would mean inventing a lifecycle for it.
     */
    const ds = [deployment({ slotAgentIds: ['a1', 'ghost'] })];
    expect(Object.keys(deploymentsByAgent(ds, [active('a1')]))).toEqual(['a1']);
  });

  it('an agent the radar names nowhere gets an empty list, not a missing key', () => {
    const byAgent = deploymentsByAgent([deployment()], [active('a1'), active('idle')]);
    expect(byAgent['idle']).toEqual([]);
  });

  it('summary answers with the map, or carries unreadable through', async () => {
    const ok = await new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'deployments', deployments: [deployment()] }),
    ).summary({ ...who, roster: [active('a1')] });
    expect(ok.kind).toBe('summary');
    if (ok.kind === 'summary') expect(ok.byAgent['a1']?.[0]?.standing).toBe('on-duty');

    const bad = await new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'unreadable', reason: 'nope', cause: 'unreachable' }),
    ).summary({ ...who, roster: [active('a1')] });
    expect(bad.kind).toBe('unreadable');
  });

  it('the same agent archived reads as holding its slot in the summary too', async () => {
    // The roster and the detail page must not disagree within one account.
    const summary = await new ReadDeploymentsQuery(
      new FakeRadarPort({ kind: 'deployments', deployments: [deployment()] }),
    ).summary({ ...who, roster: [archived('a1')] });
    expect(summary.kind === 'summary' && summary.byAgent['a1']?.[0]?.standing).toBe(
      'slot-held-not-scanning',
    );
  });
});

describe('the roster renders the deployment line honestly', () => {
  const component = readFileSync('src/presentation/components/agent-roster.tsx', 'utf8');
  const page = readFileSync('app/(app)/agents/page.tsx', 'utf8');

  it('the page fetches the summary and hands it to the roster', () => {
    expect(page).toMatch(/await app\.readDeployments\.summary/);
    expect(page).toMatch(/deployments=\{deployments\}/);
  });

  it('the page hands over the lifecycles the radar cannot see', () => {
    // Without the roster travelling with the request, every archived agent's
    // row reads as a scanning one again.
    expect(page).toMatch(/roster: roster\.kind === 'agents' \? roster\.agents : \[\]/);
  });

  it('a row says acting or waiting, in the detail page\'s words', () => {
    expect(component).toMatch(/Scanning \$\{d\.coinTicker\}/);
    expect(component).toMatch(/Holding the position on/);
    expect(component).toMatch(/Not deployed — scanning no market/);
  });

  it('a row that holds a slot without scanning says both halves', () => {
    expect(component).toMatch(/slot-held-not-scanning/);
    expect(component).toMatch(/is not scanning it/);
  });

  it('a market nobody active is deployed on is named as unscanned', () => {
    expect(component).toMatch(/no-active-agent/);
    expect(component).toMatch(/deployed and unscanned/);
  });

  it('unreadable is one notice, and then no row claims either way', () => {
    expect(component).toMatch(/could not be read/);
    expect(component).toMatch(/deployments\.kind === 'summary' &&/);
  });
});
