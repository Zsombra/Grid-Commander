import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aDetail, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { mapConditions } from '@/infrastructure/battlegrid/condition-mapper.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * `/strategies/[id]`, with the condition layer on it.
 *
 * The fixture is **Berlin's real six conditions**, read from `get_strategy` on
 * 2026-08-04. Four are named building blocks carrying no verdict; two decide
 * direction, and one of those negates a block by reference.
 *
 * The assertion that matters is the count. A page saying Berlin has six ways
 * to decide direction describes a different strategy from the one that exists,
 * and it is the mistake a naive list makes by default.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

const clause = (sectionKey: string, header: string, label: string) => ({
  kind: 'clause',
  column: { sectionKey, header },
  op: 'is',
  label,
});

/** Berlin, as the platform returns it. */
const BERLIN = [
  { conditionKey: 'REGIME_UP', name: 'Regime trending up', verdict: null,
    definition: clause('includeRegimeContext', 'regTrend_now', 'trending up') },
  { conditionKey: 'REGIME_DOWN', name: 'Regime trending down', verdict: null,
    definition: clause('includeRegimeContext', 'regTrend_now', 'trending down') },
  { conditionKey: 'WINDOW_OPEN', name: 'Volatility window open', verdict: null,
    definition: clause('includeVolatility', 'ATR_trend', 'rising') },
  { conditionKey: 'FLOW_UP', name: 'Flow confirming up', verdict: null,
    definition: clause('includeCvd', 'CVD_trend', 'rising') },
  { conditionKey: 'FULL_SEND_UP', name: 'Full send — up', verdict: 'UP',
    definition: { kind: 'group', op: 'N_OF', n: 3, members: [
      { kind: 'conditionRef', conditionKey: 'REGIME_UP' },
      { kind: 'conditionRef', conditionKey: 'FLOW_UP' },
      { kind: 'conditionRef', conditionKey: 'WINDOW_OPEN' },
      clause('includeHigherTimeframe', 'MAalign_htf', 'bullish'),
    ] } },
  { conditionKey: 'FULL_SEND_DOWN', name: 'Full send — down', verdict: 'DOWN',
    definition: { kind: 'group', op: 'N_OF', n: 3, members: [
      { kind: 'conditionRef', conditionKey: 'REGIME_DOWN' },
      { kind: 'conditionRef', conditionKey: 'WINDOW_OPEN' },
      { kind: 'group', op: 'NOT', members: [{ kind: 'conditionRef', conditionKey: 'FLOW_UP' }] },
      clause('includeCvd', 'CVD_trend', 'falling'),
    ] } },
];

const SUMMARY = aStrategy({ id: 'berlin', name: 'Berlin' });

function world(conditionsPayload: unknown) {
  const strategies = new FakeStrategiesPort([SUMMARY]);
  strategies.detail = { ...aDetail(SUMMARY), conditions: mapConditions(conditionsPayload) };
  return actingWith({ strategies });
}

async function pageFor(conditionsPayload: unknown): Promise<string> {
  current = world(conditionsPayload) as unknown as { app: unknown; user: unknown };
  const Page = (await import('../../app/(app)/strategies/[id]/page.js')).default;
  return (await rendered(await Page({ params: params({ id: 'berlin' }) }))).text;
}

describe('the condition layer on the strategy page', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('counts the calls, not the conditions', async () => {
    const html = await pageFor(BERLIN);
    // Two decide. Four assemble into them. The failure mode this guards is a
    // page that says six.
    expect(html).toMatch(/2\s+conditions decide\s+direction/);
    expect(html).toMatch(/built from\s+4\s+named\s+blocks/);
    expect(html).not.toMatch(/6\s+conditions decide/);
  });

  it('shows the threshold a group actually requires', async () => {
    const html = await pageFor(BERLIN);
    expect(html).toMatch(/3\s+of\s+4\s+must hold/);
  });

  it('shows a negation as a negation', async () => {
    const html = await pageFor(BERLIN);
    expect(html).toMatch(/Must NOT hold/);
  });

  it('renders a comparison in words against its column', async () => {
    const html = await pageFor([
      { conditionKey: 'HOT', name: 'RSI hot', verdict: 'UP',
        definition: { kind: 'clause', column: { sectionKey: 'includeRsi', header: 'RSI14_now' },
          op: 'gt', value: 50 } },
    ]);
    expect(html).toMatch(/RSI14_now\s+\(includeRsi\)\s+is\s+above\s+50/);
  });

  it('names a reference whose target the strategy does not define', async () => {
    const html = await pageFor([
      { conditionKey: 'CALL', name: 'Call', verdict: 'UP',
        definition: { kind: 'conditionRef', conditionKey: 'MISSING_ONE' } },
    ]);
    expect(html).toContain('MISSING_ONE');
    expect(html).toMatch(/no condition with this key is defined here/);
    expect(html).toMatch(/Referenced but not defined here/);
  });

  it('says a strategy defines none, rather than showing nothing', async () => {
    const html = await pageFor([]);
    // This page is only reached with a strategy that read successfully, so
    // empty means empty — but a reader still has to be told which.
    expect(html).toMatch(/defines no conditions/);
  });

  it('renders the strategy even when part of a condition is not understood', async () => {
    const html = await pageFor([
      { conditionKey: 'ODD', name: 'Odd one', verdict: 'UP',
        definition: { kind: 'group', op: 'XOR', members: [] } },
    ]);
    // The strategy still draws, and the gap is reported rather than hidden.
    expect(html).toContain('Berlin');
    expect(html).toMatch(/Not understood by Grid-Commander/);
    expect(html).toContain('XOR');
    expect(html).toMatch(/What is shown is\s+incomplete/);
  });
});
