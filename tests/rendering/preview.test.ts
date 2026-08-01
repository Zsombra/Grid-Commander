import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aDetail, aMembership, aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The agent's-eye preview, branch by branch: the rendered report with its
 * cost, the membership summary, the refused draft in the platform's words —
 * and the fact that previewing writes nothing.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function previewRendered(id: string, search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/strategies/[id]/preview/page.js')).default;
  return rendered(await Page({ params: params({ id }), searchParams: Promise.resolve(search) }));
}

function previewWorld() {
  const summary = aStrategy();
  const strategies = new FakeStrategiesPort([summary]);
  strategies.detail = aDetail(summary);
  strategies.membership = [
    aMembership(),
    aMembership({ signalId: 'rsi_overbought', defaultAllocation: 1 }),
    aMembership({ signalId: 'macd_bull_cross', inReport: false, status: 'NOT_IN_REPORT' }),
  ];
  current = actingWith({ strategies });
  return strategies;
}

beforeEach(() => {
  current = actingWith();
});

describe('the preview page, branch by branch', () => {
  it('renders the report, its cost, and every budget gauge', async () => {
    previewWorld();
    const r = await previewRendered('s1');
    expect(r.headings[0]).toContain('Midway (fork)');
    expect(r.text).toContain('Price Action');
    expect(r.text).toContain('the last traded price');
    expect(r.text).toContain('1393 tokens');
    expect(r.text).toContain('o200k_base');
    expect(r.text).toContain('sections');
    expect(r.text).toContain('of  32');
    expect(r.text).toContain('nothing is saved or changed');
  });

  it('says which signals the composition feeds, and how many it starves', async () => {
    previewWorld();
    const r = await previewRendered('s1');
    expect(r.text).toContain('signal(s) can read this report');
    expect(r.text).toContain('1 cannot');
    expect(r.text).toContain('rsi_oversold');
    expect(r.text).toContain('platform default 2');
  });

  it('previewing writes nothing', async () => {
    const strategies = previewWorld();
    await previewRendered('s1');
    expect(strategies.calls.every((c) => c.op === 'preview')).toBe(true);
  });

  it('a refused draft shows the platform’s words on the same page', async () => {
    const strategies = previewWorld();
    strategies.previewOutcome = {
      kind: 'refused',
      reason: 'VALIDATION_ERROR: custom section requires a self-contained definition',
    };
    const r = await previewRendered('s1');
    expect(r.text).toContain('here is why');
    expect(r.text).toContain('self-contained definition');
    // Membership still renders — the derive succeeded independently.
    expect(r.text).toContain('can read this report');
  });

  it('explicit tickers reach the platform as composed', async () => {
    const strategies = previewWorld();
    await previewRendered('s1', { tickers: 'BTC, ETH' });
    const call = strategies.calls.find((c) => c.op === 'preview');
    expect(call?.payload).toMatchObject({ coinSelection: { mode: 'explicit', tickers: ['BTC', 'ETH'] } });
  });

  it('an unreadable strategy is not an empty preview', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.detailReadable = false;
    current = actingWith({ strategies });
    const r = await previewRendered('s1');
    expect(r.headings[0]).toBe('The preview could not be read');
    expect(r.text).toContain('BattleGrid did not respond');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await previewRendered('s1');
    expect(r.text).toContain('connect');
  });
});
