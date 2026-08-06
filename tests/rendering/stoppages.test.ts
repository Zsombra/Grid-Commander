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
const noSearch = Promise.resolve({});

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
  return rendered(await Page({ params: params({ id: AGENT.id }), searchParams: noSearch }));
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
    });
    const r = await page();
    expect(r.text).toContain('Mostly one thing: AGENT_APPROVAL_EXPIRED, 5 times');
    expect(r.text).toContain('standing condition');
  });

  it('does not call a single occurrence a condition', async () => {
    world({ kind: 'entries', entries: [block()], total: 1 });
    const r = await page();
    expect(r.text).toContain('INSUFFICIENT_EQUITY · 1 time');
    expect(r.text).not.toContain('standing condition');
  });
});

describe('the platform’s own words and numbers', () => {
  it('renders the detail as a comparison, not as field names', async () => {
    world({ kind: 'entries', entries: [block(), block()], total: 2 });
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
    world({ kind: 'entries', entries: [block(), block()], total: 118 });
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
