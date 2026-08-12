import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aColumnContract,
  aColumnRefusal,
  aMetric,
  aMetricHints,
  FakeStrategiesPort,
} from '../support/strategy-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The metric index, the metric card, and the column workbench — branch by
 * branch. The branch that carries the change's whole point: a refused
 * column renders the platform's teaching (path, received value, legal
 * domain), never a flattened "invalid".
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function indexRendered() {
  const Page = (await import('../../app/(app)/strategies/metrics/page.js')).default;
  return rendered(await Page());
}

async function metricRendered(metric: string, search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/strategies/metrics/[metric]/page.js')).default;
  return rendered(await Page({ params: params({ metric }), searchParams: Promise.resolve(search) }));
}

function metricWorld() {
  const strategies = new FakeStrategiesPort();
  strategies.stageMetric(aMetricHints());
  strategies.stageMetric(
    aMetricHints({ summary: aMetric({ id: 'CLOSE', label: 'Close price', family: 'price', unit: 'price', range: null }) }),
  );
  current = actingWith({ strategies });
  return strategies;
}

beforeEach(() => {
  current = actingWith();
});

describe('the metric index, branch by branch', () => {
  it('an unreadable vocabulary says so — never an empty index', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.metricsReadable = false;
    current = actingWith({ strategies });
    const r = await indexRendered();
    expect(r.headings[0]).toBe('The metric vocabulary could not be read');
    expect(r.text).toContain('BattleGrid did not respond');
  });

  it('metrics group by family with unit, range, and legal transforms', async () => {
    metricWorld();
    const r = await indexRendered();
    expect(r.headings[0]).toBe('Metric index');
    expect(r.headings).toContain('momentum');
    expect(r.headings).toContain('price');
    expect(r.text).toContain('RSI (14)');
    expect(r.text).toContain('0–100');
    expect(r.text).toContain('value, trajectory, classifyZone, spread, rank');
    expect(r.text).toContain('Back to strategies');
  });
});

describe('a metric card, branch by branch', () => {
  it('shows the native contract and each transform in the platform’s words', async () => {
    metricWorld();
    const r = await metricRendered('RSI14');
    expect(r.headings[0]).toContain('RSI (14)');
    expect(r.text).toContain('range 0–100');
    expect(r.text).toContain('Select one value at the requested offset.');
    expect(r.text).toContain('output = base[t - offset]');
    expect(r.text).toContain('needs an operand');
    expect(r.text).toContain('Chains into:');
    expect(r.text).toContain('trajectory, aggregate');
    expect(r.text).toContain('Back to the metric index');
  });

  it('an unlisted key says "No such metric" and offers the index', async () => {
    metricWorld();
    const r = await metricRendered('GHOST');
    expect(r.headings[0]).toBe('No such metric');
    expect(r.text).toContain('Back to the metric index');
  });
});

describe('the column workbench', () => {
  it('no transform chosen means no check ran', async () => {
    const strategies = metricWorld();
    const r = await metricRendered('RSI14');
    expect(strategies.calls.some((c) => c.op === 'column-contract')).toBe(false);
    expect(r.text).not.toContain('The column compiles');
  });

  it('a valid column renders its compiled contract', async () => {
    const strategies = metricWorld();
    strategies.columnOutcome = { kind: 'contract', contract: aColumnContract() };
    const r = await metricRendered('RSI14', { transformId: 'value', tf: 'rel:anchor' });
    expect(r.text).toContain('The column compiles');
    expect(r.text).toContain('output = RSI14[t - 0]');
    expect(r.text).toContain('RSI14: latest value.');
    expect(r.text).toContain('Nulls present as');
    expect(r.text).toContain('—');
    expect(r.text).toContain('takes its timeframe from the section');
  });

  it('a refused column renders the platform’s teaching, domain and all', async () => {
    const strategies = metricWorld();
    strategies.columnOutcome = { kind: 'refused', refusal: aColumnRefusal() };
    const r = await metricRendered('RSI14', { transformId: 'spread', tf: 'rel:anchor', inputs: 'CLOSE' });
    expect(r.text).toContain('here is why');
    expect(r.text).toContain('not a legal relational operand');
    expect(r.text).toContain('column.inputs.0.metric');
    expect(r.text).toContain('"CLOSE"');
    expect(r.text).toContain('ADX, CCI20, MFI14, RSI7, STOCH_D, STOCH_K');
  });

  it('the check form offers every control from the declaration, tagged timeframes included', async () => {
    // The requirement: An Enumerated Column Control Is Read From The
    // Declaration Or Withheld — on this surface, not only the section editor.
    metricWorld();
    const r = await metricRendered('RSI14');
    expect(r.text).toContain('rel:anchor');
    expect(r.text).toContain('abs:1h');
    expect(r.text).toContain('closed');
    expect(r.text).toContain('hi');
    expect(r.text).toContain('support');
  });

  it('a control the declaration cannot answer for is withheld and said to be', async () => {
    const strategies = metricWorld();
    strategies.controls = { ...strategies.controls, bars: [], ordering: [] };
    const r = await metricRendered('RSI14');
    expect(r.text).toContain(
      "Bars: BattleGrid's declaration did not name the values it accepts",
    );
    expect(r.text).toContain(
      "Ordering: BattleGrid's declaration did not name the values it accepts",
    );
  });

  it('an untagged timeframe degrades to a stated problem, never a misfiled column', async () => {
    // The old reader sorted `tf=anchor` into rel-or-abs against a built-in
    // list of the relative names — the fixed-list classification the spec
    // forbids. An old URL now yields the composer's own problem and no call.
    const strategies = metricWorld();
    const r = await metricRendered('RSI14', { transformId: 'value', tf: 'anchor' });
    expect(r.text).toContain('This column is not finished');
    expect(r.text).toContain('Choose a timeframe');
    expect(r.text).toContain('Nothing was sent to BattleGrid.');
    expect(strategies.calls.some((c) => c.op === 'column-contract')).toBe(false);
  });

  it('the composed column reaches the check as composed', async () => {
    const strategies = metricWorld();
    strategies.columnOutcome = { kind: 'contract', contract: aColumnContract() };
    await metricRendered('RSI14', {
      transformId: 'spread',
      tf: 'abs:1h',
      inputs: 'RSI7, STOCH_K',
      window: '4',
    });
    const call = strategies.calls.find((c) => c.op === 'column-contract');
    expect(call?.payload).toMatchObject({
      metric: 'RSI14',
      transformId: 'spread',
      timeframe: { abs: '1h' },
      inputs: ['RSI7', 'STOCH_K'],
      window: 4,
    });
  });
});

describe('the gate every page shares', () => {
  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await indexRendered();
    expect(r.text).toContain('connect');
  });
});
