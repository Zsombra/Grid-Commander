import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RadarPause } from '@/domain/agent/deployment.js';
import { FakeAgentsPort, anAgent } from '../support/agent-fakes.js';
import { NO_PAUSE_REPORTED, radarPausedFleet, radarRunning } from '../support/fakes.js';
import { actingWith, RenderRadarPort } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The sentence this change exists to stop.
 *
 * `/agents/[id]` rendered "On duty: scanning SOL on the 15m radar" throughout a
 * three-day platform pause, because `summary` was discarded at the adapter and
 * no layer of the product had any notion of a pause (#311). These assert the
 * correction — and, just as importantly, that the ordinary case is unchanged.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const asRead = (text: string): string => text.replace(/\s+/g, ' ');

async function agentPage(id: string) {
  const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
  return rendered(await Page({ params: Promise.resolve({ id }) }));
}

/** An agent deployed and resolved on duty, with the radar in a given state. */
function deployedWith(pause: RadarPause) {
  const agents = new FakeAgentsPort([anAgent({ id: 'a1', displayName: 'Salamis', status: 'ACTIVE' })]);
  const radar = new RenderRadarPort();
  radar.result = {
    kind: 'deployments',
    pause,
    deployments: [
      {
        policyId: 'p1',
        coinTicker: 'SOL',
        revision: 1,
        timeframe: '15m',
        enabled: true,
        slotAgentIds: ['a1'],
        onDutyAgentId: 'a1',
        openPositionAgentId: null,
        resolution: null,
      },
    ],
  };
  const acting = actingWith({ agents, radar });
  current = acting;
  return acting;
}

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([anAgent({ id: 'a1' })]) });
});

describe('a paused radar is stated, and nothing claims to be scanning under it', () => {
  it('says the radar is paused', async () => {
    deployedWith(radarPausedFleet());
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain('The radar is paused.');
  });

  it('says standing is not activity, so the row below cannot be read as scanning', async () => {
    /**
     * The row keeps its own sentence — it is what the platform says about that
     * row, and rewriting it from a fleet flag would make it say something
     * BattleGrid did not (D-3). What changes is that the page no longer lets
     * it be read as a claim about what is running.
     */
    deployedWith(radarPausedFleet());
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'Nothing below is scanning, whatever its standing says — standing names the agent the radar would resolve to, not what is running.',
    );
  });

  it('states the platform-paused count against the coins deployed', async () => {
    deployedWith(radarPausedFleet({ platformPaused: 17, coinsDeployed: 20 }));
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'BattleGrid reports 17 of 20 deployed coins as paused by the platform.',
    );
  });

  it('does not invent a denominator it was not given', async () => {
    deployedWith(radarPausedFleet({ platformPaused: 17, coinsDeployed: null }));
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'BattleGrid reports 17 of this account’s deployed coins as paused by the platform. It did not say how many are deployed in total.',
    );
  });

  it('shows both figures as returned when the platform contradicts itself', async () => {
    // `radarPaused: true` with a non-zero `scanning` is BattleGrid disagreeing
    // with itself. The product does not pick a winner.
    deployedWith(radarPausedFleet({ scanning: 4 }));
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain('BattleGrid nonetheless reports 4 scanning.');
    expect(asRead(page.text)).toContain('this product has not chosen between them');
  });
});

describe('the two pauses are never reduced to one', () => {
  it('says the radar is off without inventing a platform count', async () => {
    deployedWith(radarPausedFleet({ platformPaused: 0 }));
    const page = await agentPage('a1');
    const text = asRead(page.text);
    expect(text).toContain('The radar is paused.');
    expect(text).not.toContain('paused by the platform');
  });

  it('says the platform stopped coins without claiming the radar is off', async () => {
    deployedWith(radarRunning({ platformPaused: 4, coinsDeployed: 20 }));
    const page = await agentPage('a1');
    const text = asRead(page.text);
    expect(text).toContain('BattleGrid reports 4 of 20 deployed coins as paused by the platform.');
    expect(text).not.toContain('The radar is paused.');
  });
});

describe('silence is not reassurance', () => {
  it('says nothing at all when the platform reported no pause', async () => {
    /**
     * The case that must not become "the radar is running". An unreported
     * pause is a read that did not answer, and a reassuring badge built on it
     * would be this product asserting liveness it was never told.
     */
    deployedWith(NO_PAUSE_REPORTED);
    const page = await agentPage('a1');
    const text = asRead(page.text);
    expect(text).not.toContain('The radar is paused');
    expect(text).not.toContain('paused by the platform');
    expect(text).not.toContain('radar is running');
  });

  it('says nothing when the radar is running and the platform stopped nothing', async () => {
    // The ordinary case. No badge, no reassurance, no change to the page.
    deployedWith(radarRunning());
    const page = await agentPage('a1');
    const text = asRead(page.text);
    expect(text).not.toContain('paused');
    // And the standing sentence is untouched.
    expect(text).toContain('On duty: scanning SOL on the 15m radar.');
  });
});
