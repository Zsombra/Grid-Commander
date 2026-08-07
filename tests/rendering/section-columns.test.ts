import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aColumnContract,
  aColumnRefusal,
  aMetricHints,
  FakeStrategiesPort,
} from '../support/strategy-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The section library and the column workbench, branch by branch.
 *
 * The branches carrying this surface's whole point: a control the platform's
 * declaration cannot answer for is withheld and said to be withheld, and a page
 * that composes without saving says so where it composes.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function libraryRendered() {
  const Page = (await import('../../app/(app)/strategies/sections/page.js')).default;
  return rendered(await Page());
}

async function sectionRendered(sectionKey: string, search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/strategies/sections/[sectionKey]/page.js')).default;
  return rendered(
    await Page({ params: params({ sectionKey }), searchParams: Promise.resolve(search) }),
  );
}

function sectionWorld() {
  const strategies = new FakeStrategiesPort();
  strategies.stageMetric(aMetricHints());
  current = actingWith({ strategies });
  return strategies;
}

beforeEach(() => {
  current = actingWith();
});

describe('the section library, branch by branch', () => {
  it('an unreadable vocabulary says so — never an empty library', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.vocabularyTemplatesReadable = false;
    current = actingWith({ strategies });
    const r = await libraryRendered();
    expect(r.headings[0]).toBe('The section vocabulary could not be read');
    // The shared sentence, whose subject and verb are separate nodes.
    expect(r.text).toContain('This does not mean');
    expect(r.text).toContain('these sections are');
  });

  it('lists every advertised section and opens each one', async () => {
    sectionWorld();
    const r = await libraryRendered();
    expect(r.headings[0]).toBe('Section library');
    expect(r.text).toContain('RSI');
    expect(r.links).toContain('/strategies/sections/includeRsi');
    expect(r.links).toContain('/strategies/sections/includeMacd');
  });

  it('counts published columns, and says when the platform published none', async () => {
    sectionWorld();
    const r = await libraryRendered();
    expect(r.text).toContain('2 columns');
    expect(r.text).toContain(`BattleGrid did not publish this section's columns.`);
  });
});

describe('one section, branch by branch', () => {
  it('a key the vocabulary does not advertise says so and offers the library', async () => {
    sectionWorld();
    const r = await sectionRendered('includeGhost');
    expect(r.headings[0]).toBe('No such section');
    expect(r.text).toContain('Back to the section library');
  });

  it('an unreadable vocabulary explains itself rather than showing a bare section', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.vocabularyTemplatesReadable = false;
    current = actingWith({ strategies });
    const r = await sectionRendered('includeRsi');
    expect(r.headings[0]).toBe('The section could not be read');
    expect(r.text).toContain('This does not mean');
    expect(r.text).toContain('this section is');
  });

  it('shows the columns the section renders and opens each in the editor', async () => {
    sectionWorld();
    const r = await sectionRendered('includeRsi');
    expect(r.headings[0]).toBe('RSI');
    expect(r.text).toContain('RSI14');
    expect(r.text).toContain('trajectory');
    expect(r.text).toContain('Open this column in the editor');
    expect(
      r.links.some((l) => l.startsWith('/strategies/sections/includeRsi?metric=RSI14')),
    ).toBe(true);
  });

  it('says a platform section’s contents are the platform’s', async () => {
    sectionWorld();
    const r = await sectionRendered('includeRsi');
    expect(r.text).toContain(
      `These belong to BattleGrid. A compile request names a platform section by key and carries no columns for it, so what a strategy chooses about this section is whether to include it — not what is in it.`,
    );
  });

  it('says nothing composed here is saved, where the composing happens', async () => {
    sectionWorld();
    const r = await sectionRendered('includeRsi');
    expect(r.text).toContain('Nothing composed on this page is saved.');
    expect(r.headings).toContain('Where a column composed here can go');
  });

  it('distinguishes a section whose columns the platform did not publish', async () => {
    sectionWorld();
    const r = await sectionRendered('includeMacd');
    expect(r.text).toContain(`BattleGrid's vocabulary did not publish this section's columns.`);
  });

  it('names a column key it does not carry rather than dropping it', async () => {
    const strategies = sectionWorld();
    strategies.templates = [
      {
        kind: 'platform',
        sectionKey: 'includeRsi',
        label: 'RSI',
        columns: [
          { metric: 'RSI14', transformId: 'value', timeframe: { rel: 'anchor' }, smoothing: 'ema' },
        ],
      },
    ];
    const r = await sectionRendered('includeRsi');
    expect(r.text).toContain('Grid-Commander does not carry: smoothing');
  });

  it('says which required part a column entry is missing', async () => {
    const strategies = sectionWorld();
    strategies.templates = [
      {
        kind: 'platform',
        sectionKey: 'includeRsi',
        label: 'RSI',
        columns: [{ transformId: 'value' }],
      },
    ];
    const r = await sectionRendered('includeRsi');
    expect(r.text).toContain(
      `Grid-Commander cannot express this column — the platform's entry carries no metric, timeframe.`,
    );
  });
});

