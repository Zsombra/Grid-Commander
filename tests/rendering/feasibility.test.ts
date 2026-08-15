import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdvisoryCoin, FeasibilityAdvisory } from '@/domain/agent/feasibility.js';
import { FakeAgentsPort, anAgent } from '../support/agent-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The panel that turns BattleGrid's bands into the sentence an operator reads.
 *
 * Every assertion below goes through `asRead`, because `rendered` joins text
 * nodes with a space and every sentence here is built around interpolated
 * figures. The component writes each one as a single template literal for
 * exactly this reason — see its header — and these tests are what would catch
 * anyone breaking them back into JSX fragments.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const asRead = (text: string): string => text.replace(/\s+/g, ' ');

async function agentPage(id: string) {
  const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
  return rendered(await Page({ params: Promise.resolve({ id }) }));
}

function coin(
  ticker: string,
  status: 'feasible' | 'structural-only' = 'feasible',
  over: Partial<AdvisoryCoin> = {},
): AdvisoryCoin {
  return {
    kind: 'priced',
    ticker,
    status,
    atrPct: 1.4,
    reachableMinPct: 0.8,
    reachableMaxPct: 2.5,
    requestedMinAtrMultiple: 0.55,
    requestedMinPct: 0.8,
    requestedMaxPct: 2.5,
    blockedBy: status === 'structural-only' ? 'ceiling' : null,
    shortfallPct: status === 'structural-only' ? 0.3 : null,
    ...over,
  } as AdvisoryCoin;
}

function advisory(coins: readonly AdvisoryCoin[], counts?: Partial<FeasibilityAdvisory['counts']>): FeasibilityAdvisory {
  const unpriced = coins.filter((c) => c.kind === 'unpriced').length;
  return {
    dials: { minStopLossAtrMultiple: 0.55, maxStopLossPct: 2.5, minRiskRewardRatio: 1.5 },
    counts: {
      total: coins.length,
      evaluated: coins.length - unpriced,
      buildable: coins.filter((c) => c.kind === 'priced' && c.status === 'feasible').length,
      volatilityUnavailable: unpriced,
      ...counts,
    },
    coins,
  };
}

/** The page, with a reply already carried for the agent being viewed. */
function withReply(advisoryValue: FeasibilityAdvisory, over: { agentId?: string; coinsCarried?: boolean } = {}) {
  const agents = new FakeAgentsPort([anAgent({ id: 'a1', displayName: 'Salamis' })]);
  const acting = actingWith({ agents });
  const app = acting.app as {
    feasibilityReply: {
      plant(r: {
        agentId: string;
        issuedAt: Date;
        advisory: FeasibilityAdvisory;
        coinsCarried: boolean;
      }): void;
    };
  };
  app.feasibilityReply.plant({
    agentId: over.agentId ?? 'a1',
    issuedAt: acting.clock.now(),
    advisory: advisoryValue,
    coinsCarried: over.coinsCarried ?? true,
  });
  current = acting;
  return acting;
}

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([anAgent({ id: 'a1' })]) });
});

describe('the panel is absent unless an edit just answered', () => {
  it('renders nothing on an ordinary visit', () => {
    /**
     * The default state of this page, and the one every other test in this
     * repository renders. The platform answers feasibility on a write and never
     * on a read, so a page that showed a remembered answer would be stating
     * something about live volatility from an unknown moment.
     */
    return agentPage('a1').then((page) => {
      expect(page.text).not.toContain('can construct a stop');
      expect(page.headings).not.toContain('What it can build a trade on');
    });
  });

  it('renders nothing when the reply is about a different agent', async () => {
    withReply(advisory([coin('SOL')]), { agentId: 'a2' });
    const page = await agentPage('a1');
    expect(page.text).not.toContain('can construct a stop');
  });

  it('renders nothing when an advisory covers no coins at all', async () => {
    // Arithmetically "0 of 0 coins can construct", which is true and tells an
    // operator only that a panel fired.
    withReply(advisory([]));
    const page = await agentPage('a1');
    expect(page.text).not.toContain('can construct a stop');
  });
});

