import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, aTradeOutcome, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The trading record, branch by branch. The branch that carries the
 * change's point: an agent with no trades says so instead of showing a
 * summary of zeros, and a page that does show totals says they are
 * derived rather than published.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent();
const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function tradesRendered(search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/agents/[id]/trades/page.js')).default;
  return rendered(await Page({ params: params({ id: AGENT.id }), searchParams: Promise.resolve(search) }));
}

function world(over: Parameters<typeof actingWith>[0] = {}) {
  const agents = new FakeAgentsPort([AGENT]);
  current = actingWith({ agents, ...over });
  return agents;
}

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

describe('the trading record, branch by branch', () => {
  it('shows each trade whole and says the totals are derived', async () => {
    const agents = world();
    agents.tradeOutcomes = {
      kind: 'outcomes',
      outcomes: [
        aTradeOutcome({ id: '1' }),
        aTradeOutcome({ id: '2', coinTicker: 'PUMP', direction: 'SHORT', netPnl: 0.4, closeReason: 'TAKE_PROFIT' }),
      ],
      total: 2,
    };
    const r = await tradesRendered();
    expect(r.headings[0]).toBe('What this agent did with the money');
    expect(r.text).toContain('MOODENG');
    expect(r.text).toContain('PUMP');
    expect(r.text).toContain('Fees');
    expect(r.text).toContain('slippage');
    expect(r.text).toContain('conviction');
    expect(r.text).toContain('STOP_LOSS');
    // The honesty line.
    expect(r.text).toContain('computed from the trades listed below');
    expect(r.text).toContain('not published');
  });

  it('an agent that never traded is told so, with no summary of zeros', async () => {
    const agents = world();
    agents.tradeOutcomes = { kind: 'none' };
    const r = await tradesRendered();
    expect(r.headings[0]).toBe('No closed trades yet');
    expect(r.text).toContain('has not closed a trade');
    expect(r.text).not.toContain('computed from the trades');
  });

  it('an unreadable record says so rather than showing an empty one', async () => {
    const agents = world();
    agents.tradeOutcomes = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    const r = await tradesRendered();
    expect(r.headings[0]).toBe('The trading record could not be read');
    expect(r.text).toContain('BattleGrid timed out');
  });

  it('more trades than the page offers a way to the rest', async () => {
    const agents = world();
    agents.tradeOutcomes = { kind: 'outcomes', outcomes: [aTradeOutcome()], total: 9 };
    const r = await tradesRendered();
    expect(r.text).toContain('9 closed trade(s) in total');
    expect(r.text).toContain('Next page');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await tradesRendered();
    expect(r.text).toContain('connect');
  });
});
