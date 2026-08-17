import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { aDetail, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The stop-loss floor, read as the platform's own noise answer.
 *
 * Three claims live only on the page and are tested here as copy: that the
 * floor is presented as the platform's volatility-relative reading of where
 * ordinary movement ends, that the claim goes no wider than the declaration
 * — enforcement of the floor on live trades has never been observed — and
 * that the measured half of the comparison is named (each agent's trading
 * record) rather than computed on the strategy page.
 *
 * The fixture's multiple is 2.5, deliberately not the fleet's actual 1: a
 * page that hard-codes the platform default instead of reading the payload
 * fails here and nowhere else.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

const SUMMARY = aStrategy({ id: 'wave', name: 'Wave' });

function world() {
  const strategies = new FakeStrategiesPort([SUMMARY]);
  strategies.detail = {
    ...aDetail(SUMMARY),
    tradeLevelPolicy: { maxStopLossPct: 5, minStopLossAtrMultiple: 2.5, minRiskRewardRatio: 1.5 },
  };
  return actingWith({ strategies });
}

/** The page's text with runs of whitespace collapsed, as risk-reading.test.ts does. */
async function page(): Promise<string> {
  current = world() as unknown as { app: unknown; user: unknown };
  const Page = (await import('../../app/(app)/strategies/[id]/page.js')).default;
  const text = (await rendered(await Page({ params: params({ id: 'wave' }) }))).text;
  return text.replace(/\s+/g, ' ');
}

describe('the floor as the platform’s own noise reference', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('states the reading at the declared multiple, attributed to the declaration', async () => {
    const text = await page();
    expect(text).toContain('the platform’s own reading of where noise ends');
    // 2.5, not 1 — the payload's multiple, never a hard-coded default. The
    // optional space is the resolver joining adjacent text nodes, not copy.
    expect(text).toMatch(/a stop closer than 2\.5 ?× the ATR sits inside ordinary market movement/);
    expect(text).toContain('by its declaration');
  });

  it('claims the declaration only, never enforcement', async () => {
    const text = await page();
    expect(text).toContain('not what it has been observed to hold live trades to');
    expect(text).not.toMatch(/enforc|guarantee|prevent|protect/i);
  });

  it('names the measured half instead of computing it', async () => {
    const text = await page();
    expect(text).toContain('measured on each agent’s trading record, from its own closed trades');
    // The pointer is prose, not a derivation. The realized-move math lives in
    // read-trading-record.query.ts and must not be re-imported here — two
    // modules folding the same rows is how two screens start to disagree.
    const source = readFileSync('src/presentation/components/strategy-detail.tsx', 'utf8');
    expect(source).not.toMatch(/read-trading-record/);
  });

  it('keeps the inert-state notice beside the reading', async () => {
    const text = await page();
    expect(text).toContain('These values are set by the platform.');
    expect(text).toContain('cannot be edited through this product');
  });
});
