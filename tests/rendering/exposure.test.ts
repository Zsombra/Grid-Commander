import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, anEntryDecision, FakeAgentsPort } from '../support/agent-fakes.js';
import { anExposure, aPosition, FakePositionsPort } from '../support/position-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * What the agent has at stake, on the page where the agent is read.
 *
 * The property: **money at risk right now is visible, and every figure on it
 * is the platform's.** Until this shipped, an agent could hold a leveraged
 * position with a stop that had moved since it opened, and no surface in the
 * product said so — `/trades` is closed trades, `/pipeline` is decisions
 * already made.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent(); // id 'a1'
const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);
const noSearch = Promise.resolve({});

async function page() {
  const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
  return rendered(await Page({ params: params({ id: AGENT.id }), searchParams: noSearch }));
}

function world(
  positions: FakePositionsPort['result'],
  funnel?: FakeAgentsPort['ownFunnel'],
  decisions?: FakeAgentsPort['entryDecisions'],
) {
  const agents = new FakeAgentsPort([AGENT]);
  if (funnel) agents.ownFunnel = funnel;
  if (decisions) agents.entryDecisions = decisions;
  const pos = new FakePositionsPort();
  pos.result = positions;
  current = actingWith({ agents, positions: pos });
  return { agents, positions: pos };
}

/** The decision that opened the live HYPE position, as a readable stage. */
const decided = (
  over: Parameters<typeof anEntryDecision>[0] = {},
): FakeAgentsPort['entryDecisions'] => ({
  kind: 'entries',
  entries: [anEntryDecision(over)],
  total: 1,
});

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

describe('a position that is open right now', () => {
  it('shows the market, the stake and the platform’s own valuation', async () => {
    world({ kind: 'exposure', exposure: anExposure() });
    const r = await page();
    expect(r.text).toContain('HYPE LONG');
    expect(r.text).toContain('5× leverage');
    expect(r.text).toContain('$12.36 at stake');
    expect(r.text).toContain('$2.47 margined');
    // The platform's figure, negative and shown as such.
    expect(r.text).toContain('Unrealized -$0.01');
  });

  it('shows the stop as the current one, not the one decided', async () => {
    /**
     * The decision behind this position recorded `stopLoss: 55.67456526`;
     * trailing moved it to 55.954. Every surface used to show the decided one,
     * understating the protection in force.
     */
    world({ kind: 'exposure', exposure: anExposure() });
    const r = await page();
    expect(r.text).toContain('Stop now 55.954');
    expect(r.text).toContain('position management moves them');
    expect(r.text).not.toContain('55.67456526');
  });

  it('says when it was priced rather than pretending to be live', async () => {
    world({ kind: 'exposure', exposure: anExposure() });
    const r = await page();
    expect(r.text).toContain('a snapshot, not a live ticker');
  });

  it('renders an unpriced position as unknown, never as flat', async () => {
    world({
      kind: 'exposure',
      exposure: anExposure({
        totals: { ...anExposure().totals, unpricedPositionCount: 1 },
        positions: [aPosition({ markPrice: null, unrealizedPnlUsd: null, roePct: null })],
      }),
    });
    const r = await page();
    expect(r.text).toContain('Unrealized result unknown');
    expect(r.text).toContain('could not price 1 of them');
    expect(r.text).not.toContain('Unrealized $0.00');
  });
});

