import { describe, expect, it } from 'vitest';
import { mapPerformanceReading } from '@/infrastructure/battlegrid/agent-mapper.js';
import { ReadLossShapeQuery } from '@/application/use-cases/read-loss-shape.query.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { EMPTY_PERFORMANCE_TOOL_RESPONSE } from '../support/performance-payloads.js';

/**
 * The baseline reading, mapped defensively.
 *
 * The payload has arrived under a `performance` envelope (the recorded
 * fixture) and bare (the 2026-08-12 v18 read), so both shapes are pinned.
 * The curve keeps only finite numbers — the caption counts settlements from
 * what is kept, so a junk entry must not stretch the shape it describes.
 */

/** The live Undertow read of 2026-08-13, abridged: bare, signed, real curve. */
const BARE_LIVE_READ = {
  agentId: 'aaaaaaaa-1111-4111-8111-111111111111',
  realizedPnlUsd: -0.84,
  drawdownUsd: 1.9,
  maxCumulativeDrawdownUsd: 6,
  pnlCurveUsd: [0, -0.01, -0.12, 0.08, -0.84],
  haltedAt: null,
};

describe('mapPerformanceReading', () => {
  it('reads the recorded envelope shape', () => {
    const r = mapPerformanceReading(EMPTY_PERFORMANCE_TOOL_RESPONSE);
    expect(r.realizedPnlUsd).toBe(0);
    expect(r.curve).toEqual([]);
  });

  it('reads the bare shape the v18 sweep recorded', () => {
    const r = mapPerformanceReading(BARE_LIVE_READ);
    expect(r.realizedPnlUsd).toBe(-0.84);
    expect(r.curve).toEqual([0, -0.01, -0.12, 0.08, -0.84]);
  });

  it('keeps only finite numbers in the curve', () => {
    const r = mapPerformanceReading({
      ...BARE_LIVE_READ,
      pnlCurveUsd: [0, '0.1', null, -0.12, {}, Infinity],
    });
    expect(r.curve).toEqual([0, -0.12]);
  });

  it('maps an absent curve to empty and an absent total to null, inventing neither', () => {
    const r = mapPerformanceReading({ agentId: BARE_LIVE_READ.agentId });
    expect(r.realizedPnlUsd).toBeNull();
    expect(r.curve).toEqual([]);
  });

  it('treats a non-array curve as empty rather than crashing on it', () => {
    const r = mapPerformanceReading({ ...BARE_LIVE_READ, pnlCurveUsd: 'not a curve' });
    expect(r.curve).toEqual([]);
  });
});

describe('ReadLossShapeQuery', () => {
  const req = { userId: 'u', accessToken: 't', agentId: 'a1' };

  it('passes the reading through and counts the kept points', async () => {
    const agents = new FakeAgentsPort([anAgent({ id: 'a1' })]);
    agents.performanceResult = {
      kind: 'performance',
      reading: { realizedPnlUsd: -0.84, curve: [0, -0.5, -0.84] },
    };
    const result = await new ReadLossShapeQuery(agents).execute(req);
    expect(result).toEqual({
      kind: 'loss-shape',
      realizedPnlUsd: -0.84,
      curve: [0, -0.5, -0.84],
      settlements: 3,
    });
  });

  it('passes an unreadable read through with its cause intact', async () => {
    const agents = new FakeAgentsPort([anAgent({ id: 'a1' })]);
    agents.performanceResult = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };
    const result = await new ReadLossShapeQuery(agents).execute(req);
    expect(result).toEqual({
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    });
  });
});
