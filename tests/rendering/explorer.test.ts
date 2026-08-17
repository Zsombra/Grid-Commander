import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { aField, aFieldAgent, fieldStats, FakeExplorerPort } from '../support/explorer-fakes.js';

/**
 * The field page, branch by branch. The three properties that matter are
 * the three ways the platform's own shape could mislead: a partial list
 * read as the field, an unmeasured rate read as zero, and a rank read
 * without its sample.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const noParams = Promise.resolve({} as Record<string, string | undefined>);

async function explorerRendered(params: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/explorer/page.js')).default;
  return rendered(await Page({ searchParams: Object.keys(params).length ? Promise.resolve(params) : noParams }));
}

function world() {
  const explorer = new FakeExplorerPort();
  current = actingWith({ explorer });
  return explorer;
}

beforeEach(() => {
  current = actingWith({ explorer: new FakeExplorerPort() });
});

describe('the field page, branch by branch', () => {
  it('says where this account stands before showing the field', async () => {
    world();
    const r = await explorerRendered();
    // The render harness joins text nodes with a space, so assertions split
    // where the JSX children do rather than pretending it is one string.
    expect(r.text).toMatch(/Rank\s+7\s+by profit/);
    expect(r.text).toContain('97% of players');
  });

  it('names this account’s own agents and their ranks', async () => {
    const explorer = world();
    explorer.field = {
      kind: 'field',
      field: aField({
        ownAgents: [
          { agentId: 'a-1', agentName: 'Fade Master II', rank: 14, totalNetPnl: -4.47 },
        ],
      }),
    };
    const r = await explorerRendered();
    expect(r.text).toContain('Fade Master II');
    expect(r.text).toContain('14');
  });

  it('says so when none of this account’s agents are ranked', async () => {
    const explorer = world();
    explorer.field = { kind: 'field', field: aField({ ownAgents: [] }) };
    const r = await explorerRendered();
    expect(r.text).toContain('None of this account');
  });

  it('shows the field’s own totals, losses included', async () => {
    world();
    const r = await explorerRendered();
    expect(r.text).toContain('37');
    expect(r.text).toContain('31%');
    // The field loses money, and a minus sign is how that reads.
    expect(r.text).toContain('−$162.07');
  });

  it('says a partial list is partial', async () => {
    const explorer = world();
    // Five rows against 37 agents — the live ALL_TIME/NET_PNL behaviour.
    explorer.field = {
      kind: 'field',
      field: aField({
        agents: [aFieldAgent(), aFieldAgent({ agentId: 'a-2', agentName: 'Cholado', rank: 2 })],
      }),
    };
    const r = await explorerRendered();
    expect(r.text).toContain('2 agents shown');
    expect(r.text).toMatch(/counts\s+37\s+agents in this window but returned\s+2/);
    expect(r.text).toContain('not the whole field');
  });

  it('drops the caveat when the list is the field', async () => {
    const explorer = world();
    explorer.field = {
      kind: 'field',
      field: aField({ agents: [aFieldAgent()], stats: fieldStats({ totalAgents: 1 }) }),
    };
    const r = await explorerRendered();
    expect(r.text).not.toContain('not the whole field');
  });

  it('prints every rate beside the trades it came from', async () => {
    const explorer = world();
    explorer.field = {
      kind: 'field',
      field: aField({
        agents: [aFieldAgent({ agentName: 'TRADFI KING', winRatePercent: 100, tradeCount: 1 })],
      }),
    };
    const r = await explorerRendered();
    expect(r.text).toContain('100%');
    // The sample, without which the rate is not a claim about skill.
    expect(r.text).toMatch(/1\s+trade/);
  });

  it('warns about small samples when sorted by win rate', async () => {
    world();
    const r = await explorerRendered({ sort: 'WIN_RATE' });
    expect(r.text).toContain('smallest sample');
  });

  it('shows an unmeasured win rate as unmeasured, never zero', async () => {
    const explorer = world();
    explorer.field = {
      kind: 'field',
      field: aField({
        vendors: [
          { provider: 'xAI', agentCount: 2, tradeCount: 0, winRatePercent: null, totalNetPnl: 0, avgNetPnl: null },
        ],
      }),
    };
    const r = await explorerRendered();
    expect(r.text).toContain('not measured');
    expect(r.text).not.toMatch(/win rate\s+0%/);
  });

  it('is unreadable, not empty, when the field fails', async () => {
    const explorer = world();
    explorer.field = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    const r = await explorerRendered();
    expect(r.text).toContain('could not be read');
    expect(r.text).toContain('BattleGrid timed out');
  });

  it('an unreadable leaderboard hides neither the field nor its reason', async () => {
    const explorer = world();
    explorer.leaderboard = { kind: 'unreadable', reason: 'leaderboard is down', cause: 'unreachable' };
    const r = await explorerRendered();
    expect(r.text).toContain('leaderboard is down');
    // The field still answered.
    expect(r.text).toContain('Market Predator');
  });

  it('ignores a window or sort the platform does not offer', async () => {
    world();
    const r = await explorerRendered({ window: 'FORTNIGHTLY', sort: 'VIBES' });
    // Falls back rather than forwarding an unrecognised enum.
    expect(r.text).toContain('net P&L');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await explorerRendered();
    expect(r.text).toContain('connect');
  });
});

/**
 * The rows the standing is a standing *among*.
 *
 * `ExplorerPort` has modelled `Leaderboard.entries` since the page was
 * written and no surface read them, because they were empty: the 2026-08-06
 * probe recorded `"leaderboard": []` with `"currentUser": null`. Ten arrive
 * per metric now. Rendered rather than grepped, because what is at stake is
 * what a person reads.
 */
