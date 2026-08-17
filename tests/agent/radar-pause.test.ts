import { describe, expect, it } from 'vitest';
import {
  pauseIsUnknown,
  platformStopped,
  radarIsPaused,
  type RadarPause,
} from '@/domain/agent/deployment.js';
import { McpRadarAdapter } from '@/infrastructure/battlegrid/radar-adapter.js';

/**
 * Whether the radar is running, read off `list_radar_deployments`'s summary.
 *
 * The property under test throughout is the one the defect turned on: **absence
 * is not "running"**. Every case below that omits or malforms a field must come
 * back `null`, because a radar answer that did not say is not a radar that is
 * scanning — and the product spent three days telling this operator otherwise
 * (#311).
 */

/** The declared v19.1.0 summary — all fourteen fields, as the record has them. */
function summary(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    coinsDeployed: 20,
    inPosition: 0,
    scanning: 0,
    idle: 0,
    warming: 0,
    sittingOut: 0,
    needsAttention: 0,
    paused: 20,
    platformPaused: 20,
    blocked: 0,
    onDutyNow: 0,
    agentsActive: 3,
    coinCap: 20,
    radarPaused: true,
    ...over,
  };
}

const policy = {
  policyId: 'p1',
  coinTicker: 'SOL',
  revision: 1,
  deploymentTimeframe: '15m',
  enabled: true,
  slots: [{ agentId: 'a1' }],
};

/** The adapter over a canned tool response. */
function adapterReturning(payload: Record<string, unknown>) {
  const battlegrid = {
    callTool: async () => ({ content: payload }),
  } as unknown as ConstructorParameters<typeof McpRadarAdapter>[0];
  return new McpRadarAdapter(battlegrid);
}

const read = async (payload: Record<string, unknown>) => {
  const result = await adapterReturning(payload).listDeployments({
    userId: 'u1',
    accessToken: 't',
  });
  if (result.kind !== 'deployments') throw new Error('expected deployments');
  return result;
};

describe('the pause is read off the summary', () => {
  it('reads the live account’s shape — paused radar, every coin platform-paused', async () => {
    // The reading three sessions recorded while polling for the unpause.
    const result = await read({ policies: [policy], summary: summary() });
    expect(result.pause).toEqual({
      radarPaused: true,
      platformPaused: 20,
      coinsDeployed: 20,
      scanning: 0,
    });
  });

  it('reads a running radar as running', async () => {
    const result = await read({
      policies: [policy],
      summary: summary({ radarPaused: false, platformPaused: 0, paused: 0, scanning: 20 }),
    });
    expect(result.pause.radarPaused).toBe(false);
    expect(result.pause.scanning).toBe(20);
  });

  it('still reads the deployments beside it', async () => {
    // The pause must not cost the rows — they are separate concerns on one
    // payload, and a summary mapper that threw would take the page with it.
    const result = await read({ policies: [policy], summary: summary() });
    expect(result.deployments).toHaveLength(1);
    expect(result.deployments[0]?.coinTicker).toBe('SOL');
  });
});

describe('absence is not a running radar', () => {
  it.each([
    ['no summary at all', {}],
    ['a null summary', { summary: null }],
    ['a summary that is a string', { summary: 'PAUSED' }],
    ['a summary with no radarPaused', { summary: { coinsDeployed: 20 } }],
  ])('reports the pause as unknown given %s', async (_name, extra) => {
    const result = await read({ policies: [policy], ...extra });
    expect(result.pause.radarPaused).toBeNull();
    expect(radarIsPaused(result.pause)).toBe(false);
  });

  it('does not coerce a non-boolean radarPaused', async () => {
    // `"true"` is the shape a JSON round-trip through a stricter serialiser
    // could produce, and truthiness would make it a paused radar by accident.
    const result = await read({ policies: [policy], summary: summary({ radarPaused: 'true' }) });
    expect(result.pause.radarPaused).toBeNull();
  });

  it('does not coerce a non-numeric count', async () => {
    const result = await read({
      policies: [policy],
      summary: summary({ platformPaused: '20', coinsDeployed: null }),
    });
    expect(result.pause.platformPaused).toBeNull();
    expect(result.pause.coinsDeployed).toBeNull();
  });

  it('reports an entirely absent summary as unknown, not as unpaused', async () => {
    const result = await read({ policies: [policy] });
    expect(pauseIsUnknown(result.pause)).toBe(true);
  });
});

describe('the two pauses stay apart', () => {
  const of = (over: Partial<RadarPause>): RadarPause => ({
    radarPaused: null,
    platformPaused: null,
    coinsDeployed: null,
    scanning: null,
    ...over,
  });

  it('treats null as not-paused for the predicate, never as paused', () => {
    // `=== true`, deliberately. A `!== false` here would make every silent
    // read a paused radar, which is the mirror of the defect.
    expect(radarIsPaused(of({ radarPaused: null }))).toBe(false);
    expect(radarIsPaused(of({ radarPaused: false }))).toBe(false);
    expect(radarIsPaused(of({ radarPaused: true }))).toBe(true);
  });

  it('reports a platform-paused count only where there is one', () => {
    expect(platformStopped(of({ platformPaused: 17 }))).toBe(17);
    // Zero is a real answer and is not something to tell anyone about.
    expect(platformStopped(of({ platformPaused: 0 }))).toBeNull();
    expect(platformStopped(of({ platformPaused: null }))).toBeNull();
  });

  it('lets the radar be paused while the platform has stopped nothing', () => {
    // Two independent facts. Reducing them to one claim would leave an
    // operator unable to tell which, and so unable to tell what would help.
    const pause = of({ radarPaused: true, platformPaused: 0 });
    expect(radarIsPaused(pause)).toBe(true);
    expect(platformStopped(pause)).toBeNull();
  });

  it('lets the platform stop coins while the radar itself runs', () => {
    const pause = of({ radarPaused: false, platformPaused: 4, coinsDeployed: 20 });
    expect(radarIsPaused(pause)).toBe(false);
    expect(platformStopped(pause)).toBe(4);
  });

  it('is unknown only when nothing at all was reported', () => {
    expect(pauseIsUnknown(of({}))).toBe(true);
    expect(pauseIsUnknown(of({ scanning: 0 }))).toBe(false);
  });
});
