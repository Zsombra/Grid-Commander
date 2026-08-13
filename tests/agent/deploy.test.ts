import { describe, expect, it } from 'vitest';
import {
  DescribeDeployQuery,
  DescribeUndeployQuery,
  PerformDeployCommand,
  PerformUndeployCommand,
} from '@/application/use-cases/deploy-agent.command.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import type { RadarDeployment } from '@/domain/agent/deployment.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import type { RadarPort, RadarReadResult } from '@/ports/radar.js';
import { SequentialRandom } from '../support/agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * Deploying and undeploying through the product's own commands.
 *
 * The properties pinned here are the ones the change exists for: the token
 * binds the agent+coin pair and the verb, the describe reads the radar fresh
 * and names who an occupied coin's replacement removes, the timeframe list is
 * the platform's declaration rather than a memory, and every refusal reaches
 * the caller as a stated reason instead of a silent no-op.
 */

const who = { userId: 'u1', accessToken: 'at' };

function deployment(over: Partial<RadarDeployment> = {}): RadarDeployment {
  return {
    policyId: 'p1',
    coinTicker: 'HYPE',
    revision: 7,
    timeframe: '15m',
    enabled: true,
    slotAgentIds: ['a-old'],
    onDutyAgentId: 'a-old',
    openPositionAgentId: null,
    resolution: null,
    ...over,
  };
}

class FakeRadarPort implements RadarPort {
  timeframes: readonly string[] = ['15m', '1h', '4h'];
  result: RadarReadResult = { kind: 'deployments', deployments: [] };
  readonly upserts: Array<{
    coinId: string;
    timeframe: string;
    enabled: boolean;
    agentId: string;
    expectedRevision: number | null;
    confirmation: Confirmation;
  }> = [];
  readonly deletes: Array<{
    coinId: string;
    expectedRevision: number;
    confirmation: Confirmation;
  }> = [];
  failWith: Error | null = null;
  deleteReturns = true;

  async listDeployments(): Promise<RadarReadResult> {
    return this.result;
  }
  async deploymentTimeframes(): Promise<readonly string[]> {
    return this.timeframes;
  }
  async upsertDeployment(params: {
    userId: string;
    accessToken: string;
    coinId: string;
    timeframe: string;
    enabled: boolean;
    agentId: string;
    expectedRevision: number | null;
    confirmation: Confirmation;
  }): Promise<{ revision: number }> {
    if (this.failWith) throw this.failWith;
    this.upserts.push(params);
    return { revision: (params.expectedRevision ?? 0) + 1 };
  }
  async deleteDeployment(params: {
    userId: string;
    accessToken: string;
    coinId: string;
    expectedRevision: number;
    confirmation: Confirmation;
  }): Promise<{ deleted: boolean }> {
    if (this.failWith) throw this.failWith;
    this.deletes.push(params);
    return { deleted: this.deleteReturns };
  }
}

function harness(radar = new FakeRadarPort()) {
  const clock = new FakeClock();
  const confirmations = new FakeConfirmationStore(clock);
  return {
    radar,
    confirmations,
    clock,
    describeDeploy: new DescribeDeployQuery(radar, confirmations, new SequentialRandom(), clock),
    performDeploy: new PerformDeployCommand(radar),
    describeUndeploy: new DescribeUndeployQuery(radar, confirmations, new SequentialRandom(), clock),
    performUndeploy: new PerformUndeployCommand(radar),
  };
}

const deployReq = {
  ...who,
  agentId: 'a1',
  agentName: 'Fade Master I',
  coinId: 'HYPE',
  timeframe: '15m',
};

describe('the target binds the pair and the verb', () => {
  it('deploy and undeploy of the same pair are different targets', () => {
    expect(confirmationTarget.agentDeploy('a1', 'HYPE')).not.toBe(
      confirmationTarget.agentUndeploy('a1', 'HYPE'),
    );
  });

  it('one pair cannot stand in for another', () => {
    expect(confirmationTarget.agentDeploy('a1', 'HYPE')).not.toBe(
      confirmationTarget.agentDeploy('a1', 'PURR'),
    );
    expect(confirmationTarget.agentDeploy('a1', 'HYPE')).not.toBe(
      confirmationTarget.agentDeploy('a2', 'HYPE'),
    );
  });
});