describe('the ranked players', () => {
  it('shows each returned player with rank, name and value', async () => {
    world();
    const r = await explorerRendered();
    expect(r.text).toContain('PrawnCocktail');
    expect(r.text).toContain('$371.70');
  });

  it('marks the row that is this account, and no other', async () => {
    // The pointed case: this account is rank 7 by profit, which is inside its
    // own top ten, so the standing sentence and one row are the same fact.
    world();
    const r = await explorerRendered();
    // The marker, not the phrase. The page's own intro reads "where this
    // account sits among them", so a bare `toContain('this account')` passes
    // on a page that marks nothing — the same trap the binding tests hit with
    // `not.toContain('bound to')`.
    expect(r.text).toContain('— this account');
    expect(r.text.match(/— this account/g)?.length).toBe(1);
  });

  it('marks nothing when the account is ranked outside the rows returned', async () => {
    const explorer = world();
    const lb = explorer.leaderboard;
    if (lb.kind !== 'leaderboard') throw new Error('fixture');
    explorer.leaderboard = {
      kind: 'leaderboard',
      leaderboard: {
        ...lb.leaderboard,
        entries: lb.leaderboard.entries.filter((e) => e.userId !== lb.leaderboard.own?.userId),
      },
    };
    const r = await explorerRendered();
    expect(r.text).toContain('PrawnCocktail');
    expect(r.text).not.toContain('— this account');
    // The standing itself is unaffected — it comes off `currentUser`, not off
    // the rows, and a rank outside a top ten is still a rank.
    expect(r.text).toMatch(/Rank\s+7\s+by profit/);
  });

  it('shows an unidentified row and marks it as nobody’s', async () => {
    /**
     * `userId` is nullable on purpose. A row the platform declined to
     * identify is still a ranked player with a name and a value; dropping it
     * would lose a real row to protect a marking. And `null === null` is
     * true, so an unidentified row must not match an unidentified standing.
     */
    const explorer = world();
    explorer.leaderboard = {
      kind: 'leaderboard',
      leaderboard: {
        metric: 'PROFIT',
        entries: [{ rank: 3, displayName: 'Anonymous', value: 12.5, userId: null }],
        own: { rank: 3, value: 12.5, percentile: 50, userId: null },
        generatedAt: null,
      },
    };
    const r = await explorerRendered();
    expect(r.text).toContain('Anonymous');
    expect(r.text).not.toContain('— this account');
  });

  it('says the platform ranks nobody, rather than reading as a failed read', async () => {
    const explorer = world();
    explorer.leaderboard = {
      kind: 'leaderboard',
      leaderboard: { metric: 'PROFIT', entries: [], own: null, generatedAt: null },
    };
    const r = await explorerRendered();
    expect(r.text).toContain('ranks no players');
    expect(r.text).not.toContain('could not be read');
  });

  it('claims no players at all when the leaderboard did not answer', async () => {
    // Unread and unranked must not read alike — the same rule the standing
    // sentence above already follows.
    const explorer = world();
    explorer.leaderboard = { kind: 'unreadable', reason: 'leaderboard is down', cause: 'unreachable' };
    const r = await explorerRendered();
    expect(r.text).toContain('leaderboard is down');
    expect(r.text).not.toContain('PrawnCocktail');
    expect(r.text).not.toContain('ranks no players');
  });
});
