import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { aFunnel, aPublicTrade, FakeExplorerPort } from '../support/explorer-fakes.js';

/**
 * The competitor page, section by section. The property that matters is
 * the same one the pipeline page holds: four reads, four outcomes, and no
 * one of them able to hide or speak for another.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = Promise.resolve({ agentId: 'b731d127' });

async function competitorRendered() {
  const Page = (await import('../../app/(app)/explorer/[agentId]/page.js')).default;
  return rendered(await Page({ params }));
}

function world() {
  const explorer = new FakeExplorerPort();
  current = actingWith({ explorer });
  return explorer;
}

beforeEach(() => {
  current = actingWith({ explorer: new FakeExplorerPort() });
});

describe('the competitor page, section by section', () => {
  it('shows the funnel from evaluations through to the result', async () => {
    world();
    const r = await competitorRendered();
    expect(r.text).toMatch(/245\s+evaluations/);
    expect(r.text).toMatch(/102\s+decisions/);
    expect(r.text).toMatch(/73\s+entered/);
    expect(r.text).toContain('76%');
    expect(r.text).toContain('$50.06');
  });

  it('labels the two skip counters apart', async () => {
    world();
    const r = await competitorRendered();
    expect(r.text).toContain('Decisions to skip');
    expect(r.text).toContain('pipelines ending SKIPPED');
  });

  it('says what a competitor watches most', async () => {
    world();
    const r = await competitorRendered();
    expect(r.text).toContain('ENA (21)');
    expect(r.text).toContain('FARTCOIN (19)');
  });

  it('shows the platform’s win verdict, not one derived from the figure', async () => {
    const explorer = world();
    // A break-even trade the platform calls a loss.
    explorer.trades = {
      kind: 'value',
      value: [aPublicTrade({ netPnl: 0, isWin: false, coinTicker: 'BTC' })],
      total: 1,
    };
    const r = await competitorRendered();
    expect(r.text).toContain('loss');
  });

  it('says how many trades are being shown of the total', async () => {
    world();
    const r = await competitorRendered();
    expect(r.text).toMatch(/Showing\s+1\s+of\s+51/);
  });

  it('does not read inside an open position it has never seen', async () => {
    const explorer = world();
    explorer.open = {
      kind: 'value',
      value: {
        unrealizedPnl: 12.5,
        openPositionCount: 2,
        // Two rows exist and their shape is unobserved.
        positionsUnmodelled: [{}, {}],
        fetchedAt: '2026-08-03T09:36:43.724Z',
      },
      total: null,
    };
    const r = await competitorRendered();
    expect(r.text).toMatch(/2\s+open position/);
    expect(r.text).toContain('does not yet read the detail');
  });

  it('one failed read hides none of the other three', async () => {
    const explorer = world();
    explorer.trades = { kind: 'unreadable', reason: 'trades are down', cause: 'unreachable' };
    const r = await competitorRendered();
    expect(r.text).toContain('trades are down');
    // The other three still answered.
    expect(r.text).toMatch(/245\s+evaluations/);
    expect(r.text).toContain('open position');
    expect(r.text).toContain('BEARISH');
  });

  it('an empty section says what its emptiness means', async () => {
    const explorer = world();
    explorer.trades = { kind: 'none' };
    explorer.evaluations = { kind: 'none' };
    const r = await competitorRendered();
    expect(r.text).toContain('closed no trades');
    expect(r.text).toContain('no evaluations for this agent');
  });

  it('says the owner’s reasoning is withheld rather than absent', async () => {
    world();
    const r = await competitorRendered();
    expect(r.text).toContain('withheld by the platform, not missing');
  });

  it('does not invent a funnel when the platform publishes none', async () => {
    const explorer = world();
    explorer.funnel = { kind: 'none' };
    const r = await competitorRendered();
    expect(r.text).toContain('no evaluation record');
    expect(r.text).not.toContain('evaluations →');
  });

  it('shows an unmeasured rate as unmeasured', async () => {
    const explorer = world();
    explorer.funnel = {
      kind: 'value',
      value: aFunnel({ winRatePercent: null, fillRatePercent: null }),
      total: null,
    };
    const r = await competitorRendered();
    expect(r.text).toContain('not measured');
  });

  it('offers the way back to the field', async () => {
    world();
    const r = await competitorRendered();
    expect(r.text).toContain('Back to the field');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await competitorRendered();
    expect(r.text).toContain('connect');
  });
});
