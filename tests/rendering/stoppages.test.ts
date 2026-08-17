import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GateBlock } from '@/ports/agents.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * What keeps stopping this agent, on the page where the agent is read.
 *
 * The property under test is the one the whole change exists for: **a reason
 * that repeated is reported as a condition, not as a row.** `/pipeline` shows
 * the ten most recent blocks, so on the operator's real account the
 * ninety-eighth `AGENT_APPROVAL_EXPIRED` looks exactly like the first.
 *
 * Second property, equally load-bearing: nothing here paraphrases a reason
 * code. The platform's word is what renders, and the figures beside it are the
 * platform's too.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent();
const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

function block(over: Partial<GateBlock> = {}): GateBlock {
  return {
    id: Math.random().toString(36).slice(2),
    coinTicker: null,
    gateStage: 'ACCOUNT',
    reasonCode: 'INSUFFICIENT_EQUITY',
    reasonDetail: { equityUsd: 4.199037, thresholdUsd: 10 },
    at: '2026-08-06T15:56:41.197Z',
    ...over,
  };
}

async function page() {
  const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
  return rendered(await Page({ params: params({ id: AGENT.id }) }));
}

function world(blocks: FakeAgentsPort['gateBlocks']) {
  const agents = new FakeAgentsPort([AGENT]);
  agents.gateBlocks = blocks;
  current = actingWith({ agents });
  return agents;
}

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

describe('a reason that keeps repeating', () => {
  it('leads with the dominant one and calls it standing', async () => {
    // CONTRARIAN's real shape, scaled down: many approval blocks over a week,
    // two equity blocks today.
    world({
      kind: 'entries',
      entries: [
        block({ at: '2026-08-06T15:56:41.197Z' }),
        block({ at: '2026-08-06T15:35:40.870Z' }),
        ...Array.from({ length: 5 }, (_, i) =>
          block({
            reasonCode: 'AGENT_APPROVAL_EXPIRED',
            reasonDetail: {},
            at: `2026-08-0${i + 1}T10:00:00.000Z`,
          }),
        ),
      ],
      total: 118,
      refused: null,
    });
    const r = await page();
    expect(r.text).toContain('Mostly one thing: AGENT_APPROVAL_EXPIRED, 5 times');
    expect(r.text).toContain('standing condition');
  });

  it('does not call a single occurrence a condition', async () => {
    world({ kind: 'entries', entries: [block()], total: 1, refused: null });
    const r = await page();
    expect(r.text).toContain('INSUFFICIENT_EQUITY · 1 time');
    expect(r.text).not.toContain('standing condition');
  });
});

describe('the platform’s own words and numbers', () => {
  it('renders the detail as a comparison, not as field names', async () => {
    world({ kind: 'entries', entries: [block(), block()], total: 2, refused: null });
    const r = await page();
    // Dollars, because the field is named `…Usd`. The old pipeline rendering
    // showed `equityUsd: 4.199037 · thresholdUsd: 10`.
    expect(r.text).toContain('$4.20 against $10.00');
    expect(r.text).toContain('what clears this');
  });

  it('shows a reason the platform explained with nothing', async () => {
    /**
     * `AGENT_APPROVAL_EXPIRED` carries `{}` on every occurrence and is the
     * most frequent block on the operator's account. A surface that rendered
     * only reasons with numbers would hide the single biggest finding.
     */
    world({
      kind: 'entries',
      entries: [block({ reasonCode: 'AGENT_APPROVAL_EXPIRED', reasonDetail: {} })],
      total: 1,
      refused: null,
    });
    const r = await page();
    expect(r.text).toContain('AGENT_APPROVAL_EXPIRED');
    expect(r.text).toContain('BattleGrid gave no detail for this one');
  });

  it('renders a code it has never seen, with whatever came attached', async () => {
    // The platform declares nineteen codes and has replaced itself four times.
    world({
      kind: 'entries',
      entries: [
        block({ reasonCode: 'SOMETHING_NEW_IN_V10', reasonDetail: { availableUsd: 3, requiredUsd: 25 } }),
      ],
      total: 1,
      refused: null,
    });
    const r = await page();
    expect(r.text).toContain('SOMETHING_NEW_IN_V10');
    // The pair is recognised by field name, so a brand-new code still renders
    // its arithmetic without anyone teaching the product what it means.
    expect(r.text).toContain('$3.00 against $25.00');
  });

  it('shows the figure that would clear an unreachable notional', async () => {
    world({
      kind: 'entries',
      entries: [
        block({
          gateStage: 'TOKEN',
          coinTicker: 'BTC',
          reasonCode: 'EXCHANGE_MIN_NOTIONAL_UNREACHABLE',
          reasonDetail: { equityUsd: 89.490186, minEquityUsd: 1000, smallPct: 1, maxLeverage: 1 },
        }),
      ],
      total: 1,
      refused: null,
    });
    const r = await page();
    // The backlog item assumed this had to be derived from scraped rejection
    // text. The platform sends it.
    expect(r.text).toContain('$89.49 against $1000.00');
    // And the fields outside the pair are carried rather than dropped.
    expect(r.text).toContain('smallPct: 1');
    expect(r.text).toContain('On BTC');
  });
});