describe('the stop that moved', () => {
  /**
   * The drift, on the surface where an operator decides whether to intervene.
   *
   * Both numbers were already in the product before this — `Stop now 55.954`
   * here, `At the decision … 55.67456526` on `/pipeline` — and no page said
   * they were the same stop. Until they are shown together, a trailing setting
   * an operator configured has never been observably done anything.
   */
  it('shows the decided stop beside the current one and says which way it moved', async () => {
    world({ kind: 'exposure', exposure: anExposure() }, undefined, decided());
    const r = await page();
    expect(r.text).toContain('Stop now 55.954');
    expect(r.text).toContain('The decision set the stop at 55.67456526');
    expect(r.text).toContain('it is now 55.954');
    // The reading, not just the pair. A LONG whose stop rose is better covered
    // than the decision asked for, and the opposite sentence would be the
    // opposite of the truth.
    expect(r.text).toContain('moved to protect more of this position');
  });

  it('reads the same move on a short as less protection', async () => {
    world(
      { kind: 'exposure', exposure: anExposure({ positions: [aPosition({ direction: 'SHORT' })] }) },
      undefined,
      decided(),
    );
    const r = await page();
    expect(r.text).toContain('moved to protect less of this position');
  });

  it('says nothing about drift when the stop is where the decision put it', async () => {
    world({ kind: 'exposure', exposure: anExposure() }, undefined, decided({ stopLoss: 55.954 }));
    const r = await page();
    expect(r.text).toContain('Stop now 55.954');
    expect(r.text).not.toContain('The decision set the stop');
    expect(r.text).not.toContain('could not be read');
  });

  it('calls the decided stop unknown when the decision could not be found', async () => {
    /**
     * A decision older than the window read is a decision this page has not
     * seen — not a stop that has stayed put. Never imply no drift.
     */
    world({ kind: 'exposure', exposure: anExposure() }, undefined, decided({ id: 'another' }));
    const r = await page();
    expect(r.text).toContain('Where the decision put this stop is unknown');
    expect(r.text).not.toContain('moved to protect');
  });

  it('renders the position in full when the decision list could not be read', async () => {
    // One of three reads failing costs the operator a sentence, never the
    // holding. This repo's oldest rule, on the surface that carries money.
    world({ kind: 'exposure', exposure: anExposure() }, undefined, {
      kind: 'unreadable',
      reason: 'BattleGrid did not answer',
      cause: 'unreachable',
    });
    const r = await page();
    expect(r.text).toContain('HYPE LONG');
    expect(r.text).toContain('Stop now 55.954');
    expect(r.text).toContain('Unrealized -$0.01');
    expect(r.text).toContain('Where the decision put this stop is unknown');
  });

  it('states a moved target without calling it protection', async () => {
    // Stop unmoved, target moved — so the only drift on the page is the
    // target's, and a stray protection claim has nowhere to hide.
    world(
      { kind: 'exposure', exposure: anExposure() },
      undefined,
      decided({ stopLoss: 55.954, takeProfit: 57.1 }),
    );
    const r = await page();
    expect(r.text).toContain('The decision set the target at 57.1');
    expect(r.text).toContain('it is now 57.34986948');
    // A target in a new place is a different exit, not more or less cover.
    expect(r.text).not.toContain('protect');
  });
});

describe('the two ways of holding nothing', () => {
  it('says it is holding nothing when the platform said so', async () => {
    world({ kind: 'none' });
    const r = await page();
    expect(r.text).toContain('holding nothing right now');
  });

  it('never renders a failed position read as holding nothing', async () => {
    world({ kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' });
    const r = await page();
    expect(r.text).toContain('could not be read');
    expect(r.text).not.toContain('holding nothing right now');
  });
});

describe('entries that never became an order', () => {
  const FUNNEL = (over: Record<string, number | null> = {}): FakeAgentsPort['ownFunnel'] => ({
    kind: 'funnel',
    funnel: {
      totalEvaluations: 71,
      totalDecisions: 71,
      enterDecisions: 60,
      skipDecisions: 11,
      skippedTerminal: 0,
      executed: 27,
      failed: 28,
      expired: 5,
      cancelled: 0,
      blocked: 0,
      pending: 0,
      fillRatePercent: 63,
      avgAggregateScorePercent: null,
      avgConvictionPercent: null,
      avgRiskRewardRatio: null,
      outcomeCount: null,
      winCount: null,
      lossCount: null,
      winRatePercent: null,
      avgNetPnl: null,
      totalNetPnl: null,
      avgDurationSeconds: null,
      topCoins: [],
      ...over,
    },
  });

  it('states the count against the total, not as a statistic', async () => {
    world({ kind: 'none' }, FUNNEL());
    const r = await page();
    expect(r.text).toContain('28 of 60 entries never became an order');
    expect(r.text).toContain('More of what this agent decided failed than succeeded');
  });

  it('attributes the platform’s fill rate to the platform', async () => {
    // 63% against counts that give 27 of 60. Different computations, and this
    // product does not claim to know how theirs works.
    world({ kind: 'none' }, FUNNEL());
    const r = await page();
    expect(r.text).toContain("BattleGrid's own fill rate for this agent is 63%");
  });

  it('asserts no reason for an individual failure', async () => {
    world({ kind: 'none' }, FUNNEL());
    const r = await page();
    expect(r.text).toContain('does not say why an individual entry failed');
  });

  it('says nothing when every entry became an order', async () => {
    world({ kind: 'none' }, FUNNEL({ failed: 0, executed: 60 }));
    const r = await page();
    expect(r.text).not.toContain('never became an order');
  });
});