describe('opportunity language', () => {
  it('states the platform’s own count against the whole it was counted over', async () => {
    withReply(
      advisory(
        [coin('SOL'), coin('BTC'), coin('ETH')],
        { total: 12, evaluated: 11, buildable: 9 },
      ),
    );
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'At today’s volatility, 9 of 12 coins armed on this agent can construct a stop',
    );
    expect(asRead(page.text)).toContain('BattleGrid evaluated 11 of them.');
  });

  it('names the dial that stopped each blocked coin', async () => {
    withReply(
      advisory([
        coin('SOL'),
        coin('BTC', 'structural-only', { blockedBy: 'ceiling' }),
        coin('DOGE', 'structural-only', { blockedBy: 'floor' }),
      ]),
    );
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      '2 coins cannot: BTC by the stop-loss ceiling; DOGE by the stop-loss floor.',
    );
  });

  it('does not attribute a coin the platform left unattributed', async () => {
    withReply(advisory([coin('SOL'), coin('BTC', 'structural-only', { blockedBy: null })]));
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'BTC for a reason BattleGrid did not attribute to either dial',
    );
  });

  it('reports an unpriced coin as a gap in the reading, never as blocked', async () => {
    /**
     * The substitution this panel must never make (D-3). "PEPE cannot
     * construct" would tell an operator their dials are costing them a coin
     * that no dial touched.
     */
    withReply(advisory([coin('SOL'), { kind: 'unpriced', ticker: 'PEPE' }]));
    const page = await agentPage('a1');
    const text = asRead(page.text);
    expect(text).toContain('BattleGrid could not read the volatility of PEPE');
    expect(text).toContain('that is a gap in the reading, not a verdict on the coin');
    expect(text).not.toContain('PEPE by the stop-loss');
    expect(text).not.toContain('1 coin cannot');
  });

  it('says so when the coins listed do not reconcile with the counts stated', async () => {
    /**
     * Otherwise the panel prints two individually-correct figures that cannot
     * both be true: "9 of 12 can construct" over "1 coin cannot".
     */
    withReply(
      advisory([coin('SOL'), coin('BTC', 'structural-only')], {
        total: 12,
        evaluated: 12,
        buildable: 9,
      }),
    );
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'The coins BattleGrid listed do not reconcile with the counts it stated',
    );
    expect(asRead(page.text)).toContain(
      'Both are shown as returned; this product has not chosen between them.',
    );
  });
});

describe('the ceiling, and which way it costs', () => {
  it('draws the curve at ceilings read off the returned bands', async () => {
    withReply(
      advisory([
        coin('SOL', 'feasible', { reachableMinPct: 0.8 }),
        coin('BTC', 'feasible', { reachableMinPct: 1.2 }),
        coin('ETH', 'feasible', { reachableMinPct: 2.0 }),
      ]),
    );
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'Move the ceiling down and that number follows it: at 2.00% it would be 3, and at 1.20% it would be 2, and at 0.80% it would be 1.',
    );
  });

  it('marks the curve as this product’s arithmetic, not BattleGrid’s count', async () => {
    // The panel's one derived figure. Blurring it with the platform's counts is
    // the failure `RiskReadingPanel` states the same rule about.
    withReply(advisory([coin('SOL', 'feasible', { reachableMinPct: 0.8 })]));
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'this product’s arithmetic over the bands BattleGrid returned, not counts BattleGrid stated',
    );
  });

  it('states that the ceiling costs opportunity downward and risk upward', async () => {
    withReply(advisory([coin('SOL')]));
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain(
      'Max Stop Loss limits opportunity when it is turned down, not up. Raising the ceiling above 2.50% blocks nothing',
    );
    expect(asRead(page.text)).toContain('what it costs is risk, not access');
  });

  it('draws no curve when no lower ceiling would change the answer', async () => {
    withReply(advisory([coin('SOL', 'feasible', { reachableMinPct: 3.0 })]));
    const page = await agentPage('a1');
    expect(page.text).not.toContain('Move the ceiling down');
  });

  it('draws no curve when the derivation cannot reproduce the platform’s own count', async () => {
    /**
     * A curve extrapolated from a coin list that disagrees with the headline
     * would start at a number the sentence above it denies. Where this
     * product's arithmetic cannot reproduce BattleGrid's `buildable` at
     * BattleGrid's current ceiling, it draws nothing.
     */
    withReply(
      advisory(
        [
          coin('SOL', 'feasible', { reachableMinPct: 0.8 }),
          coin('BTC', 'feasible', { reachableMinPct: 1.2 }),
        ],
        { total: 12, evaluated: 12, buildable: 9 },
      ),
    );
    const page = await agentPage('a1');
    expect(page.text).not.toContain('Move the ceiling down');
    // The platform's own headline still stands — only the derivation is withheld.
    expect(asRead(page.text)).toContain('9 of 12 coins armed on this agent can construct a stop');
  });
});

describe('what it says when it could not carry everything', () => {
  it('says the per-coin detail was dropped rather than rendering a shorter fleet', async () => {
    withReply(advisory([], { total: 40, evaluated: 38, buildable: 22 }), { coinsCarried: false });
    const page = await agentPage('a1');
    const text = asRead(page.text);
    // The platform's counts are complete and still stated.
    expect(text).toContain('22 of 40 coins armed on this agent can construct a stop');
    expect(text).toContain('too large to carry to this page');
    expect(text).toContain('are not shown, rather than shown short');
    // And no curve is drawn over bands that did not arrive.
    expect(text).not.toContain('Move the ceiling down');
  });
});

describe('the figure says where it came from', () => {
  it('states that it came back with the edit and reads live volatility', async () => {
    /**
     * Without this the panel reads as a standing property of the agent. It is a
     * reading of one moment, and the page does not re-read it.
     */
    withReply(advisory([coin('SOL')]));
    const page = await agentPage('a1');
    expect(asRead(page.text)).toContain('BattleGrid returned this with the edit you just applied');
    expect(asRead(page.text)).toContain('editing again is what asks anew');
  });
});