describe('the column workbench', () => {
  it('shows no editor until a metric is named', async () => {
    const strategies = sectionWorld();
    const r = await sectionRendered('includeRsi');
    expect(r.text).toContain('Read this metric');
    expect(strategies.calls.some((c) => c.op === 'column-contract')).toBe(false);
  });

  it('offers every declared control once a metric is read', async () => {
    sectionWorld();
    const r = await sectionRendered('includeRsi', { metric: 'RSI14' });
    expect(r.headings).toContain('What RSI14 is');
    expect(r.text).toContain('Bars');
    expect(r.text).toContain('Ordering');
    expect(r.text).toContain('Check against the contract');
  });

  it('withholds a control the declaration could not answer for, and says why', async () => {
    // Empty is what a failed discovery leaves behind. An empty select would say
    // the platform accepts nothing here, which is a different and false claim.
    const strategies = sectionWorld();
    strategies.controls = { ...strategies.controls, bars: [] };
    const r = await sectionRendered('includeRsi', { metric: 'RSI14' });
    expect(r.text).toContain(
      `Bars: BattleGrid's declaration did not name the values it accepts, so this control is not offered.`,
    );
  });

  it('renders a compiled contract for a column it was seeded with', async () => {
    const strategies = sectionWorld();
    strategies.columnOutcome = { kind: 'contract', contract: aColumnContract() };
    const r = await sectionRendered('includeRsi', {
      metric: 'RSI14',
      transformId: 'value',
      tf: 'rel:anchor',
    });
    expect(r.headings).toContain('The column compiles');
    expect(r.text).toContain('output = RSI14[t - 0]');
    expect(r.text).toContain('RSI14: latest value.');
  });

  it('carries bars and ordering to the platform', async () => {
    const strategies = sectionWorld();
    strategies.columnOutcome = { kind: 'contract', contract: aColumnContract() };
    await sectionRendered('includeRsi', {
      metric: 'RSI14',
      transformId: 'value',
      tf: 'abs:1h',
      bars: 'closed',
      ordering: 'near',
    });
    expect(strategies.calls.find((c) => c.op === 'column-contract')?.payload).toMatchObject({
      metric: 'RSI14',
      timeframe: { abs: '1h' },
      bars: 'closed',
      ordering: 'near',
    });
  });

  it('renders a refusal as the platform’s teaching, domain and all', async () => {
    const strategies = sectionWorld();
    strategies.columnOutcome = { kind: 'refused', refusal: aColumnRefusal() };
    const r = await sectionRendered('includeRsi', {
      metric: 'RSI14',
      transformId: 'spread',
      tf: 'rel:anchor',
      inputs: 'CLOSE',
    });
    expect(r.text).toContain('here is why');
    expect(r.text).toContain('not a legal relational operand');
    expect(r.text).toContain('column.inputs.0.metric');
    expect(r.text).toContain('ADX, CCI20, MFI14, RSI7, STOCH_D, STOCH_K');
  });

  it('says an unfinished column is ours to fix, and that nothing was sent', async () => {
    const strategies = sectionWorld();
    const r = await sectionRendered('includeRsi', {
      metric: 'RSI14',
      transformId: 'value',
      tf: 'rel:anchor',
      window: '4 bars',
    });
    expect(r.text).toContain('Window must be a whole number');
    expect(r.text).toContain('Nothing was sent to BattleGrid.');
    expect(strategies.calls.some((c) => c.op === 'column-contract')).toBe(false);
  });

  it('says a metric the platform does not list is not one, and sends nothing', async () => {
    const strategies = sectionWorld();
    const r = await sectionRendered('includeRsi', {
      metric: 'GHOST',
      transformId: 'value',
      tf: 'rel:anchor',
    });
    expect(r.text).toContain(
      `BattleGrid does not list a metric by that key, so nothing was sent to be checked.`,
    );
    expect(strategies.calls.some((c) => c.op === 'column-contract')).toBe(false);
  });

  it('explains a hints read that failed rather than showing a metric with no transforms', async () => {
    const strategies = sectionWorld();
    // Listed in the index, no card staged — the shape of a detail read failing
    // on a key the platform really does publish.
    strategies.hints.delete('RSI14');
    const r = await sectionRendered('includeRsi', { metric: 'RSI14' });
    expect(r.text).toContain('This does not mean');
    expect(r.text).toContain('this metric is');
    // The section around it still renders — one failed read does not take the
    // page with it.
    expect(r.text).toContain('The columns this section renders');
  });
});

describe('the gate every page shares', () => {
  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await libraryRendered();
    expect(r.text).toContain('connect');
  });

  it('and on the section page too', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await sectionRendered('includeRsi');
    expect(r.text).toContain('connect');
  });
});