describe('the window, and the two ways of having nothing', () => {
  it('admits summarising less than the whole history', async () => {
    world({ kind: 'entries', entries: [block(), block()], total: 118, refused: null });
    const r = await page();
    expect(r.text).toContain('Summarised the 2 most recent of 118');
  });

  it('says nothing has stopped it when nothing has', async () => {
    world({ kind: 'none' });
    const r = await page();
    expect(r.text).toContain('Nothing has stopped this agent');
  });

  it('never dresses a failed read up as an untroubled agent', async () => {
    world({ kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' });
    const r = await page();
    expect(r.text).toContain('could not be read');
    expect(r.text).not.toContain('Nothing has stopped this agent');
  });
});

/**
 * A summary assembled around a hole.
 *
 * The third way of having nothing, and the most dangerous: an outage is
 * visibly nothing, but a partial summary looks like everything. On
 * 2026-08-13 the platform was refusing the newest rows of every active
 * agent's history while serving the older ones, so the counts a summary can
 * still produce are counts over the past — on a surface that answers *what is
 * stopping this agent now*.
 */
describe('a summary the platform would not serve whole', () => {
  const PARTIAL = {
    kind: 'entries' as const,
    entries: [
      block({ reasonCode: 'OPEN_POSITION_CONFLICT', reasonDetail: {}, at: '2026-08-12T04:15:00.000Z' }),
      block({ reasonCode: 'OPEN_POSITION_CONFLICT', reasonDetail: {}, at: '2026-08-12T22:40:00.000Z' }),
      block({ reasonCode: 'OPEN_POSITION_CONFLICT', reasonDetail: {}, at: '2026-08-11T09:05:00.000Z' }),
    ],
    total: 297,
    refused: { windows: 2, rows: 50 },
  };

  it('says part of the history could not be read', async () => {
    world(PARTIAL);
    const r = await page();
    expect(r.text).toContain('would not serve 2 windows');
    // The size of the hole, worded as the bound it is.
    expect(r.text).toContain('up to 50 blocks');
    // And which end of the history it is missing, because that is the end
    // this surface is about.
    expect(r.text).toContain('most recent');
  });

  it('says when the window it summarised ends', async () => {
    world(PARTIAL);
    const r = await page();
    // To the minute, not the day: a window that stopped at 04:15 and one that
    // stopped at 22:40 are the same date and a different answer. Taken by
    // comparison across the rows, so the deliberately out-of-order fixture
    // above still yields the newest.
    expect(r.text).toContain('What is counted ends 2026-08-12 22:40');
  });

  it('presents the count as a count over what could be read', async () => {
    world(PARTIAL);
    const r = await page();
    expect(r.text).toContain('in the part of the history that could be read');
    // The lead sentence too — it is the one an operator reads first.
    expect(r.text).toContain('in what could be read');
  });

  it('does not call the summarised rows the most recent ones', async () => {
    world(PARTIAL);
    const r = await page();
    expect(r.text).toContain('Summarised 3 of 297');
    // The exact inversion this path would otherwise produce: on a partial
    // read the rows that are missing are the recent ones.
    expect(r.text).not.toContain('most recent of 297');
  });

  it('claims nothing about unreadable rows when the history was served whole', async () => {
    world({ kind: 'entries', entries: [block(), block()], total: 118, refused: null });
    const r = await page();
    // No empty clause on the healthy path. A surface that always mentions
    // refusals teaches an operator to stop reading the sentence.
    expect(r.text).not.toContain('would not serve');
    expect(r.text).not.toContain('could be read');
    expect(r.text).not.toContain('What is counted ends');
    expect(r.text).toContain('Summarised the 2 most recent of 118');
  });
});
