import { describe, expect, it } from 'vitest';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { SimulateAggregateQuery } from '@/application/use-cases/simulate-aggregate.query.js';
import { SIMULATION_SIGNAL_CAP } from '@/ports/strategies.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { FakeStrategiesPort } from '../support/strategy-fakes.js';

/**
 * The what-if calculator, mapped against the live shape of 2026-08-03.
 *
 * Verified that day against five real evaluations: fed each one's triggered
 * signals and effective allocations with its own gate, the returned
 * aggregate matched the platform's own score to its rounding.
 */

/** The live `simulate_aggregate_score` payload for a real BTC evaluation. */
const LIVE_SIM = {
  aggregateScore: 0.6470499999999999,
  aggregateScorePercent: 65,
  gate: 0.5,
  gatePercent: 50,
  wouldRoute: true,
  attributions: [
    { label: 'bollinger_squeeze', score: 0.402, scorePercent: 40, allocation: 1, attributionPercent: 3 },
    { label: 'trend_adx_trending', score: 0.25, scorePercent: 25, allocation: 2, attributionPercent: 4 },
    // No label — cannot be tied to a signal, dropped.
    { score: 0.9, attributionPercent: 9 },
  ],
};

function adapterOver(respond: (req: ToolCallRequest) => unknown) {
  const calls: ToolCallRequest[] = [];
  const battlegrid: BattleGridPort = {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('unused');
    },
    refresh: async () => {
      throw new Error('unused');
    },
    revoke: async () => {},
    callTool: async (req: ToolCallRequest) => {
      calls.push(req);
      return { content: respond(req) as Record<string, unknown> };
    },
  } as unknown as BattleGridPort;
  return { adapter: new McpStrategyAdapter(battlegrid), calls };
}

const who = { userId: 'owner', accessToken: 't' };
const signals = [
  { label: 'bollinger_squeeze', score: 0.402, allocation: 1 },
  { label: 'trend_adx_trending', score: 0.25, allocation: 2 },
];

describe('the what-if calculator', () => {
  it('reads the platform’s aggregate and its route verdict', async () => {
    const { adapter } = adapterOver(() => LIVE_SIM);
    const r = await adapter.simulateAggregate({ ...who, signals, gate: 0.5 });
    if (r.kind !== 'simulation') throw new Error(r.kind);
    expect(r.simulation.aggregateScorePercent).toBe(65);
    expect(r.simulation.gatePercent).toBe(50);
    // The platform's verdict, carried rather than recomputed. It is `>=`,
    // and a second implementation here could disagree with the pipeline.
    expect(r.simulation.wouldRoute).toBe(true);
  });

  it('drops an attribution it cannot tie to a signal', async () => {
    const { adapter } = adapterOver(() => LIVE_SIM);
    const r = await adapter.simulateAggregate({ ...who, signals, gate: 0.5 });
    if (r.kind !== 'simulation') throw new Error(r.kind);
    expect(r.simulation.attributions.map((a) => a.label)).toEqual([
      'bollinger_squeeze',
      'trend_adx_trending',
    ]);
    expect(r.simulation.attributions[1]?.allocation).toBe(2);
  });

  it('sends the signals and gate, and nothing else', async () => {
    const { adapter, calls } = adapterOver(() => LIVE_SIM);
    await adapter.simulateAggregate({ ...who, signals, gate: 0.5 });
    expect(calls[0]?.tool).toBe('simulate_aggregate_score');
    expect(calls[0]?.args).toEqual({ signals, gate: 0.5 });
  });

  it('carries a refusal rather than inventing a score', async () => {
    const { adapter } = adapterOver(() => {
      throw new Error('Input validation error: too many signals');
    });
    const r = await adapter.simulateAggregate({ ...who, signals, gate: 0.5 });
    // A what-if that answers a number when the platform declined would be
    // inventing the one figure the user came here to trust.
    expect(r.kind).toBe('refused');
    if (r.kind !== 'refused') throw new Error('expected a refusal');
    expect(r.reason).toContain('too many signals');
  });
});

describe('the query refuses before the platform does', () => {
  const many = Array.from({ length: SIMULATION_SIGNAL_CAP + 1 }, (_, i) => ({
    label: `s${i}`,
    score: 0.5,
    allocation: 1,
  }));

  it('refuses more signals than the platform accepts, and says why', async () => {
    const strategies = new FakeStrategiesPort();
    const r = await new SimulateAggregateQuery(strategies).execute({
      ...who,
      signals: many,
      gate: 0.5,
    });
    if (r.kind !== 'refused') throw new Error('expected a refusal');
    // The reason names the cap and why truncating would be wrong — a caller
    // that learned this from a bare validation error could not explain it.
    expect(r.reason).toContain(String(SIMULATION_SIGNAL_CAP));
    expect(r.reason).toContain('21');
    expect(r.reason).toMatch(/different composition/);
  });

  it('does not call the platform when it already knows the answer', async () => {
    let called = false;
    const strategies = new FakeStrategiesPort();
    strategies.simulateAggregate = async () => {
      called = true;
      return { kind: 'refused', reason: 'unused' };
    };
    await new SimulateAggregateQuery(strategies).execute({ ...who, signals: many, gate: 0.5 });
    expect(called).toBe(false);
  });

  it('refuses an empty set rather than asking for a score of nothing', async () => {
    const r = await new SimulateAggregateQuery(new FakeStrategiesPort()).execute({
      ...who,
      signals: [],
      gate: 0.5,
    });
    expect(r.kind).toBe('refused');
  });

  it('passes a set within the cap straight through', async () => {
    const strategies = new FakeStrategiesPort();
    const r = await new SimulateAggregateQuery(strategies).execute({ ...who, signals, gate: 0.5 });
    expect(r.kind).toBe('simulation');
  });
});