/** A radar whose HYPE policy is occupied by another agent — the replace case. */
function occupiedRadar(): FakeRadarPort {
  const radar = new FakeRadarPort();
  radar.result = { kind: 'deployments', deployments: [deployment()] };
  return radar;
}

describe('describing a deploy', () => {
  it('issues a token against the rendered consequence, bound to the pair', async () => {
    const h = harness(occupiedRadar());
    const res = await h.describeDeploy.execute(deployReq);
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    const stored = h.confirmations.tokens.get(res.proposal.confirmationToken);
    expect(stored?.target).toBe(confirmationTarget.agentDeploy('a1', 'HYPE'));
    expect(stored?.tool).toBe('upsert_radar_deployment');
    expect(stored?.consequence).toBe(res.proposal.consequence);
  });

  it('refuses when the declaration offers no timeframes, and mints nothing', async () => {
    const radar = new FakeRadarPort();
    radar.timeframes = [];
    const h = harness(radar);
    const res = await h.describeDeploy.execute(deployReq);
    expect(res.kind).toBe('refused');
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('refuses a timeframe the declaration does not permit, naming the permitted', async () => {
    const h = harness();
    const res = await h.describeDeploy.execute({ ...deployReq, timeframe: '2m' });
    expect(res.kind === 'refused' && res.reason).toContain('15m, 1h, 4h');
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('refuses when the radar cannot be read — deploying blind replaces unseen state', async () => {
    const radar = new FakeRadarPort();
    radar.result = { kind: 'unreadable', reason: 'the socket died', cause: 'unreachable' };
    const h = harness(radar);
    const res = await h.describeDeploy.execute(deployReq);
    expect(res.kind === 'refused' && res.reason).toContain('the socket died');
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('an occupied coin names who the replacement removes, before anyone agrees', async () => {
    const h = harness(occupiedRadar());
    const res = await h.describeDeploy.execute(deployReq);
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    expect(res.proposal.consequence).toContain('a-old');
    expect(res.proposal.expectedRevision).toBe(7);
  });

  it('an unoccupied coin proposes a first deployment with null revision', async () => {
    const h = harness();
    const res = await h.describeDeploy.execute(deployReq);
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    expect(res.proposal.expectedRevision).toBeNull();
    expect(res.proposal.consequence).toContain('Fade Master I');
    expect(res.proposal.consequence).toContain('HYPE');
    expect(res.proposal.consequence).not.toContain('replaces');
  });

  it('a first-deploy ceremony: describe with null, perform sends it through', async () => {
    const h = harness();
    const described = await h.describeDeploy.execute(deployReq);
    if (described.kind !== 'proposal') throw new Error('expected a proposal');
    expect(described.proposal.expectedRevision).toBeNull();

    await h.performDeploy.execute({
      ...who,
      agentId: 'a1',
      coinId: 'HYPE',
      timeframe: '15m',
      expectedRevision: described.proposal.expectedRevision,
      confirmationToken: described.proposal.confirmationToken,
    });
    expect(h.radar.upserts[0]).toMatchObject({
      coinId: 'HYPE',
      timeframe: '15m',
      enabled: true,
      agentId: 'a1',
      expectedRevision: null,
    });
  });
});

describe('performing a deploy', () => {
  it('recomputes the target from the submitted values — a tampered coin spends nothing', async () => {
    const h = harness(occupiedRadar());
    const minted = await h.describeDeploy.execute(deployReq);
    if (minted.kind !== 'proposal') throw new Error('expected a proposal');

    await h.performDeploy.execute({
      ...who,
      agentId: 'a1',
      coinId: 'PURR',
      timeframe: '15m',
      expectedRevision: minted.proposal.expectedRevision,
      confirmationToken: minted.proposal.confirmationToken,
    });
    // The port received a target for what was *submitted*. The store holds a
    // token for what was *agreed*. They differ, so the guard's consume fails.
    const sent = h.radar.upserts[0]!.confirmation;
    expect(sent.target).toBe(confirmationTarget.agentDeploy('a1', 'PURR'));
    expect(
      await h.confirmations.consume(sent.token, 'u1', 'upsert_radar_deployment', sent.target),
    ).toBeNull();
  });

  it('sends enabled true and the submitted values', async () => {
    const h = harness();
    const res = await h.performDeploy.execute({
      ...who,
      agentId: 'a1',
      coinId: 'HYPE',
      timeframe: '1h',
      expectedRevision: 3,
      confirmationToken: 't-1',
    });
    expect(res).toEqual({ kind: 'deployed', revision: 4 });
    expect(h.radar.upserts[0]).toMatchObject({
      coinId: 'HYPE',
      timeframe: '1h',
      enabled: true,
      agentId: 'a1',
      expectedRevision: 3,
    });
  });

  it('a refusal from the guard or platform reaches the caller as its reason', async () => {
    const radar = new FakeRadarPort();
    radar.failWith = new Error('a confirmation is required for upsert_radar_deployment');
    const h = harness(radar);
    const res = await h.performDeploy.execute({
      ...who,
      agentId: 'a1',
      coinId: 'HYPE',
      timeframe: '1h',
      expectedRevision: 3,
      confirmationToken: 't-1',
    });
    expect(res.kind === 'refused' && res.reason).toContain('confirmation is required');
  });
});

describe('describing an undeploy', () => {
  const undeployReq = { ...who, agentId: 'a-old', agentName: 'Fade Master I', coinId: 'HYPE' };

  it('binds the token to the pair with the undeploy verb', async () => {
    const radar = new FakeRadarPort();
    radar.result = { kind: 'deployments', deployments: [deployment()] };
    const h = harness(radar);
    const res = await h.describeUndeploy.execute(undeployReq);
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    const stored = h.confirmations.tokens.get(res.proposal.confirmationToken);
    expect(stored?.target).toBe(confirmationTarget.agentUndeploy('a-old', 'HYPE'));
    expect(stored?.tool).toBe('delete_radar_deployment');
    // The revision and timeframe are the read's, not the caller's.
    expect(res.proposal.expectedRevision).toBe(7);
    expect(res.proposal.timeframe).toBe('15m');
  });

  it('refuses a coin with no deployment, and mints nothing', async () => {
    const h = harness();
    const res = await h.describeUndeploy.execute(undeployReq);
    expect(res.kind === 'refused' && res.reason).toContain('no deployment');
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('refuses when the agent is not part of that deployment', async () => {
    const radar = new FakeRadarPort();
    radar.result = { kind: 'deployments', deployments: [deployment()] };
    const h = harness(radar);
    const res = await h.describeUndeploy.execute({ ...undeployReq, agentId: 'a-other' });
    expect(res.kind === 'refused' && res.reason).toContain('not deployed on HYPE');
    expect(h.confirmations.tokens.size).toBe(0);
  });

  it('says the agent survives its undeployment', async () => {
    const radar = new FakeRadarPort();
    radar.result = { kind: 'deployments', deployments: [deployment()] };
    const h = harness(radar);
    const res = await h.describeUndeploy.execute(undeployReq);
    if (res.kind !== 'proposal') throw new Error('expected a proposal');
    expect(res.proposal.consequence).toContain('stays configured');
  });
});

describe('performing an undeploy', () => {
  const performReq = {
    ...who,
    agentId: 'a-old',
    coinId: 'HYPE',
    expectedRevision: 7,
    confirmationToken: 't-1',
  };

  it('recomputes the target from the submitted values', async () => {
    const h = harness();
    const res = await h.performUndeploy.execute(performReq);
    expect(res).toEqual({ kind: 'undeployed' });
    expect(h.radar.deletes[0]!.confirmation.target).toBe(
      confirmationTarget.agentUndeploy('a-old', 'HYPE'),
    );
    expect(h.radar.deletes[0]).toMatchObject({ coinId: 'HYPE', expectedRevision: 7 });
  });

  it('a delete the platform reports as not done is a refusal, not a success', async () => {
    const radar = new FakeRadarPort();
    radar.deleteReturns = false;
    const h = harness(radar);
    const res = await h.performUndeploy.execute(performReq);
    expect(res.kind === 'refused' && res.reason).toContain('not deleted');
  });

  it('a thrown refusal reaches the caller as its reason', async () => {
    const radar = new FakeRadarPort();
    radar.failWith = new Error('revision mismatch');
    const h = harness(radar);
    const res = await h.performUndeploy.execute(performReq);
    expect(res.kind === 'refused' && res.reason).toContain('revision mismatch');
  });
});
