import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * How it got here, as a person reads it on /agents/[id]/limits.
 *
 * The four arms of the requirement, rendered rather than asserted on the
 * query: a populated curve carries the figure, the count, and the span; an
 * empty curve is "nothing has settled", never an error; a failed performance
 * read leaves the gauges standing; and the caption keeps this reading apart
 * from the trading record.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

function world(agents: FakeAgentsPort) {
  current = actingWith({ agents }) as typeof current;
}

async function limitsPage(id: string) {
  const Page = (await import('../../app/(app)/agents/[id]/limits/page.js')).default;
  const resolved = await rendered(await Page({ params: params({ id }) }));
  return { ...resolved, text: resolved.text.replace(/\s+/g, ' ') };
}

/** The live Undertow shape of 2026-08-13: −0.84 across a real curve. */
function withCurve(): FakeAgentsPort {
  const agents = new FakeAgentsPort([anAgent({ id: 'a1' })]);
  agents.performanceResult = {
    kind: 'performance',
    reading: { realizedPnlUsd: -0.84, curve: [0, -0.01, -0.12, 0.08, -0.84] },
  };
  return agents;
}

beforeEach(() => {
  world(new FakeAgentsPort([anAgent({ id: 'a1' })]));
});

describe('a curve with settlements renders as a shape', () => {
  it('states the signed figure, the count, and the span', async () => {
    world(withCurve());
    const r = await limitsPage('a1');
    // A real minus sign, U+2212 — how every negative figure here renders.
    expect(r.text).toContain('−$0.84');
    expect(r.text).toContain('across 5 settlements since the budget baseline');
    expect(r.text).toContain('as BattleGrid measures it');
  });

  it('draws the curve — the SVG titles itself with the reading', async () => {
    world(withCurve());
    const r = await limitsPage('a1');
    expect(r.text).toContain('Cumulative realized P&L since the budget baseline');
  });

  it('does not pluralise a single settlement', async () => {
    const agents = new FakeAgentsPort([anAgent({ id: 'a1' })]);
    agents.performanceResult = {
      kind: 'performance',
      reading: { realizedPnlUsd: 0.3, curve: [0.3] },
    };
    world(agents);
    const r = await limitsPage('a1');
    expect(r.text).toContain('across 1 settlement since');
    expect(r.text).not.toContain('1 settlements');
  });

  it('says when the platform sent a curve without a total, rather than inventing one', async () => {
    const agents = new FakeAgentsPort([anAgent({ id: 'a1' })]);
    agents.performanceResult = {
      kind: 'performance',
      reading: { realizedPnlUsd: null, curve: [0.1, 0.2] },
    };
    world(agents);
    const r = await limitsPage('a1');
    expect(r.text).toContain('without a realized total');
  });
});

describe('an empty curve means nothing has settled', () => {
  it('states it as a fact, not an error', async () => {
    // The default fake is the live Vanguard shape: zero total, empty curve.
    const r = await limitsPage('a1');
    expect(r.text).toContain('Nothing has settled since the budget baseline yet');
    expect(r.text).toContain('no settlements, not missing data');
    expect(r.text).not.toContain('could not be read: ');
  });
});

describe('the performance read fails on its own', () => {
  it('keeps the gauges and says what could not be read and why', async () => {
    const agents = new FakeAgentsPort([anAgent({ id: 'a1' })]);
    agents.performanceResult = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };
    world(agents);
    const r = await limitsPage('a1');
    // The gauges render from their own read, untouched.
    expect(r.text).toContain('Loss in a day');
    // The section explains itself rather than vanishing.
    expect(r.text).toContain('How it got here');
    expect(r.text).toContain('BattleGrid did not respond');
    // The shared explanation, not a hand-rolled one.
    expect(r.text).toContain('This does not mean');
  });
});

describe('the two accounts of the money are never conflated', () => {
  it('names its span and points away from the trading record', async () => {
    world(withCurve());
    const r = await limitsPage('a1');
    expect(r.text).toContain('since the budget baseline');
    expect(r.text).toContain('This is not the trading record');
    expect(r.text).toContain('starts at the budget baseline');
  });
});
